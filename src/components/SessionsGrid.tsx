import { useMemo, useState } from "react";
import { Grid, GridColumn, GridCustomCellProps } from "@progress/kendo-react-grid";
import { orderBy, SortDescriptor } from "@progress/kendo-data-query";
import { SLOTS } from "../data/seed.js";

const StatusCell = (props: GridCustomCellProps) => {
  const s: string = props.dataItem?.status ?? "";
  const cls = s.startsWith("⛔")
    ? "status-badge status-overflow"
    : s.startsWith("△")
    ? "status-badge status-near"
    : "status-badge status-good";
  const label = s.startsWith("⛔") ? "Over capacity" : s.startsWith("△") ? "Near capacity" : "Fits";
  return (
    <td {...props.tdProps}>
      <span className={cls}>{label}</span>
    </td>
  );
};

const ClashCell = (props: GridCustomCellProps) => {
  const clashes: { title: string; count: number }[] = props.dataItem?.clashes ?? [];
  if (clashes.length === 0) {
    return <td {...props.tdProps} style={{ color: "#9B96B0" }}>—</td>;
  }
  return (
    <td {...props.tdProps}>
      <div className="clash-cell">
        {clashes.slice(0, 2).map((c, i) => (
          <span key={i} className="clash-pill">
            ⚡ {c.title.length > 20 ? c.title.substring(0, 20) + "…" : c.title}
            <span className="clash-count">{c.count}</span>
          </span>
        ))}
        {clashes.length > 2 && (
          <span className="clash-more">+{clashes.length - 2} more</span>
        )}
      </div>
    </td>
  );
};

const DemandCell = (props: GridCustomCellProps) => {
  const reg = props.dataItem?.demand ?? 0;
  const exp = props.dataItem?.expected ?? 0;
  return (
    <td {...props.tdProps}>
      <div className="demand-cell">
        <span className="demand-reg">{reg.toLocaleString()}</span>
        <span className="demand-exp">~{exp} show</span>
      </div>
    </td>
  );
};

export default function SessionsGrid({ assignments, stats, data }) {
  const [sort, setSort] = useState<SortDescriptor[]>([{ field: "demand", dir: "desc" }]);
  const overflowIds = useMemo(() => new Set(stats.overflows.map((o) => o.sessionId)), [stats]);

  // Build per-session clash partner lookup
  const clashesForSession = useMemo(() => {
    const map = new Map<string, { title: string; count: number }[]>();
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
      map.get(a)!.push({ title: titleB, count });
      map.get(b)!.push({ title: titleA, count });
    }
    for (const [, v] of map) v.sort((x, y) => y.count - x.count);
    return map;
  }, [stats.clashPairs, data.sessions]);

  const rows = useMemo(
    () =>
      data.sessions.map((s) => {
        const a    = assignments[s.id];
        const room = a ? data.rooms.find((r) => r.id === a.roomId) : null;
        const demand   = data.demand.get(s.id) || 0;
        const expected = Math.round(demand * 0.8);
        return {
          id: s.id,
          title: s.title,
          speaker: s.speaker,
          track: s.track,
          demand,
          expected,
          where: room ? `${room.name} @ ${SLOTS[a.slot].label}` : "Unscheduled",
          capacity: room?.capacity ?? 0,
          status: overflowIds.has(s.id)
            ? "⛔ Over capacity"
            : room && expected > room.capacity * 0.9
            ? "△ Near capacity"
            : "✓ Fits",
          clashes: clashesForSession.get(s.id) ?? [],
        };
      }),
    [assignments, data, overflowIds, clashesForSession]
  );

  return (
    <div className="grid-wrap">
      <Grid
        data={orderBy(rows, sort)}
        sortable
        sort={sort}
        onSortChange={(e) => setSort(e.sort)}
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        <GridColumn field="title"    title="Session"              width="260px" />
        <GridColumn field="speaker"  title="Speaker"              width="150px" />
        <GridColumn field="track"    title="Track"                width="90px"  />
        <GridColumn field="demand"   title="Registered / Expected" width="190px" cells={{ data: DemandCell }} />
        <GridColumn field="where"    title="Placement"            width="170px" />
        <GridColumn field="capacity" title="Room cap"             width="100px" />
        <GridColumn field="status"   title="Status"               width="130px" cells={{ data: StatusCell }} />
        <GridColumn field="clashes"  title="Clashes with"         width="280px" cells={{ data: ClashCell }} sortable={false} />
      </Grid>
      <p className="board-hint">
        Clash counts = number of attendees who registered for both sessions but can only attend one.
      </p>
    </div>
  );
}
