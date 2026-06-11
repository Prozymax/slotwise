import { useMemo, useState } from "react";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { computeJourney } from "../engine/journey.js";
import { PERSONAS } from "../data/personas.js";

type Persona = (typeof PERSONAS)[0];

const ISSUE_ICONS: Record<string, string> = {
  conflict: "⚡",
  overflow: "⛔",
  fatigue:  "🔋",
  gap:      "💬",
};

export default function JourneyView({ assignments, data }) {
  const [persona, setPersona] = useState<Persona>(PERSONAS[0]);

  const journey = useMemo(
    () => computeJourney(persona, assignments, data.sessions, data.slots, data.demand, data.rooms),
    [persona, assignments, data]
  );

  const errorCount = journey.issues.filter(i => i.severity === "error").length;
  const warnCount  = journey.issues.filter(i => i.severity === "warn").length;
  const hasProblems = errorCount + warnCount > 0;

  return (
    <div className="journey-wrap">

      {/* ── Persona picker ── */}
      <div className="journey-picker-row">
        <span className="journey-picker-label">Show me</span>
        <DropDownList
          data={PERSONAS}
          textField="name"
          dataItemKey="id"
          value={persona}
          onChange={(e) => setPersona(e.value as Persona)}
          style={{ width: 240 }}
        />
        <span className="journey-picker-suffix">— as the agenda stands today</span>
      </div>

      {/* ── Persona card ── */}
      <div className={`journey-persona ${hasProblems ? "persona-issues" : "persona-clear"}`}>
        <div className="journey-avatar">{persona.avatar}</div>
        <div className="journey-info">
          <div className="journey-name">{persona.name}</div>
          <div className="journey-role">{persona.role}</div>
          <div className="journey-tags">
            {persona.interests.map(t => (
              <span key={t} className="journey-tag">{t}</span>
            ))}
          </div>
        </div>
        <div className={`journey-badge ${errorCount > 0 ? "jbadge-error" : warnCount > 0 ? "jbadge-warn" : "jbadge-ok"}`}>
          {errorCount > 0
            ? `${errorCount} conflict${errorCount > 1 ? "s" : ""}`
            : warnCount > 0
            ? `${warnCount} warning`
            : "✓ All clear"}
        </div>
      </div>

      {/* ── Day timeline ── */}
      <div className="journey-section">
        <h3 className="journey-section-title">
          {persona.name.split(" ")[0]}'s Conference Day
        </h3>

        <div className="journey-timeline">
          {journey.picks.length === 0 && (
            <p className="journey-empty">None of {persona.name.split(" ")[0]}'s preferred sessions are scheduled yet.</p>
          )}

          {journey.picks.map((pick, i) => {
            const prev = i > 0 ? journey.picks[i - 1] : null;
            const gapBefore = prev != null && pick.slot != null && prev.slot != null
              ? pick.slot - prev.slot - 1
              : 0;

            return (
              <div key={pick.sessionId}>
                {/* Networking gap marker */}
                {gapBefore >= 2 && (
                  <div className="journey-gap-marker">
                    <span className="gap-line" />
                    <span className="gap-text">
                      💬 {gapBefore} free slot{gapBefore > 1 ? "s" : ""} — networking window
                    </span>
                    <span className="gap-line" />
                  </div>
                )}

                {/* Session stop */}
                <div className={`journey-stop ${pick.hasConflict ? "stop-conflict" : pick.isOverflow ? "stop-overflow" : "stop-ok"}`}>
                  <div className="stop-time">{pick.slotLabel}</div>

                  <div className="stop-connector">
                    <div className="stop-dot" />
                    {i < journey.picks.length - 1 && <div className="stop-line" />}
                  </div>

                  <div className="stop-body">
                    <div className="stop-title">{pick.session.title}</div>
                    <div className="stop-meta">
                      {pick.session.speaker}
                      {pick.room && <> · <span className="stop-room">{pick.room.name}</span></>}
                    </div>
                    <div className="stop-capacity">
                      <span className="cap-reg">{pick.reg.toLocaleString()} registered</span>
                      <span className="cap-sep">·</span>
                      <span className={`cap-exp ${pick.isOverflow ? "cap-exp-over" : ""}`}>
                        {pick.expected} expected
                      </span>
                      {pick.room && (
                        <>
                          <span className="cap-sep">·</span>
                          <span className={`cap-seats ${pick.isOverflow ? "cap-seats-over" : ""}`}>
                            {pick.room.capacity} seats
                            {pick.isOverflow && ` (+${pick.expected - pick.room.capacity} short)`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="stop-status">
                    {pick.hasConflict
                      ? <span className="sstatus sstatus-conflict">⚡ Conflict</span>
                      : pick.isOverflow
                      ? <span className="sstatus sstatus-overflow">⛔ May not get in</span>
                      : <span className="sstatus sstatus-ok">✓ Good</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Issues ── */}
      {journey.issues.length > 0 && (
        <div className="journey-section">
          <h3 className="journey-section-title">Issues detected</h3>
          <div className="journey-issues">
            {journey.issues.map((issue, i) => (
              <div key={i} className={`jissue jissue-${issue.severity}`}>
                <div className="jissue-icon">{ISSUE_ICONS[issue.type] ?? "ℹ"}</div>
                <div className="jissue-body">
                  <div className="jissue-label">{issue.label}</div>
                  <div className="jissue-msg">{issue.msg}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All-clear state ── */}
      {journey.issues.length === 0 && journey.picks.length > 0 && (
        <div className="journey-all-clear">
          ✓ {persona.name.split(" ")[0]}'s day is conflict-free, every room fits the expected crowd,
          and the schedule has breathing room.
        </div>
      )}

      <p className="board-hint" style={{ marginTop: 16 }}>
        Fix sessions on the Agenda board — this view updates instantly to show the impact on real attendees.
      </p>
    </div>
  );
}
