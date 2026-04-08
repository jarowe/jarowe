import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useConstellationStore, selectPanelOpen } from '../store';
import './TimelineScrubber.css';

/**
 * Vertical timeline scrubber — glass card with gradient rail, epoch-colored
 * accent bars, year ranges, and a glowing thumb.
 * Positioned on the left side of the viewport.
 */
export default function TimelineScrubber() {
  const containerRef = useRef(null);
  const epochsRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const timelinePosition = useConstellationStore((s) => s.timelinePosition);
  const setTimelinePosition = useConstellationStore((s) => s.setTimelinePosition);
  const setTimelineDragging = useConstellationStore((s) => s.setTimelineDragging);
  const panelOpen = useConstellationStore(selectPanelOpen);

  // In tunnel mode, scrubber must directly set tunnelY (the camera controller
  // effect has too many guards that block it). This helper handles both modes.
  const applyTimelinePosition = useCallback((pos) => {
    setTimelinePosition(pos);
    const { cameraMode, nodes } = useConstellationStore.getState();
    if (cameraMode === 'tunnel') {
      // Compute Y from the helix bounds
      const helixNodes = nodes.filter((n) => n.tier !== 'particle');
      if (helixNodes.length > 0) {
        let minY = Infinity, maxY = -Infinity;
        for (const n of helixNodes) {
          if (n.y < minY) minY = n.y;
          if (n.y > maxY) maxY = n.y;
        }
        const range = maxY - minY;
        const padding = range * 0.15;
        const mappedY = (minY - padding) + pos * (range + padding * 2);
        useConstellationStore.getState().setTunnelY(mappedY);
      }
    }
  }, [setTimelinePosition]);

  const epochs = useConstellationStore((s) => s.epochs);

  // Compute epoch label positions and year ranges
  const epochData = useMemo(() => {
    if (!epochs.length) return [];
    const allYears = epochs.map((e) => {
      const [start, end] = e.range.split('-').map(Number);
      return { ...e, startYear: start, endYear: end };
    });
    const globalStart = Math.min(...allYears.map((e) => e.startYear));
    const globalEnd = Math.max(...allYears.map((e) => e.endYear));
    const totalSpan = globalEnd - globalStart;

    return allYears.map((e) => {
      const midYear = (e.startYear + e.endYear) / 2;
      const position = totalSpan > 0 ? (midYear - globalStart) / totalSpan : 0;
      return {
        label: e.label,
        position,
        color: e.color,
        range: `${e.startYear}\u2013${e.endYear}`,
      };
    });
  }, [epochs]);

  // Determine which epoch the thumb is currently in
  const activeEpoch = useMemo(() => {
    if (!epochData.length) return null;
    let closest = epochData[0];
    let closestDist = Infinity;
    for (const ep of epochData) {
      const dist = Math.abs(ep.position - timelinePosition);
      if (dist < closestDist) {
        closestDist = dist;
        closest = ep;
      }
    }
    return closest;
  }, [epochData, timelinePosition]);

  // Build gradient string from epoch colors for the rail background
  const railGradient = useMemo(() => {
    if (!epochData.length) return 'rgba(255,255,255,0.15)';
    // Epochs sorted bottom (0%) to top (100%) — CSS gradient top=0% so invert
    const stops = epochData
      .map((ep) => `${ep.color} ${(1 - ep.position) * 100}%`)
      .sort((a, b) => {
        const pA = parseFloat(a.split(' ')[1]);
        const pB = parseFloat(b.split(' ')[1]);
        return pA - pB;
      });
    return `linear-gradient(to bottom, ${stops.join(', ')})`;
  }, [epochData]);

  // Convert pointer Y to normalized position (0 = bottom/oldest, 1 = top/newest)
  const getPositionFromPointer = useCallback((clientY) => {
    const el = epochsRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const y = clientY - rect.top;
    return Math.max(0, Math.min(1, 1 - y / rect.height));
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      // Ignore if clicking an epoch button directly (those handle their own click)
      if (e.target.closest('.timeline-scrubber__epoch')) return;
      e.preventDefault();
      setDragging(true);
      setTimelineDragging(true);
      const pos = getPositionFromPointer(e.clientY);
      applyTimelinePosition(pos);
    },
    [getPositionFromPointer, applyTimelinePosition, setTimelineDragging]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragging) return;
      const pos = getPositionFromPointer(e.clientY);
      applyTimelinePosition(pos);
    },
    [dragging, getPositionFromPointer, setTimelinePosition]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    setTimelineDragging(false);
  }, [setTimelineDragging]);

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

  const thumbColor = activeEpoch?.color || 'rgba(255,255,255,0.9)';
  const fillHeight = `${timelinePosition * 100}%`;

  return (
    <div
      ref={containerRef}
      className={`timeline-scrubber${dragging ? ' timeline-scrubber--dragging' : ''}`}
      aria-label="Timeline navigation"
      onPointerDown={handlePointerDown}
    >
      <div ref={epochsRef} className="timeline-scrubber__epochs">
        {/* Gradient rail */}
        <div className="timeline-scrubber__rail">
          <div
            className="timeline-scrubber__rail-bg"
            style={{ background: railGradient }}
          />
          <div
            className="timeline-scrubber__rail-fill"
            style={{
              height: fillHeight,
              background: railGradient,
            }}
          />
        </div>

        {/* Glowing thumb */}
        <div
          className="timeline-scrubber__thumb"
          style={{
            top: `${(1 - timelinePosition) * 100}%`,
            background: thumbColor,
            boxShadow: `0 0 12px ${thumbColor}, 0 0 4px ${thumbColor}`,
          }}
        />

        {/* Epoch labels with accent bars and year ranges */}
        {epochData.map((epoch, i) => (
          <button
            key={i}
            className="timeline-scrubber__epoch"
            style={{ top: `${(1 - epoch.position) * 100}%` }}
            onClick={() => applyTimelinePosition(epoch.position)}
            title={`${epoch.label} (${epoch.range})`}
          >
            <span
              className="timeline-scrubber__accent-bar"
              style={{ backgroundColor: epoch.color }}
            />
            <span className="timeline-scrubber__epoch-text">
              <span className="timeline-scrubber__epoch-label">{epoch.label}</span>
              <span className="timeline-scrubber__epoch-range">{epoch.range}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
