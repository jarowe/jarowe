import { useRef, useCallback, useEffect, useState } from 'react';
import { useConstellationStore, selectPanelOpen } from '../store';
import './TimelineScrubber.css';

/**
 * Vertical timeline scrubber (v1 -- vertical rail, spiral minimap deferred).
 * Positioned on the right side of the viewport.
 * Drag thumb or click track to move camera along helix.
 * Shows epoch labels at proportional positions.
 */
export default function TimelineScrubber() {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const timelinePosition = useConstellationStore((s) => s.timelinePosition);
  const setTimelinePosition = useConstellationStore((s) => s.setTimelinePosition);
  const panelOpen = useConstellationStore(selectPanelOpen);

  // Compute epoch label positions (proportional based on date ranges)
  const epochs = useConstellationStore((s) => s.epochs);
  const epochPositions = useRef([]);

  useEffect(() => {
    if (!epochs.length) return;
    // Parse year ranges from epoch data
    const allYears = epochs.map((e) => {
      const [start, end] = e.range.split('-').map(Number);
      return { ...e, startYear: start, endYear: end };
    });
    const globalStart = Math.min(...allYears.map((e) => e.startYear));
    const globalEnd = Math.max(...allYears.map((e) => e.endYear));
    const totalSpan = globalEnd - globalStart;

    epochPositions.current = allYears.map((e) => {
      const midYear = (e.startYear + e.endYear) / 2;
      const position = totalSpan > 0 ? (midYear - globalStart) / totalSpan : 0;
      return {
        label: e.label,
        position,
        color: e.color,
      };
    });
  }, [epochs]);

  // Convert pointer Y to normalized position (0 = top/oldest, 1 = bottom/newest)
  const getPositionFromPointer = useCallback((clientY) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const y = clientY - rect.top;
    const normalized = Math.max(0, Math.min(1, y / rect.height));
    return normalized;
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(true);
      const pos = getPositionFromPointer(e.clientY);
      setTimelinePosition(pos);
    },
    [getPositionFromPointer, setTimelinePosition]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragging) return;
      const pos = getPositionFromPointer(e.clientY);
      setTimelinePosition(pos);
    },
    [dragging, getPositionFromPointer, setTimelinePosition]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Attach global pointer listeners during drag
  useEffect(() => {
    if (dragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [dragging, handlePointerMove, handlePointerUp]);

  // Hide when detail panel is open (avoid overlap)
  if (panelOpen) return null;

  return (
    <div className="timeline-scrubber" aria-label="Timeline navigation">
      {/* Epoch labels */}
      <div className="timeline-scrubber__labels">
        {epochPositions.current.map((epoch, i) => (
          <button
            key={i}
            className="timeline-scrubber__epoch"
            style={{ top: `${epoch.position * 100}%` }}
            onClick={() => setTimelinePosition(epoch.position)}
            title={epoch.label}
          >
            <span
              className="timeline-scrubber__dot"
              style={{ backgroundColor: epoch.color }}
            />
            <span className="timeline-scrubber__epoch-label">{epoch.label}</span>
          </button>
        ))}
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className={`timeline-scrubber__track${dragging ? ' timeline-scrubber__track--active' : ''}`}
        onPointerDown={handlePointerDown}
      >
        <div className="timeline-scrubber__rail" />
        <div
          className="timeline-scrubber__thumb"
          style={{ top: `${timelinePosition * 100}%` }}
        />
      </div>
    </div>
  );
}
