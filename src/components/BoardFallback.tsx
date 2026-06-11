import { Fragment, useMemo, useState } from "react";
import RoomCapacityPanel from "./RoomCapacityPanel";

export default function BoardFallback({ assignments, stats, data, onMove }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [hover, setHover]   = useState<string | null>(null);

  const overflowIds = useMemo(
    () => new Set(stats.overflows.map((o) => o.sessionId)),
    [stats]
  );

  const clashPartners = useMemo(() => {
    const map = new Map<string, { partnerId: string; partnerTitle: string; count: number }[]>();
    if (!stats.clashPairs) return map;
    const sessionById = new Map<string, { id: string; title: string }>(
      data.sessions.map((s: { id: string; title: string }) => [s.id, s])
    );
    for (const [key, count] of stats.clashPairs as Map<string, number>) {
      const [a, b] = key.split("|");
      const titleA = sessionById.get(a)?.title ?? a;
      const titleB = sessionById.get(b)?.title ?? b;
      if (!map.has(a)) map.set(a, []);
      if (!map.has(b)) map.set(b, []);
      map.get(a)!.push({ partnerId: b, partnerTitle: titleB, count });
      map.get(b)!.push({ partnerId: a, partnerTitle: titleA, count });
    }
    for (const [, v] of map) v.sort((x, y) => y.count - x.count);
    return map;
  }, [stats.clashPairs, data.sessions]);

  const cellSession = (roomId: string, slot: number) =>
    data.sessions.find(
      (s) => assignments[s.id]?.roomId === roomId && assignments[s.id]?.slot === slot
    );

  return (
    <div className="fb-board">
      <RoomCapacityPanel
        rooms={data.rooms}
        slots={data.slots}
        utilization={stats.utilization}
      />

      {/* Standard calendar: rooms = columns, time = rows */}
      <div
        className="fb-cal"
        style={{ gridTemplateColumns: `64px repeat(${data.rooms.length}, 1fr)` }}
      >
        {/* ── Header row: corner + room names ── */}
        <div className="fb-cal-corner" />
        {data.rooms.map((room) => (
          <div key={room.id} className="fb-cal-room-head">
            <span className="fb-cal-room-bar" style={{ background: room.color }} />
            <span className="fb-cal-room-name">{room.name}</span>
            <span className="fb-cal-room-cap">{room.capacity} seats</span>
          </div>
        ))}

        {/* ── Time rows ── */}
        {data.slots.map((slot, si) => (
          <Fragment key={si}>
            <div className="fb-cal-time">{slot.label}</div>

            {data.rooms.map((room, ri) => {
              const s    = cellSession(room.id, si);
              const key  = `${room.id}:${si}`;
              const util = stats.utilization[ri][si];
              const remaining = room.capacity - (util?.expected ?? 0);

              return (
                <div
                  key={key}
                  className={`fb-cal-cell ${hover === key ? "fb-cal-hover" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setHover(key); }}
                  onDragLeave={() => setHover((h) => (h === key ? null : h))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setHover(null);
                    if (dragId) onMove(dragId, room.id, si);
                    setDragId(null);
                  }}
                >
                  {s ? (
                    <SessionCard
                      session={s}
                      room={room}
                      demand={data.demand}
                      overflowIds={overflowIds}
                      clashPartners={clashPartners}
                      remaining={remaining}
                      dragId={dragId}
                      setDragId={setDragId}
                      setHover={setHover}
                    />
                  ) : (
                    <div className="fb-cal-empty" />
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>

      <p className="board-hint" style={{ color: "rgba(255,255,255,0.28)", marginTop: 10 }}>
        Drag a session to any cell — drop on an occupied cell to swap. Scores update instantly.
      </p>
    </div>
  );
}

function SessionCard({ session: s, room, demand, overflowIds, clashPartners, remaining, dragId, setDragId, setHover }) {
  const reg      = demand.get(s.id) || 0;
  const expected = Math.round(reg * 0.8);
  const isOver   = overflowIds.has(s.id);
  const partners = clashPartners.get(s.id) ?? [];
  const topClash = partners[0] ?? null;
  const fillPct  = Math.min(100, Math.round((expected / room.capacity) * 100));

  return (
    <div
      className={`fb-card track-${s.track.toLowerCase()} ${isOver ? "fb-overflow" : ""} ${topClash ? "fb-clash" : ""} ${dragId === s.id ? "fb-dragging" : ""}`}
      draggable
      onDragStart={() => setDragId(s.id)}
      onDragEnd={() => { setDragId(null); setHover(null); }}
      title={`${s.title} — ${s.speaker}`}
    >
      <div className="fb-card-title">{s.title}</div>
      <div className="fb-card-meta">{s.speaker}</div>

      <div className="fb-card-demand">
        <span className="fb-reg">{reg.toLocaleString()} reg</span>
        <span className={`fb-exp ${isOver ? "fb-exp-over" : ""}`}>{expected} exp</span>
      </div>

      <div className={`fb-cap-bar ${isOver ? "fb-cap-bar-over" : ""}`}>
        <div className="fb-cap-fill" style={{ width: `${fillPct}%` }} />
      </div>

      <div className={`fb-rem ${isOver ? "fb-rem-over" : remaining < 20 ? "fb-rem-warn" : "fb-rem-ok"}`}>
        {isOver ? `⛔ ${-remaining} over` : `${remaining} seats left`}
      </div>

      {topClash && (
        <div className="fb-flag fb-flag-clash">
          ⚡ {topClash.partnerTitle.length > 20
            ? topClash.partnerTitle.substring(0, 20) + "…"
            : topClash.partnerTitle} ({topClash.count})
        </div>
      )}
      {isOver && !topClash && <div className="fb-flag">⛔ over capacity</div>}
    </div>
  );
}
