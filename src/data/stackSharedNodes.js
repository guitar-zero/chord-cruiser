import { routePath } from './stringLayout.js';

export function stackSharedNodes(source) {
  const scales=new Map(source.layout.sections.map(section=>{
    const groups=Object.groupBy(source.nodes.filter(node=>node.section===section.id),node=>`${node.string}:${node.fret}`);
    const maxCount=Math.max(1,...Object.values(groups).map(group=>group.length));
    const gap=Math.min(...section.rows.slice(1).map((y,i)=>y-section.rows[i]));
    return [section.id,Math.max(.8,(150+(maxCount-1)*120)/gap)];
  }));
  const stretched=source.layout.sections.map(section=>({...section,rows:section.rows.map(y=>section.top+(y-section.top)*scales.get(section.id)),bottom:section.top+(section.bottom-section.top)*scales.get(section.id)}));
  const sections=new Map(stretched.map(section=>[section.id,section]));
  const groups=Object.groupBy(source.nodes,node=>`${node.section}:${node.string}:${node.fret}`);
  const byId=new Map();
  for(const group of Object.values(groups)) {
    const section=sections.get(group[0].section);
    const x=section.centers[section.frets.indexOf(group[0].fret)];
    const originalSection=source.layout.sections.find(item=>item.id===section.id);
    const y=section.top+(group.reduce((sum,node)=>sum+node.y,0)/group.length-originalSection.top)*scales.get(section.id);
    group.forEach((node,i)=>byId.set(node.id,group.length===1 ? {...node,y} : {...node,x,y:y+(i-(group.length-1)/2)*120}));
  }
  const nodes=source.nodes.map(node=>byId.get(node.id));
  const edges=source.edges.map(edge=>{
    const section=sections.get(edge.section);
    const sourceNode=byId.get(edge.source),targetNode=byId.get(edge.target);
    return {...edge,path:sourceNode && targetNode ? routePath(sourceNode,targetNode,nodes.filter(node=>node.section===edge.section),section) : edge.path};
  });
  const start=byId.get(source.startNodeId);
  return {...source,nodes,edges,layout:{...source.layout,sections:stretched,
    startLabel:source.layout.startLabel ? {...source.layout.startLabel,x:start.x,y:start.y+140} : undefined,
    startOutline:{x:start.x-55,y:start.y-55,width:110,height:110},
  }};
}
