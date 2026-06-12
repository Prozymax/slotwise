import { useMemo, useCallback } from "react";
import { Scheduler, DayView } from "@progress/kendo-react-scheduler";
import { SLOTS, EVENT } from "../data/seed.js";
import RoomCapacityPanel from "./RoomCapacityPanel";

const SLOT_MS = 60 * 60 * 1000;

function slotToDate(slot: number) {
  const d = new Date(EVENT.date);
  d.setHours(SLOTS[slot].hour, 0, 0, 0);
  return d;
}
function dateToSlot(date: Date): number {
  const h = date.getHours();
  const idx = SLOTS.findIndex((s) => s.hour === h);
  return idx;
}

export default function SchedulerBoard({ assignments, stats, data, onMove }) {
  const overflowIds = useMemo(() => new Set(stats.overflows.map((o) => o.sessionId)), [stats]);
  const clashIds = useMemo(() => {
    const ids = new Set<string>();
    if (stats.worstPair) { ids.add(stats.worstPair.a); ids.add(stats.worstPair.b); }
    return ids;
  }, [stats]);

  const items = useMemo(
    () =>
      data.sessions
        .filter((s) => assignments[s.id])
        .map((s) => {
          const a        = assignments[s.id];
          const reg      = data.demand.get(s.id) || 0;
          const expected = Math.round(reg * 0.8);
          const room     = data.rooms.find((r) => r.id === a.roomId);
          const remaining = room ? room.capacity - expected : 0;
          const capacityNote = remaining < 0
            ? `  ⛔ ${-remaining} over`
            : `  ${remaining} left`;
          const flags = [
            overflowIds.has(s.id) ? "⛔ overflow" : "",
            clashIds.has(s.id)    ? "⚡ clash"    : "",
          ].filter(Boolean).join(" ");
          return {
            id: s.id,
            title: `${s.title}${flags ? "  " + flags : ""}`,
            description: `${s.speaker} · ${reg} registered · ${expected} expected${capacityNote}`,
            start: slotToDate(a.slot),
            end: new Date(slotToDate(a.slot).getTime() + SLOT_MS),
            roomId: a.roomId,
            isAllDay: false,
          };
        }),
    [assignments, data, overflowIds, clashIds]
  );

  const resources = useMemo(
    () => [
      {
        name: "Rooms",
        data: data.rooms.map((r) => ({
          text:  `${r.name} · ${r.capacity} seats`,
          value: r.id,
          color: r.color,
        })),
        field: "roomId", valueField: "value", textField: "text", colorField: "color",
      },
    ],
    [data.rooms]
  );

  const handleDataChange = useCallback(
    ({ updated }) => {
      if (!updated || updated.length === 0) return;
      const item = updated[0];
      const slot = dateToSlot(new Date(item.start));
      if (slot === -1) return;
      onMove(item.id, item.roomId, slot);
    },
    [onMove]
  );

  return (
    <div className="board-layout-horizontal">
      <div className="board-sidebar">
        <RoomCapacityPanel
          rooms={data.rooms}
          slots={data.slots}
          utilization={stats.utilization}
        />
      </div>
      <div className="board-main">
        <div className="board-wrap">
          <Scheduler
            data={items}
            defaultDate={EVENT.date}
            editable={{ add: false, remove: false, drag: true, resize: false, edit: false, select: false }}
            onDataChange={handleDataChange}
            group={{ resources: ["Rooms"], orientation: "vertical" }}
            resources={resources}
            height={"calc(100vh - 280px)"}
          >
            <DayView
              workDayStart="09:00"
              workDayEnd="17:00"
              slotDuration={60}
              slotDivisions={1}
              showWorkHours={true}
            />
          </Scheduler>
          <p className="board-hint">
            Drag a session to a new room or time — clash and capacity scores update instantly.
            12:00 is lunch and cannot be booked.
          </p>
        </div>
      </div>
    </div>
  );
}
