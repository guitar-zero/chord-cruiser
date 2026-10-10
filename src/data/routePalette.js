// Circular rainbow order, beginning with the default red.
export const routePalette = ['#c43b32', '#cc480e', '#a06a16', '#576b24', '#29805d', '#267b99', '#485aa3', '#8b4695', '#be3d6a'];

export function rainbowChoices(current, allowed = routePalette) {
  const start=routePalette.indexOf(current);
  const ordered=routePalette.map((_,i)=>routePalette[(Math.max(0,start)+i)%routePalette.length]).filter(color=>allowed.includes(color));
  return [...ordered,...allowed.filter(color=>!routePalette.includes(color))];
}

// Existing charts use orange as their base; present that base as red.
export function redStartingColor(song) {
  const color=value=>value==='#cc480e'?'#c43b32':value;
  return {...song,
    nodes:song.nodes.map(node=>({...node,badgeColor:color(node.badgeColor)})),
    edges:song.edges.map(edge=>({...edge,preferredColor:color(edge.preferredColor)})),
    layout:{...song.layout,sections:song.layout.sections.map(section=>({...section,color:color(section.color),palette:section.palette?.map(color)}))},
  };
}

// Keep equal-color runs; every required change consumes the next rainbow slot.
export function chronologicalColors(colors) {
  let index=0;
  return colors.map((color,i)=>{
    if(i>0 && color!==colors[i-1]) index++;
    return routePalette[index%routePalette.length];
  });
}
