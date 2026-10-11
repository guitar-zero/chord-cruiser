import React, { useEffect, useId, useRef } from 'react';
import MiniLeadSheet from './MiniLeadSheet.jsx';

export default function ChordChartModal({ title, onClose, ...chartProps }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const trigger = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className="chord-chart-modal" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    <div className="chord-chart-modal-heading">
      <h2 id={titleId}>{title} · Chord chart</h2>
      <button type="button" autoFocus onClick={onClose} aria-label="Close chord chart">×</button>
    </div>
    <MiniLeadSheet {...chartProps} />
    <p className="chord-chart-modal-hint">Click a chord to seek · % repeats the previous bar · Esc to close</p>
  </dialog>;
}
