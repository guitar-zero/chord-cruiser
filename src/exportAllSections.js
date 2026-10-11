// Nest each rendered section so its measured viewBox and SVG definitions survive export.
export function exportAllSections(song, sectionSvgs, darkMode) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  const width = 1400,
    padding = 50,
    contentWidth = width - padding * 2;
  const background = darkMode ? "#192427" : "#fbf8ed";
  const ink = darkMode ? "#e3f1ed" : "#073840";
  const addText = (text, y, size, weight = 400) => {
    const node = document.createElementNS(ns, "text");
    node.setAttribute("x", padding);
    node.setAttribute("y", y);
    node.setAttribute("fill", ink);
    node.setAttribute("font-size", size);
    node.setAttribute(
      "font-family",
      "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    );
    node.setAttribute("font-weight", weight);
    node.textContent = text;
    svg.append(node);
  };
  addText(song.title, 80, 46, 700);
  addText(`In ${song.key}`, 126, 28);
  let y = 176;
  if (song.playbackNote) {
    const lines = [];
    for (const word of song.playbackNote.split(/\s+/)) {
      if (!lines.length || `${lines.at(-1)} ${word}`.length > 95)
        lines.push(word);
      else lines[lines.length - 1] += ` ${word}`;
    }
    for (const line of lines) {
      addText(line, y, 24);
      y += 34;
    }
  }
  y += 12;
  addText(
    "Shell chords: the appropriate seventh is implied; labels omit some extensions.",
    y,
    22,
  );
  y += 52;
  for (const section of sectionSvgs) {
    const clone = section.cloneNode(true);
    const [, , viewWidth, viewHeight] = clone
      .getAttribute("viewBox")
      .split(/\s+/)
      .map(Number);
    const height = (contentWidth * viewHeight) / viewWidth;
    clone.setAttribute("x", padding);
    clone.setAttribute("y", y);
    clone.setAttribute("width", contentWidth);
    clone.setAttribute("height", height);
    clone
      .querySelectorAll('[aria-label="Current chord"]')
      .forEach((node) => node.remove());
    clone
      .querySelectorAll("rect")
      .forEach((rect) => rect.style.removeProperty("transition"));
    svg.append(clone);
    y += height + 35;
  }
  svg.setAttribute("xmlns", ns);
  svg.setAttribute("viewBox", `0 0 ${width} ${y + padding}`);
  // Ten inches fits landscape Letter with half-inch margins (and A4).
  // Preserve aspect ratio; longer songs naturally produce a taller sheet.
  svg.setAttribute("width", "10in");
  svg.setAttribute("height", `${(10 * (y + padding)) / width}in`);
  const paper = document.createElementNS(ns, "rect");
  paper.setAttribute("width", "100%");
  paper.setAttribute("height", "100%");
  paper.setAttribute("fill", background);
  svg.prepend(paper);
  return svg;
}

// A standalone SVG has no paged layout. Give printing separate, fixed-size
// SVG pages so the browser cannot fragment a chart section across sheets.
export function exportPrintPages(song, sectionSvgs) {
  return Array.from(sectionSvgs, section => {
    const page = exportAllSections(song, [section], false);
    page.setAttribute('width', '100%');
    page.setAttribute('height', '100%');
    page.setAttribute('preserveAspectRatio', 'xMidYMin meet');
    // Include the entire chart even when playback hides distant nodes.
    page.querySelectorAll('[data-node-id]').forEach(node => {
      node.removeAttribute('opacity');
      node.removeAttribute('aria-hidden');
    });
    return page;
  });
}
