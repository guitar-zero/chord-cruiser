import { exportPrintPages } from './exportAllSections.js';

export function printChart(song, sectionSvgs) {
  const pages = exportPrintPages(song, sectionSvgs);
  const preview = window.open('', '_blank');
  if (!preview) return false;
  preview.opener = null;
  const doc = preview.document;
  doc.title = `${song.title} · Print charts`;
  const style = doc.createElement('style');
  style.textContent = `
    @page { size: landscape; margin: .5in; }
    body { margin: 0; background: #eee; font: 14px system-ui, sans-serif; }
    .print-controls { padding: 16px; text-align: center; }
    button { padding: 8px 16px; cursor: pointer; }
    .print-page { width: 10in; height: 7in; margin: 16px auto; background: #fbf8ed; }
    .print-page svg { display: block; width: 100%; height: 100%; }
    .print-page * { animation: none !important; transition: none !important; }
    @media print {
      body { background: white; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .print-controls { display: none; }
      .print-page { width: 100%; height: 7in; margin: 0; break-inside: avoid; page-break-inside: avoid; break-after: page; page-break-after: always; }
      .print-page:last-child { break-after: auto; page-break-after: auto; }
    }
  `;
  doc.head.append(style);
  const controls = doc.createElement('div');
  controls.className = 'print-controls';
  const button = doc.createElement('button');
  button.textContent = 'Print / Save as PDF';
  button.addEventListener('click', () => preview.print());
  const explanation = doc.createElement('p');
  explanation.textContent = 'Each section stays on one landscape page. Use Letter or A4 paper.';
  controls.append(button, explanation);
  doc.body.append(controls);
  pages.forEach(page => {
    const sheet = doc.createElement('section');
    sheet.className = 'print-page';
    sheet.append(doc.importNode(page, true));
    doc.body.append(sheet);
  });
  preview.focus();
  return true;
}
