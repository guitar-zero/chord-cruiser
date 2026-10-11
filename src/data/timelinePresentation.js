const darkColors = { '#c43b32':'#ff8278', '#cc480e':'#ffa263', '#267b99':'#70d8ef', '#8b4695':'#d8a2ee', '#29805d':'#83d7ae', '#a06a16':'#e5bd70', '#be3d6a':'#f38eae', '#485aa3':'#a3b1ff', '#576b24':'#bbcf81' };

export function timelineColor(color, darkMode) {
  const qualityDarkColors = { '#13856b': '#65d6b4', '#8054bd': '#c49af2', '#d34b45': '#ff9288' };
  return darkMode ? qualityDarkColors[color] || darkColors[color] || color : color;
}

export function darkerTimelineColor(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color || '')) return color;
  return '#' + [1, 3, 5].map(start => Math.round(parseInt(color.slice(start, start + 2), 16) * .7).toString(16).padStart(2, '0')).join('');
}

export function timelineLabel(event, nodeLabels = {}) {
  if (event.label) return event.label;
  return nodeLabels[event.nodeId] || event.chord.replace('mMaj7', 'mΔ7').replace('maj7', 'Δ7').replaceAll('b', '♭');
}
