import { routeVertices } from './reciprocalRoutes.js';

// Expand fret spacing without enlarging chord shapes or changing string rows.
export function threeStringLayout(source) {
  const scale=1.65;
  const bySection=new Map(source.layout.sections.map(section=>[section.id,section]));
  const xFor=(sectionId,x)=>{
    const section=bySection.get(sectionId);
    return section.left+(x-section.left)*scale;
  };
  const nodes=source.nodes.map(node=>({...node,x:xFor(node.section,node.x)}));
  const sections=source.layout.sections.map(section=>({...section,
    right:xFor(section.id,section.right),
    boundaries:section.boundaries.map(x=>xFor(section.id,x)),
    centers:section.centers.map(x=>xFor(section.id,x)),
    sideGutterLeft:110,sideGutterRight:45,
    box:section.box ? {...section.box,x:xFor(section.id,section.box.x),width:section.box.width*scale} : undefined,
  }));
  const edges=source.edges.map(edge=>({...edge,path:edge.path ? routeVertices(edge.path).map((point,i)=>`${i?'L':'M'}${xFor(edge.section,point.x)} ${point.y}`).join(' ') : undefined}));
  const start=source.nodes.find(node=>node.id===source.startNodeId);
  const startSection=start?.section;
  const layout={...source.layout,sections};
  if(startSection && layout.startLabel) layout.startLabel={...layout.startLabel,x:xFor(startSection,layout.startLabel.x)};
  if(startSection && layout.startOutline) {
    const node=nodes.find(node=>node.id===source.startNodeId);
    layout.startOutline={...layout.startOutline,x:node.x-layout.startOutline.width/2};
  }
  return {...source,nodes,edges,layout};
}
