import { useMemo, useState } from "react";
import { computeJourney } from "../engine/journey.js";
import { PERSONAS } from "../data/personas.js";

type Persona  = (typeof PERSONAS)[0];
type Filter   = "all" | "issues" | "clear";
type Journey  = ReturnType<typeof computeJourney>;

const ISSUE_ICONS: Record<string, string> = {
  conflict: "⚡", overflow: "⛔", fatigue: "🔋", gap: "💬",
};

// ── Right panel: full journey detail ──────────────────────────
function JourneyDetail({ persona, journey }: { persona: Persona; journey: Journey }) {
  const errorCount = journey.issues.filter(i => i.severity === "error").length;
  const warnCount  = journey.issues.filter(i => i.severity === "warn").length;
  const hasProblems = errorCount + warnCount > 0;

  return (
    <div className="jdetail-wrap">
      {/* Persona header */}
      <div className={`jdetail-header ${hasProblems ? "jheader-issues" : "jheader-clear"}`}>
        <div className="jdetail-avatar">{persona.avatar}</div>
        <div className="jdetail-info">
          <div className="jdetail-name">{persona.name}</div>
          <div className="jdetail-role">{persona.role}</div>
          <div className="journey-tags">
            {persona.interests.map(t => <span key={t} className="journey-tag">{t}</span>)}
          </div>
        </div>
        <div className={`journey-badge ${
          errorCount > 0 ? "jbadge-error" : warnCount > 0 ? "jbadge-warn" : "jbadge-ok"
        }`}>
          {errorCount > 0
            ? `${errorCount} conflict${errorCount > 1 ? "s" : ""}`
            : warnCount > 0 ? `${warnCount} warning` : "✓ All clear"}
        </div>
      </div>

      {/* Timeline */}
      <div className="journey-section">
        <h3 className="journey-section-title">
          {persona.name.split(" ")[0]}'s Conference Day
        </h3>
        <div className="journey-timeline">
          {journey.picks.length === 0 && (
            <p className="journey-empty">
              None of {persona.name.split(" ")[0]}'s sessions are scheduled yet.
            </p>
          )}
          {journey.picks.map((pick, i) => {
            const prev = i > 0 ? journey.picks[i - 1] : null;
            const gapBefore = prev?.slot != null && pick.slot != null
              ? pick.slot - prev.slot - 1 : 0;
            return (
              <div key={pick.sessionId}>
                {gapBefore >= 2 && (
                  <div className="journey-gap-marker">
                    <span className="gap-line" />
                    <span className="gap-text">
                      💬 {gapBefore} free slot{gapBefore > 1 ? "s" : ""} — networking window
                    </span>
                    <span className="gap-line" />
                  </div>
                )}
                <div className={`journey-stop ${
                  pick.hasConflict ? "stop-conflict" : pick.isOverflow ? "stop-overflow" : "stop-ok"
                }`}>
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

      {/* Issues */}
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

      {journey.issues.length === 0 && journey.picks.length > 0 && (
        <div className="journey-all-clear">
          ✓ {persona.name.split(" ")[0]}'s day is conflict-free, every room fits the
          expected crowd, and the schedule has breathing room.
        </div>
      )}

      <p className="board-hint" style={{ marginTop: 16 }}>
        Fix sessions on the Agenda board — this view updates instantly.
      </p>
    </div>
  );
}

// ── Main layout ────────────────────────────────────────────────
export default function JourneyView({ assignments, data }) {
  const [selected, setSelected] = useState<Persona>(PERSONAS[0]);
  const [filter, setFilter]     = useState<Filter>("all");

  // Compute all journeys at once (5 pure fn calls — negligible)
  const allJourneys = useMemo(
    () => PERSONAS.map(p => ({
      persona: p,
      journey: computeJourney(p, assignments, data.sessions, data.slots, data.demand, data.rooms),
    })),
    [assignments, data]
  );

  const issueCount = allJourneys.filter(
    j => j.journey.issues.some(i => i.severity === "error")
  ).length;
  const clearCount = allJourneys.length - issueCount;

  const filtered = allJourneys.filter(({ journey }) => {
    const hasErrors = journey.issues.some(i => i.severity === "error");
    if (filter === "issues") return hasErrors;
    if (filter === "clear")  return !hasErrors;
    return true;
  });

  const selectedEntry = allJourneys.find(j => j.persona.id === selected.id);

  return (
    <div className="journey-layout">

      {/* ── Left sidebar ── */}
      <div className="journey-sidebar">

        {/* Conflict filter */}
        <div className="journey-filter">
          <span className="jfilter-label">Filter</span>
          <div className="jfilter-pills">
            {([
              ["all",    `All (${allJourneys.length})`],
              ["issues", `Conflicts (${issueCount})`],
              ["clear",  `Clear (${clearCount})`],
            ] as [Filter, string][]).map(([key, label]) => (
              <button
                key={key}
                className={`jfilter-btn ${filter === key ? "jfilter-active" : ""}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Persona list */}
        <div className="journey-persona-list">
          {filtered.length === 0 && (
            <p className="jlist-empty">No delegates match this filter.</p>
          )}
          {filtered.map(({ persona, journey }) => {
            const errors = journey.issues.filter(i => i.severity === "error").length;
            const warns  = journey.issues.filter(i => i.severity === "warn").length;
            const infos  = journey.issues.filter(i => i.severity === "info").length;
            const isActive = selected.id === persona.id;
            return (
              <button
                key={persona.id}
                className={`jlist-item ${isActive ? "jlist-active" : ""}`}
                onClick={() => setSelected(persona)}
              >
                <div className="jlist-avatar">{persona.avatar}</div>
                <div className="jlist-info">
                  <div className="jlist-name">{persona.name}</div>
                  <div className="jlist-role">{persona.role}</div>
                  <div className="jlist-badges">
                    {errors > 0 && (
                      <span className="jlist-badge jlbadge-error">
                        ⚡ {errors} conflict{errors > 1 ? "s" : ""}
                      </span>
                    )}
                    {warns > 0 && (
                      <span className="jlist-badge jlbadge-warn">
                        🔋 fatigue
                      </span>
                    )}
                    {errors === 0 && warns === 0 && infos > 0 && (
                      <span className="jlist-badge jlbadge-info">
                        💬 {infos} window{infos > 1 ? "s" : ""}
                      </span>
                    )}
                    {errors === 0 && warns === 0 && (
                      <span className="jlist-badge jlbadge-ok">✓ Clear</span>
                    )}
                  </div>
                </div>
                {isActive && <div className="jlist-arrow">›</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right detail panel ── */}
      <div className="journey-detail">
        {selectedEntry
          ? <JourneyDetail persona={selectedEntry.persona} journey={selectedEntry.journey} />
          : <p className="journey-empty" style={{ padding: 24 }}>Select a delegate on the left.</p>
        }
      </div>
    </div>
  );
}
