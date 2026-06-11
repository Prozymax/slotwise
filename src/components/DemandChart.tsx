import { Chart, ChartSeries, ChartSeriesItem, ChartCategoryAxis, ChartCategoryAxisItem, ChartValueAxis, ChartValueAxisItem, ChartLegend, ChartTooltip, ChartTitle } from "@progress/kendo-react-charts";
import "hammerjs";

export default function DemandChart({ stats, data }) {
  const categories = data.slots.map((s) => s.label);
  // stats.utilization: rows = rooms (same order as data.rooms), cols = slots, { pct }
  const series = data.rooms.map((room, i) => ({
    name: `${room.name} (${room.capacity})`,
    color: room.color,
    values: stats.utilization[i].map((cell) => cell.pct),
  }));

  return (
    <div className="chart-wrap">
      <Chart style={{ height: 420 }}>
        <ChartTitle text="Room load by time slot — anything above the 100% line turns people away at the door" />
        <ChartLegend position="bottom" />
        <ChartTooltip render={({ point }: any) => <span>{point?.series?.name}: {point?.value}% of capacity</span>} />
        <ChartCategoryAxis>
          <ChartCategoryAxisItem categories={categories} />
        </ChartCategoryAxis>
        <ChartValueAxis>
          <ChartValueAxisItem
            title={{ text: "% of room capacity" }}
            max={300}
            plotBands={[{ from: 100, to: 300, color: "#E5484D", opacity: 0.08 }]}
            majorGridLines={{ visible: true }}
          />
        </ChartValueAxis>
        <ChartSeries>
          {series.map((s) => (
            <ChartSeriesItem key={s.name} type="column" name={s.name} color={s.color} data={s.values} />
          ))}
        </ChartSeries>
      </Chart>
      {stats.overflows.length > 0 ? (
        <div className="chart-callout chart-callout-bad">
          ⛔ {stats.overflows.length} session{stats.overflows.length > 1 ? "s" : ""} over capacity — worst: “{stats.overflows[0].title}” needs {stats.overflows[0].expected} seats in a {stats.overflows[0].capacity}-seat room.
        </div>
      ) : (
        <div className="chart-callout chart-callout-good">✓ Every session fits its room. No one gets turned away at the door.</div>
      )}
    </div>
  );
}
