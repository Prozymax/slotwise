/**
 * Per-room capacity strip shown above both board views.
 * Each room card shows a slot-by-slot pip row + worst-case summary.
 */
export default function RoomCapacityPanel({ rooms, slots, utilization }) {
  return (
    <div className="rcp-strip">
      {rooms.map((room, ri) => {
        const slotStats: Array<{ sessionId: string | null; expected: number; capacity: number; pct: number }> =
          utilization[ri];
        const occupied = slotStats.filter((s) => s.sessionId);
        const worstOver = Math.max(0, ...occupied.map((s) => s.expected - room.capacity));
        const minRemaining =
          occupied.length === 0
            ? room.capacity
            : Math.min(...occupied.map((s) => room.capacity - s.expected));

        return (
          <div key={room.id} className={`rcp-room ${worstOver > 0 ? "rcp-room-over" : ""}`}>
            {/* Room name + colour dot */}
            <div className="rcp-name">
              <span className="rcp-color-dot" style={{ background: room.color }} />
              {room.name}
            </div>
            <div className="rcp-seats">{room.capacity} seats</div>

            {/* Per-slot coloured pips */}
            <div className="rcp-pips">
              {slotStats.map((s, si) => (
                <div
                  key={si}
                  className={`rcp-pip ${
                    !s.sessionId
                      ? "rcp-pip-empty"
                      : s.expected > room.capacity
                      ? "rcp-pip-over"
                      : s.pct > 85
                      ? "rcp-pip-warn"
                      : "rcp-pip-ok"
                  }`}
                  title={`${slots[si].label}: ${s.sessionId ? `${s.expected} expected / ${room.capacity} cap (${s.pct}%)` : "empty"}`}
                />
              ))}
            </div>

            {/* Worst-case summary line */}
            <div className={`rcp-summary ${worstOver > 0 ? "rcp-sum-over" : minRemaining < 20 ? "rcp-sum-warn" : "rcp-sum-ok"}`}>
              {worstOver > 0
                ? `⛔ ${worstOver} over at peak`
                : occupied.length === 0
                ? "All slots free"
                : `${minRemaining} seats left (min)`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
