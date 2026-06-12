import {useEffect, useRef, useState} from "react";
import logo from "../public/logo.png";

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

export default function ScoreHeader({
  stats,
  attendeeCount,
  eventName,
  onReset,
}) {
  const impacted = stats.affected + stats.seatsShort;
  const shown = useAnimatedNumber(impacted);
  const severity = impacted > 500 ? "bad" : impacted > 250 ? "warn" : "good";

  return (
    <header className="score-header">
      <div className="header-left">
        <div className="brand">
          <img src={logo} alt="Slotwise" className="brand-logo" />
          <div className="brand-text">
            <div className="brand-name">Slotwise</div>
            <div className="brand-sub">{eventName}</div>
          </div>
        </div>
        <button type="button" className="reset-btn" onClick={onReset}>
          <span className="reset-icon">↺</span>
          Reset agenda
        </button>
      </div>

      <div className="header-center">
        <div className={`hero-score hero-${severity}`}>
          <div className="hero-number">{shown.toLocaleString()}</div>
          <div className="hero-label">attendees impacted</div>
        </div>
      </div>

      <div className="header-right">
        <div className="attendee-badge">
          <div className="attendee-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="9"
                cy="7"
                r="4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="attendee-info">
            <div className="attendee-count">
              {attendeeCount.toLocaleString()}
            </div>
            <div className="attendee-label">Total Attendees</div>
          </div>
        </div>

        <div className="stat-grid">
          <div
            className={`stat-item ${stats.affected > 250 ? "stat-bad" : "stat-good"}`}
          >
            <div className="stat-value">{stats.affected.toLocaleString()}</div>
            <div className="stat-label">Clashes</div>
          </div>
          <div
            className={`stat-item ${stats.seatsShort > 0 ? "stat-bad" : "stat-good"}`}
          >
            <div className="stat-value">
              {stats.seatsShort.toLocaleString()}
            </div>
            <div className="stat-label">Seats Short</div>
          </div>
          <div
            className={`stat-item ${stats.overflows.length > 0 ? "stat-bad" : "stat-good"}`}
          >
            <div className="stat-value">{stats.overflows.length}</div>
            <div className="stat-label">Overflows</div>
          </div>
          <div
            className={`stat-item ${stats.speakerConflicts.length > 0 ? "stat-bad" : "stat-good"}`}
          >
            <div className="stat-value">{stats.speakerConflicts.length}</div>
            <div className="stat-label">Conflicts</div>
          </div>
        </div>
      </div>

      {stats.worstPair && stats.worstPair.count > 40 && (
        <div className="worst-clash-banner">
          {/* <span className="clash-icon"></span> */}
          <span className="clash-text">
            Worst clash: <strong>{stats.worstPair.titles[0]}</strong> vs{" "}
            <strong>{stats.worstPair.titles[1]}</strong> —{" "}
            {stats.worstPair.count} attendees want both
          </span>
        </div>
      )}
    </header>
  );
}
