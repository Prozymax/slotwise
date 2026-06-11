import { useEffect, useRef, useState } from "react";

function useAnimatedNumber(target: number, ms = 650) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const t0 = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

export default function ScoreHeader({ stats, attendeeCount, eventName, onReset }) {
  const impacted = stats.affected + stats.seatsShort;
  const shown = useAnimatedNumber(impacted);
  const severity = impacted > 500 ? "bad" : impacted > 250 ? "warn" : "good";

  return (
    <header className="score-header">
      <div className="brand">
        <div className="brand-mark">◫</div>
        <div className="brand-text">
          <div className="brand-name">Slotwise</div>
          <div className="brand-sub">
            {eventName} ·{" "}
            <span className="import-badge">
              ✓ {attendeeCount.toLocaleString()} registrations imported
            </span>
          </div>
          <button className="reset-btn" onClick={onReset}>↺ Reset agenda</button>
        </div>
      </div>

      <div className={`hero-score hero-${severity}`}>
        <div className="hero-number">{shown.toLocaleString()}</div>
        <div className="hero-label">attendees impacted by this layout</div>
      </div>

      <div className="stat-tiles">
        <div className={`tile ${stats.affected > 250 ? "tile-bad" : "tile-good"}`}>
          <div className="tile-value">{stats.affected.toLocaleString()}</div>
          <div className="tile-label">schedule clashes</div>
        </div>
        <div className={`tile ${stats.seatsShort > 0 ? "tile-bad" : "tile-good"}`}>
          <div className="tile-value">{stats.seatsShort.toLocaleString()}</div>
          <div className="tile-label">seats short</div>
        </div>
        <div className={`tile ${stats.overflows.length > 0 ? "tile-bad" : "tile-good"}`}>
          <div className="tile-value">{stats.overflows.length}</div>
          <div className="tile-label">rooms over capacity</div>
        </div>
        <div className={`tile ${stats.speakerConflicts.length > 0 ? "tile-bad" : "tile-good"}`}>
          <div className="tile-value">{stats.speakerConflicts.length}</div>
          <div className="tile-label">speaker conflicts</div>
        </div>
      </div>

      {stats.worstPair && stats.worstPair.count > 40 && (
        <div className="worst-clash">
          ⚡ Worst clash: <b>{stats.worstPair.titles[0]}</b> vs{" "}
          <b>{stats.worstPair.titles[1]}</b> — {stats.worstPair.count} attendees want both
        </div>
      )}
    </header>
  );
}
