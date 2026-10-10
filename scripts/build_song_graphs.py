"""Build repeatable measured graph JSON from reviewed bar-by-bar transcriptions.
Run: python3 scripts/build_song_graphs.py
The input is manually checked against downloaded charts, not OCR output.
"""
import json
import math
import heapq
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PITCH = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
PALETTE = ['#cc480e', '#267b99', '#8b4695', '#29805d']

def root_of(chord):
    return re.match(r'^[A-G][b#]?', chord).group()

def pitch(root):
    return (PITCH[root[0]] + (1 if root.endswith('#') else -1 if root.endswith('b') else 0)) % 12

def label(chord):
    return chord.replace('mMaj7', 'mΔ7').replace('maj7', '').replace('m7b5', 'ø7').replace('dim7', '°7').replace('m7', 'm').replace('b', '♭').replace('#', '♯')

def duration_label(duration, meter):
    if duration==.25:return 'quarter-bar'
    if duration==.75:return '¾ bar'
    if duration==.5:return 'half-bar'
    if math.isclose(duration,1/3):return '⅓ bar'
    if duration==1:return '1 bar'
    if duration<1:return f'{duration*meter:g} beats'
    return f'×{duration:g}'

def path_for(a, b, nodes, section):
    def clip(source, target):
        dx, dy = target[0] - source['x'], target[1] - source['y']
        length = math.hypot(dx, dy)
        return (source['x'] + dx / length * 55, source['y'] + dy / length * 55)
    def clear(points):
        for p, q in zip(points, points[1:]):
            dx, dy = q[0]-p[0], q[1]-p[1]
            length = dx*dx + dy*dy
            for node in nodes:
                if node['id'] in [a['id'], b['id']]:
                    continue
                t = max(0, min(1, ((node['x']-p[0])*dx + (node['y']-p[1])*dy) / length)) if length else 0
                if math.hypot(p[0]+dx*t-node['x'], p[1]+dy*t-node['y']) < 61:
                    return False
        return True
    direct = [clip(a, (b['x'],b['y'])), clip(b, (a['x'],a['y']))]
    if clear(direct):
        return None  # Shared renderer handles normal direct routes.
    candidates = []
    for y in [row + offset for row in section['rows'] for offset in [-130,130]]:
        mids = [(a['x'],y), (b['x'],y)]
        candidates.append([clip(a,mids[0]), *mids, clip(b,mids[-1])])
    for x in [section['left']-70, section['right']+70, *section['boundaries']]:
        mids = [(x,a['y']), (x,b['y'])]
        if mids[0] == (a['x'],a['y']) or mids[-1] == (b['x'],b['y']):
            continue
        candidates.append([clip(a,mids[0]), *mids, clip(b,mids[-1])])
    valid = [points for points in candidates if clear(points)]
    if not valid:
        # Visibility grid supplies a repeatable detour around crowded roots.
        starts=[(a['x']+dx,a['y']+dy) for dx,dy in [(55,0),(-55,0),(0,55),(0,-55)]]
        ends=[(b['x']+dx,b['y']+dy) for dx,dy in [(55,0),(-55,0),(0,55),(0,-55)]]
        xs=sorted(set([p[0] for p in starts+ends]+[n['x']+d for n in nodes for d in [-80,80]]))
        ys=sorted(set([p[1] for p in starts+ends]+[n['y']+d for n in nodes for d in [-110,110]]))
        distances={p:0 for p in starts}; parents={}; queue=[(0,p) for p in starts]
        heapq.heapify(queue)
        while queue:
            cost,point=heapq.heappop(queue)
            if cost != distances[point]:continue
            if point in ends:
                points=[point]
                while point in parents:
                    point=parents[point];points.append(point)
                valid=[list(reversed(points))];break
            ix,iy=xs.index(point[0]),ys.index(point[1])
            neighbors=[]
            for nx,ny in [(ix-1,iy),(ix+1,iy),(ix,iy-1),(ix,iy+1)]:
                if 0<=nx<len(xs) and 0<=ny<len(ys):neighbors.append((xs[nx],ys[ny]))
            for next_point in neighbors:
                if not clear([point,next_point]):continue
                next_cost=cost+math.dist(point,next_point)+1
                if next_cost<distances.get(next_point,math.inf):
                    distances[next_point]=next_cost;parents[next_point]=point;heapq.heappush(queue,(next_cost,next_point))
        if not valid:raise ValueError(f"No clear route: {a['id']} → {b['id']}")
    points = min(valid,key=lambda pts:sum(math.dist(p,q) for p,q in zip(pts,pts[1:])))
    return ' '.join(f"{'M' if i == 0 else 'L'}{x:g} {y:g}" for i,(x,y) in enumerate(points))

def build(source):
    nodes, edges, playback, grids, routes, labels = [], [], [], [], [], []
    bar_start = 1
    for index, (title, bars_text) in enumerate(source['sections']):
        section_id = f'section-{index+1}'
        top = 230 + index * 1130
        color = PALETTE[index % len(PALETTE)]
        grid = dict(id=section_id,title=f'{title} · bars {bar_start}–{bar_start+len(bars_text.split())-1}',titleY=top+40,titleSize=32,left=200,right=1600,boundaries=[200+i*280 for i in range(6)],centers=[340+i*280 for i in range(5)],rows=[top+180,top+480,top+780],top=top+125,bottom=top+850,frets=[5,6,7,8,9],fretY=top+100,stringLabels=['D','A','Low E'],color=color)
        grids.append(grid)
        local=[]
        for bar in bars_text.split():
            chords = bar.split(',')
            bar_duration=0
            for item in chords:
                chord, explicit = item.split('@') if '@' in item else (item, None)
                duration=float(explicit) if explicit else 1/len(chords)
                if duration <= 0:raise ValueError(f'Invalid duration: {bar}')
                bar_duration+=duration
                if local and local[-1]['chord']==chord:
                    local[-1]['bars']+=duration
                else:
                    local.append(dict(chord=chord,bars=duration,section=title))
            if not math.isclose(bar_duration,1):raise ValueError(f"{source['id']}: bar {bar} totals {bar_duration}")
        for event in local:
            if event['chord']=='NC':event['nodeId']=None
        symbols=list(dict.fromkeys(e['chord'] for e in local if e['chord']!='NC'))
        roots=list(dict.fromkeys(root_of(chord) for chord in symbols))
        anchors={}
        for root in roots:
            options=[(string,fret) for string,tuning in [('E',4),('A',9),('D',2)] for fret in range(5,10) if (tuning+fret)%12==pitch(root)]
            anchors[root]=options[0]
        for chord in symbols:
            root=root_of(chord)
            string,fret=anchors[root]
            same=[c for c in symbols if pitch(root_of(c))==pitch(root)]
            offset=(same.index(chord)-(len(same)-1)/2)*120
            if abs(offset)>130:
                raise ValueError(f'Too many qualities at root {root}: split this section further')
            n=dict(id=f'{section_id}-node-{len(nodes)+1}',section=section_id,chord=label(chord),root=root.replace('b','♭').replace('#','♯'),string=string,fret=fret,x=340+(fret-5)*280+offset,y=grid['rows'][{'D':0,'A':1,'E':2}[string]],shape='circle',radius=46,fontSize=min(32,110/max(1,len(label(chord)))),textOffset=4,badgeOffset=-68,badgeColor=color,step=len(nodes)+1)
            nodes.append(n)
            for event in local:
                if event['chord']==chord:event['nodeId']=n['id']
            durations=list(dict.fromkeys(e['bars'] for e in local if e.get('nodeId')==n['id']))
            if durations != [1]:
                text=' / '.join(duration_label(d,source.get('beatsPerBar',4)) for d in durations)
                labels.append(dict(nodeId=n['id'],offsetX=0,offsetY=100,text=text))
        local_nodes=[n for n in nodes if n['section']==section_id]
        by_id={n['id']:n for n in local_nodes}
        seen=set()
        for a,b in zip(local,local[1:]):
            pair=(a['nodeId'],b['nodeId'])
            if None in pair:continue
            if pair in seen:continue
            seen.add(pair)
            edge=dict(id=f'{section_id}-edge-{len(seen)}',section=section_id,source=pair[0],target=pair[1],width=5,passNumber=1)
            custom=path_for(by_id[pair[0]],by_id[pair[1]],local_nodes,grid)
            if custom:edge['path']=custom
            edges.append(edge)
        playback.extend(local)
        routes.append(dict(title=grid['title'],nodeIds=[e['nodeId'] for e in local if e['nodeId']],kind='solid',note='Follow the visit numbers, then continue to the next panel.' if index < len(source['sections'])-1 else 'Playback loops from here.'))
        bar_start+=len(bars_text.split())
    assert math.isclose(sum(e['bars'] for e in playback),source['bars']),source['id']
    first=nodes[0]
    return dict(schemaVersion=1,id=source['id'],title=source['title'],key=source['key'],sourceUrl=f"https://standardrepertoire.com/{source['id']}.html",beatsPerBar=source.get('beatsPerBar',4),sourceNote=source.get('sourceNote',''),description=f"{source['title']}: measured section graphs on the three lowest guitar strings. Badges show every visit in playback order.",startNodeId=first['id'],nodes=nodes,edges=edges,playback=playback,durationLabels=labels,layout=dict(viewBox=f"0 0 1820 {len(grids)*1130+280}",titleSize=83,subtitleSize=35,subtitle=f"{source['key']} · {source['bars']} bars · {source.get('beatsPerBar',4)}/4 · Frets 5–9",sections=grids,footerY=len(grids)*1130+240,footerSize=25,footer='Continue panel by panel. Badges list every visit; durations are in bars.',startLabel=dict(x=first['x'],y=first['y']+155),startOutline=dict(x=first['x']-55,y=first['y']-55,width=110,height=110)),routes=routes,tip=dict(title='Follow the movement. ',text='Major circles, minor triangles, dominant squares, diminished hexagons. Chord qualities share fret/string anchors. '+source.get('sourceNote','')),footerNote='Full source qualities and durations drive playback; optional alternatives are omitted.',playbackNote=f"{source['bars']} bars in {source.get('beatsPerBar',4)}/4. "+source.get('sourceNote',''))

if __name__=='__main__':
    for source in json.loads((ROOT/'scripts/data/first-ten.json').read_text()):
        song=build(source)
        (ROOT/f"src/data/{source['id']}.json").write_text(json.dumps(song,ensure_ascii=False,indent=2)+'\n')
        print(f"{song['title']}: {source['bars']} bars, {len(song['nodes'])} nodes")
