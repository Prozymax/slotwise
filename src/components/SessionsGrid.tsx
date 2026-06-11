import { useMemo, useState } from "react";
import { Grid, GridColumn } from "@progress/kendo-react-grid";
import { orderBy, SortDescriptor } from "@progress/kendo-data-query";
import { SLOTS } from "../data/seed.js";

export default function SessionsGrid({ assignments, stats, data }) {
  const [sort, setSort] = useState<SortDescriptor[]>([{ field: "demand", dir: "desc" }]);
  const overflowIds = useMemo(() => new Set(stats.overflows.map((o) => o.sessionId)), [stats]);

  const rows = useMemo(
    () =>
      data.sessions.map((s) => {
        const a = assignments[s.id];
        const room = a ? data.rooms.find((r) => r.id === a.roomId) : null;
        const demand = data.demand.get(s.id) || 0;
        const expected = Math.round(demand * 0.8);
        return {
          title: s.title,
          speaker: s.speaker,
          track: s.track,
          demand,
          expected,
          where: room ? `${room.name} @ ${SLOTS[a.slot].label}` : "Unscheduled",
          capacity: room?.capacity ?? 0,
          status: overflowIds.has(s.id) ? "⛔ Over capacity" : room && expected > room.capacity * 0.9 ? "△ Near capacity" : "✓ Fits",
        };
      }),
    [assignments, data, overflowIds]
  );

  return (
    <div className="grid-wrap">
      <Grid
        data={orderBy(rows, sort)}
        sortable={true}
        sort={sort}
        onSortChange={(e) => setSort(e.sort)}
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        <GridColumn field="title" title="Session" width="320px" />
        <GridColumn field="speaker" title="Speaker" width="170px" />
        <GridColumn field="track" title="Track" width="100px" />
        <GridColumn field="demand" title="Registered interest" width="160px" />
        <GridColumn field="expected" title="Expected (80% show)" width="170px" />
        <GridColumn field="where" title="Placement" width="190px" />
        <GridColumn field="capacity" title="Room cap" width="110px" />
        <GridColumn field="status" title="Status" width="150px" />
      </Grid>
      <p className="board-hint">Interest counts come straight from registration data — every attendee told us what they want to see.</p>
    </div>
  );
}
