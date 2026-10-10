"""Compile reviewed catalogue bars into graph JSON; never invent missing songs."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from build_song_graphs import build, ROOT, root_of, pitch

def panels(tokens):
    chunks=[]
    def fit(bars):
        roots={}
        for bar in bars:
            for item in bar.split(','):
                chord=item.split('@')[0]
                if chord=='NC':continue
                roots.setdefault(pitch(root_of(chord)),set()).add(chord)
        if any(len(chords)>3 for chords in roots.values()) and len(bars)>1:
            mid=len(bars)//2;fit(bars[:mid]);fit(bars[mid:])
        else:chunks.append(bars)
    for i in range(0,len(tokens),8):fit(tokens[i:i+8])
    return chunks

class PageText(HTMLParser):
    def __init__(self):super().__init__();self.parts=[]
    def handle_data(self,data):
        if data.strip():self.parts.append(data.strip())

def metadata(slug,entry):
    page=PageText();page.feed((ROOT/f'charts/{slug}.html').read_text())
    values=page.parts
    def value(label,default=''):
        return values[values.index(label)+1] if label in values else default
    key=value('Common Key','C')
    return dict(id=slug,title=entry['title'],key=key.replace('b','♭').replace('#','♯').replace('-',' minor'),beatsPerBar=int(value('Time','4/4').split('/')[0]),pageBars=int(value('Length','0 bars').split()[0]))

def sources():
    manifest=json.loads((ROOT/'charts/manifest.json').read_text())['songs']
    result=[]
    for line in (ROOT/'scripts/data/catalogue.txt').read_text().splitlines():
        if not line or line.startswith('#'):continue
        fields=line.split('|');slug=fields[0];data=metadata(slug,manifest[slug]);sections=[];named={}
        for field in fields[1:]:
            if field.startswith('@'):
                name=field[1:];bars=named[name];name+=' · repeat'
            else:
                name,bars=field.split(':',1);named[name]=bars
            tokens=bars.split();expanded=[]
            for token in tokens:
                expanded.append(expanded[-1] if token=='%' else token)
            chunks=panels(expanded)
            for i,chunk in enumerate(chunks):
                sections.append([name+(f' · part {i+1}' if len(chunks)>1 else ''),' '.join(chunk)])
        data['sections']=sections;data['bars']=sum(len(s[1].split()) for s in sections)
        if data['pageBars'] and data['bars']!=data['pageBars']:
            data['sourceNote']=f"The source image is transcribed as {data['bars']} bars; the page lists {data['pageBars']}. Playback follows the image and its repeat markings."
        result.append(data)
    return result

if __name__=='__main__':
    for source in sources():
        song=build(source)
        (ROOT/f"src/data/{source['id']}.json").write_text(json.dumps(song,ensure_ascii=False,indent=2)+'\n')
        print(f"{source['title']}: {source['bars']} bars")
    manifest=json.loads((ROOT/'charts/manifest.json').read_text())['songs']
    available=[slug for slug in manifest if (ROOT/f'src/data/{slug}.json').exists()]
    imports='\n'.join(f"import song{i} from './{slug}.json' with {{ type: 'json' }};" for i,slug in enumerate(available))
    (ROOT/'src/data/songs.js').write_text(imports+'\n\nexport const songs = ['+', '.join(f'song{i}' for i in range(len(available)))+'];\nexport const songsById = Object.fromEntries(songs.map(song => [song.id, song]));\n')
    print(f'{len(available)} songs registered')
