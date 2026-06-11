import { useMemo } from "react";
import {
  Chart, ChartSeries, ChartSeriesItem,
  ChartCategoryAxis, ChartCategoryAxisItem,
  ChartValueAxis, ChartValueAxisItem,
  ChartLegend, ChartTooltip, ChartTitle,
  ChartSeriesLabels,
} from "@progress/kendo-react-charts";
import { Grid, GridColumn, GridCustomCellProps } from "@progress/kendo-react-grid";
import { orderBy } from "@progress/kendo-data-query";
import "hammerjs";

// ── Kendo Grid custom cells ────────────────────────────────────

const UtilCell = (props: GridCustomCellProps) => {
  const pct: number  = props.dataItem?.pct ?? 0;
  const status: string = props.dataItem?.status ?? "empty";
  const barColor = status === "over" ? "#E5484D" : status === "near" ? "#F59E0B" : "#10B981";
  return (
    <td {...props.tdProps}>
      <div className="util-bar-wrap">
        <div
          className="util-bar-fill"
          style={{ width: `${Math.min(100, pct)}%`, background: barColor }}
        />
        {pct > 100 && (
          <div
            className="util-bar-over"
            style={{ width: `${Math.min(100, pct - 100)}%` }}
          />
        )}
      </div>
      <span className={`util-pct util-pct-${status}`}>{pct}%</span>
    </td>
  );
};

const RemainCell = (props: GridCustomCellProps) => {
  const rem: number   = props.dataItem?.remaining ?? 0;
  const status: string = props.dataItem?.status ?? "empty";
  if (status === "empty") return <td {...props.tdProps} style={{ color: "#C8C4D8" }}>—</td>;
  return (
    <td {...props.tdProps}>
      <span className={`remain-badge remain-${status}`}>
        {rem >= 0 ? `+${rem}` : rem}
      </span>
    </td>
  );
};

const SessionCell = (props: GridCustomCellProps) => {
  const title: string  = props.dataItem?.session ?? "";
  const status: string = props.dataItem?.status ?? "empty";
  if (status === "empty") return <td {...props.tdProps} style={{ color: "#C8C4D8", fontStyle: "italic" }}>Empty slot</td>;
  return (
    <td {...props.tdProps}>
      <div className="session-cell-title" title={title}>{title}</div>
      <div className="session-cell-speaker">{props.dataItem?.speaker}</div>
    </td>
  );
};

// ── Main component ─────────────────────────────────────────────

interface TableRow {
  room: string; roomColor: string; roomCap: number;
  slot: string; slotOrder: number;
  session: string; speaker: string;
  reg: number; expected: number; pct: number; remaining: number;
  status: "over" | "near" | "ok" | "empty";
}

type SessionLike = { id: string; title: string; speaker: string };

export default function DemandChart({ stats, data }) {
  const categories = data.slots.map((s) => s.label);
  const sessionById = useMemo(
    () => new Map<string, SessionLike>(
      data.sessions.map((s: SessionLike) => [s.id, s])
    ),
    [data.sessions]
  );

  // Chart series — utilization % per room per slot
  const series = data.rooms.map((room, i) => ({
    name: `${room.name} (${room.capacity} seats)`,
    color: room.color,
    values: stats.utilization[i].map((cell) => cell.pct),
  }));

  // Build tooltip lookup: slotIndex → roomIndex → session info
  const tooltipRender = ({ point }: any) => {
    if (!point) return null;
    const roomIndex = series.findIndex((s) => s.name === point.series.name);
    const slotIndex  = point.categoryIndex ?? 0;
    const cell       = stats.utilization[roomIndex]?.[slotIndex];
    const room       = data.rooms[roomIndex];
    const session    = cell?.sessionId ? sessionById.get(cell.sessionId) : null;
    const remaining  = room ? room.capacity - (cell?.expected ?? 0) : 0;

    return (
      <div className="chart-tt">
        <div className="chart-tt-room">{room?.name}</div>
        {session ? (
          <>
            <div className="chart-tt-session">{session.title}</div>
            <div className="chart-tt-speaker">{session.speaker}</div>
            <div className="chart-tt-row">
              <span>Registered</span>
              <strong>{(data.demand.get(session.id) || 0).toLocaleString()}</strong>
            </div>
            <div className="chart-tt-row">
              <span>Expected (80%)</span>
              <strong>{cell?.expected}</strong>
            </div>
            <div className="chart-tt-row">
              <span>Room capacity</span>
              <strong>{room?.capacity}</strong>
            </div>
            <div className={`chart-tt-rem ${remaining < 0 ? "chart-tt-over" : "chart-tt-ok"}`}>
              {remaining < 0
                ? `⛔  ${-remaining} seats short`
                : `✓  ${remaining} seats remaining`}
            </div>
          </>
        ) : (
          <div className="chart-tt-empty">Slot empty</div>
        )}
      </div>
    );
  };

  // ── Headline stats ────────────────────────────────────────────
  const allCells = stats.utilization.flat();
  const peakPct  = Math.max(0, ...allCells.map((c) => c.pct));
  const peakCell = allCells.find((c) => c.pct === peakPct);
  const peakRoom = peakCell
    ? data.rooms[stats.utilization.findIndex((row) => row.includes(peakCell))]
    : null;

  // ── Slot breakdown table rows ────────────────────────────────
  const tableRows = useMemo(
    () =>
      (orderBy(
        data.rooms.flatMap((room, ri) =>
          data.slots.map((slot, si) => {
            const cell    = stats.utilization[ri][si];
            const session = cell.sessionId ? sessionById.get(cell.sessionId) : null;
            const reg     = session ? (data.demand.get(session.id) || 0) : 0;
            const remaining = room.capacity - cell.expected;
            const status: TableRow["status"] = !session
              ? "empty"
              : remaining < 0
              ? "over"
              : cell.pct > 85
              ? "near"
              : "ok";
            return {
              room: room.name,
              roomColor: room.color,
              roomCap: room.capacity,
              slot: slot.label,
              slotOrder: si,
              session: session?.title ?? "",
              speaker: session?.speaker ?? "",
              reg,
              expected: cell.expected,
              pct: cell.pct,
              remaining,
              status,
            } satisfies TableRow;
          })
        ),
        [{ field: "status", dir: "asc" }, { field: "pct", dir: "desc" }]
      ) as TableRow[]),
    [stats.utilization, data, sessionById]
  );

  // Custom sort order: over first, near second, ok third, empty last
  const statusOrder: Record<TableRow["status"], number> = { over: 0, near: 1, ok: 2, empty: 3 };
  const sortedRows = [...tableRows].sort((a, b) =>
    statusOrder[a.status] - statusOrder[b.status] ||
    b.pct - a.pct
  );

  return (
    <div className="chart-wrap">

      {/* ── Headline stats ── */}
      <div className="dl-stats">
        <div className="dl-stat">
          <div className="dl-stat-value">{peakPct}%</div>
          <div className="dl-stat-label">Peak utilisation{peakRoom ? ` (${peakRoom.name})` : ""}</div>
        </div>
        <div className={`dl-stat ${stats.overflows.length > 0 ? "dl-stat-bad" : "dl-stat-good"}`}>
          <div className="dl-stat-value">{stats.overflows.length}</div>
          <div className="dl-stat-label">Slots over capacity</div>
        </div>
        <div className={`dl-stat ${stats.seatsShort > 0 ? "dl-stat-bad" : "dl-stat-good"}`}>
          <div className="dl-stat-value">{stats.seatsShort}</div>
          <div className="dl-stat-label">Total seats short</div>
        </div>
        <div className="dl-stat">
          <div className="dl-stat-value">
            {allCells.filter((c) => c.sessionId && c.pct > 85 && c.pct <= 100).length}
          </div>
          <div className="dl-stat-label">Slots near-full (&gt;85%)</div>
        </div>
      </div>

      {/* ── Overflow spotlight cards ── */}
      {stats.overflows.length > 0 && (
        <div className="overflow-cards">
          <div className="overflow-cards-title">⛔ Overflow — these sessions need a bigger room</div>
          <div className="overflow-cards-row">
            {stats.overflows.map((ov) => {
              const room = data.rooms.find((r) => r.id === ov.roomId);
              const mainHall = data.rooms.find((r) => r.id === "main");
              const wouldFit = mainHall && ov.expected <= mainHall.capacity;
              return (
                <div key={ov.sessionId} className="ov-card">
                  <div className="ov-card-title">{ov.title}</div>
                  <div className="ov-card-room">
                    {room?.name ?? ov.roomId} · slot {data.slots[ov.slot]?.label}
                  </div>
                  <div className="ov-numbers">
                    <div className="ov-num">
                      <span className="ov-num-val">{ov.expected}</span>
                      <span className="ov-num-label">expected</span>
                    </div>
                    <div className="ov-sep">vs</div>
                    <div className="ov-num">
                      <span className="ov-num-val ov-cap">{ov.capacity}</span>
                      <span className="ov-num-label">capacity</span>
                    </div>
                  </div>
                  <div className="ov-over">+{ov.over} seats short</div>
                  {wouldFit && (
                    <div className="ov-hint">
                      💡 Main Hall ({mainHall.capacity} seats) would fit this session
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bar chart ── */}
      <Chart style={{ height: 360 }}>
        <ChartTitle text="Utilisation % by room and time slot  —  red band = over capacity" font="14px Sora, sans-serif" />
        <ChartLegend position="bottom" />
        <ChartTooltip render={tooltipRender} />
        <ChartCategoryAxis>
          <ChartCategoryAxisItem categories={categories} />
        </ChartCategoryAxis>
        <ChartValueAxis>
          <ChartValueAxisItem
            title={{ text: "% of room capacity" }}
            max={Math.max(320, peakPct + 20)}
            plotBands={[{ from: 100, to: 9999, color: "#E5484D", opacity: 0.07 }]}
            majorGridLines={{ visible: true }}
            notes={{ data: [{ value: 100, label: { text: "100% full", color: "#E5484D" } }] }}
          />
        </ChartValueAxis>
        <ChartSeries>
          {series.map((s) => (
            <ChartSeriesItem
              key={s.name}
              type="column"
              name={s.name}
              color={s.color}
              data={s.values}
              opacity={0.88}
            />
          ))}
        </ChartSeries>
      </Chart>

      {/* ── Slot breakdown table ── */}
      <div className="dl-table-wrap">
        <div className="dl-table-title">Full slot breakdown — every room, every time slot</div>
        <Grid
          data={sortedRows}
          style={{ maxHeight: 400 }}
        >
          <GridColumn
            field="slot"
            title="Time"
            width="75px"
          />
          <GridColumn
            field="room"
            title="Room"
            width="140px"
            cells={{
              data: (props: GridCustomCellProps) => (
                <td {...props.tdProps} style={{ fontWeight: 600 }}>
                  <span
                    className="room-dot"
                    style={{ background: props.dataItem?.roomColor }}
                  />
                  {props.dataItem?.room}
                </td>
              ),
            }}
          />
          <GridColumn
            field="session"
            title="Session"
            width="240px"
            cells={{ data: SessionCell }}
          />
          <GridColumn field="reg"      title="Registered"    width="110px" />
          <GridColumn field="expected" title="Expected (80%)" width="125px" />
          <GridColumn field="roomCap"  title="Room cap"      width="90px"  />
          <GridColumn
            field="pct"
            title="Utilisation"
            width="160px"
            cells={{ data: UtilCell }}
          />
          <GridColumn
            field="remaining"
            title="Remaining seats"
            width="140px"
            cells={{ data: RemainCell }}
          />
        </Grid>
      </div>

      {/* ── Bottom callout ── */}
      {stats.overflows.length > 0 ? (
        <div className="chart-callout chart-callout-bad" style={{ marginTop: 12 }}>
          ⛔ {stats.overflows.length} session{stats.overflows.length > 1 ? "s" : ""} over
          capacity — {stats.seatsShort} total seats short across the event.
        </div>
      ) : (
        <div className="chart-callout chart-callout-good" style={{ marginTop: 12 }}>
          ✓ Every session fits its room. No one gets turned away at the door.
        </div>
      )}
    </div>
  );
}
