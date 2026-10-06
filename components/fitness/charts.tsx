"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export function TrendChart({
  data,
  lines = [{ key: "score", color: "#668842", name: "Performance" }],
  height = 260,
}: {
  data: Record<string, any>[];
  lines?: { key: string; color: string; name: string }[];
  height?: number;
}) {
  return (
    <div
      style={{ height, width: "100%", minWidth: 0 }}
      role="img"
      aria-label="Performance trend. Exact values are available in the data table."
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 5"
            vertical={false}
            stroke="#e8ecee"
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#65717a" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(x) => x.slice(5)}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: "#65717a" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e3e8eb",
              fontSize: 14,
            }}
          />
          {lines.map((l) => (
            <Area
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.name}
              stroke={l.color}
              fill={l.color}
              fillOpacity={0.08}
              strokeWidth={2.5}
              connectNulls={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function UsageChart({ data }: { data: Record<string, any>[] }) {
  return (
    <div className="chart-wrap" role="img" aria-label="Sessions per day">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data}>
          <CartesianGrid vertical={false} stroke="#e8ecee" />
          <XAxis
            dataKey="date"
            tickFormatter={(x) => x.slice(5)}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={25}
          />
          <Tooltip />
          <Bar
            dataKey="sessions"
            name="Sessions"
            fill="#b7d95b"
            radius={[5, 5, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
