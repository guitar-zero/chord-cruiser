import { validateTabUrl } from '../src/data/tabUrl.js';
const decode=text=>text.replace(/&quot;/g,'"').replace(/&#039;|&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
export function extractTab(html) {
  const store=html.match(/class=["'][^"']*js-store[^"']*["'][^>]*data-content="([^"]+)"/) || html.match(/data-content="([^"]+)"[^>]*class=["'][^"']*js-store/);
  if(!store) throw Error('This page did not provide a public text tab. Open the source and paste its tab text.');
  let data;try {data=JSON.parse(decode(store[1]));} catch {throw Error('Could not read this page. Paste its tab text instead.');}
  const page=data.store?.page?.data,content=page?.tab_view?.wiki_tab?.content;
  if(typeof content!=='string'||!content.trim()) throw Error('No public text tab found. Pro and interactive tabs need a text version.');
  return {text:content.replace(/\[\/?(?:tab|ch)\]/g,''),title:page.tab?.song_name||'Imported tab'};
}
export async function tabImportMiddleware(req,res,next) {
  if(req.url?.split('?')[0]!=='/api/tab-import') return next();
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') {res.statusCode=405;return res.end(JSON.stringify({error:'Use GET.'}));}
  try {
    let url=validateTabUrl(new URL(req.url,'http://localhost').searchParams.get('url')),response;
    const signal=AbortSignal.timeout(15000);
    for(let i=0;i<4;i++) {
      response=await fetch(url,{redirect:'manual',signal,headers:{Accept:'text/html'}});
      if(![301,302,303,307,308].includes(response.status)) break;
      const location=response.headers.get('location');await response.body?.cancel();
      if(!location) throw Error('Invalid source redirect.');
      url=validateTabUrl(new URL(location,url).href);
    }
    if(!response.ok) {await response.body?.cancel();throw Error('Ultimate Guitar could not provide this page. Paste the tab text instead.');}
    const reader=response.body.getReader(),decoder=new TextDecoder();let html='',size=0;
    while(true) {const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>5_000_000){await reader.cancel();throw Error('This page is too large. Paste its tab text.');}html+=decoder.decode(value,{stream:true});}
    html+=decoder.decode();res.end(JSON.stringify(extractTab(html)));
  } catch(error) {res.statusCode=422;res.end(JSON.stringify({error:error.name==='TimeoutError'?'Import timed out. Paste the tab text instead.':error.message==='fetch failed'?'Could not reach Ultimate Guitar. Paste the tab text instead.':error.message}));}
}
