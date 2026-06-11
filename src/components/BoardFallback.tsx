// ─────────────────────────────────────────────────────────────
// FALLBACK BOARD — native HTML5 drag & drop, identical props to
// SchedulerBoard. Guaranteed to work. Rooms = rows, slots = columns,
// every card shows demand vs capacity, red = overflow, amber = clash.
// If you ship this instead of the Kendo Scheduler, Kendo still powers
// Tabs, Grid, Charts and Notifications — call that out in the writeup.
// ─────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";

export default function BoardFallback({ assignments, stats, data, onMove }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null); // "roomId:slot"

  const overflowIds = useMemo(() => new Set(stats.overflows.map((o) => o.sessionId)), [stats]);
  const clashIds = useMemo(() => {
    const ids = new Set<string>();
    if (stats.worstPair && stats.worstPair.count > 40) { ids.add(stats.worstPair.a); ids.add(stats.worstPair.b); }
    return ids;
  }, [stats]);

  const cellSession = (roomId: string, slot: number) =>
    data.sessions.find((s) => assignments[s.id]?.roomId === roomId && assignments[s.id]?.slot === slot);

  return (
    <div className="fb-board">
      <div className="fb-grid" style={{ gridTemplateColumns: `150px repeat(${data.slots.length}, 1fr)` }}>
        <div className="fb-corner" />
        {data.slots.map((sl) => (
          <div key={sl.label} className="fb-slot-head">{sl.label}</div>
        ))}
        {data.rooms.map((room) => (
          <RoomRow
            key={room.id}
            room={room}
            slots={data.slots}
            cellSession={cellSession}
            demand={data.demand}
            overflowIds={overflowIds}
            clashIds={clashIds}
            dragId={dragId}
            hover={hover}
            setDragId={setDragId}
            setHover={setHover}
            onMove={onMove}
          />
        ))}
      </div>
      <p className="board-hint">Drag a session card to any cell — drop on an occupied cell to swap. Scores update instantly.</p>
    </div>
  );
}

function RoomRow({ room, slots, cellSession, demand, overflowIds, clashIds, dragId, hover, setDragId, setHover, onMove }) {
  return (
    <>
      <div className="fb-room-head">
        <div className="fb-room-name">{room.name}</div>
        <div className="fb-room-cap">{room.capacity} seats</div>
      </div>
      {slots.map((_, slot) => {
        const s = cellSession(room.id, slot);
        const key = `${room.id}:${slot}`;
        const isHover = hover === key;
        return (
          <div
            key={key}
            className={`fb-cell ${isHover ? "fb-cell-hover" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setHover(key); }}
            onDragLeave={() => setHover((h) => (h === key ? null : h))}
            onDrop={(e) => {
              e.preventDefault();
              setHover(null);
              if (dragId) onMove(dragId, room.id, slot);
              setDragId(null);
            }}
          >
            {s ? (
              <div
                className={`fb-card track-${s.track.toLowerCase()} ${overflowIds.has(s.id) ? "fb-overflow" : ""} ${clashIds.has(s.id) ? "fb-clash" : ""} ${dragId === s.id ? "fb-dragging" : ""}`}
                draggable
                onDragStart={() => setDragId(s.id)}
                onDragEnd={() => { setDragId(null); setHover(null); }}
                title={`${s.title} — ${s.speaker}`}
              >
                <div className="fb-card-title">{s.title}</div>
                <div className="fb-card-meta">{s.speaker}</div>
                <div className="fb-card-foot">
                  <span className="fb-track">{s.track}</span>
                  <span className={`fb-load ${Math.round((demand.get(s.id) || 0) * 0.8) > room.capacity ? "fb-load-over" : ""}`}>
                    ~{Math.round((demand.get(s.id) || 0) * 0.8)}/{room.capacity}
                  </span>
                </div>
                {overflowIds.has(s.id) && <div className="fb-flag">⛔ over capacity</div>}
                {clashIds.has(s.id) && <div className="fb-flag fb-flag-clash">⚡ worst clash</div>}
              </div>
            ) : (
              <div className="fb-empty">free</div>
            )}
          </div>
        );
      })}
    </>
  );
}
