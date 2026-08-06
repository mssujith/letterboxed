import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Bin } from "../lib/stats";

const AXIS = "#9ab";
const GRID = "#2c3440";

type LabelFmt = (label: string | number) => string;

interface TipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string | number;
  labelFormatter?: LabelFmt;
}

function ChartTip({ active, payload, label, labelFormatter }: TipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value;
  const title = labelFormatter ? labelFormatter(label ?? "") : String(label ?? "");
  return (
    <div
      style={{
        background: "#1c2228",
        border: "1px solid #384250",
        borderRadius: 8,
        color: "#e4e7eb",
        fontSize: 13,
        padding: "6px 10px",
        boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{title}</div>
      <div style={{ color: "#9ab" }}>
        {value.toLocaleString()} film{value === 1 ? "" : "s"} &middot; click to view
      </div>
    </div>
  );
}

const cursorFill = { fill: "rgba(255,255,255,0.06)" };

function selectHandler(onSelect?: (label: string) => void) {
  return (state: { activeLabel?: string | number } | null) => {
    if (onSelect && state && state.activeLabel != null) onSelect(String(state.activeLabel));
  };
}

interface ChartProps {
  data: Bin[];
  height?: number;
  onSelect?: (label: string) => void;
}

export function VBar({
  data,
  height = 280,
  onSelect,
  showLabels = true,
}: ChartProps & { color?: string; showLabels?: boolean }) {
  return (
    <div style={{ cursor: onSelect ? "pointer" : "default" }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 22, right: 12, bottom: 4, left: -16 }} onClick={selectHandler(onSelect)}>
          <defs>
            <linearGradient id="vbarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff9d33" />
              <stop offset="100%" stopColor="#ff6a00" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" stroke={AXIS} tick={{ fontSize: 12 }} interval={0} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis stroke={AXIS} tick={{ fontSize: 11 }} allowDecimals={false} tickLine={false} axisLine={false} width={36} />
          <Tooltip content={<ChartTip />} cursor={cursorFill} />
          <Bar dataKey="value" fill="url(#vbarGrad)" radius={[5, 5, 0, 0]} maxBarSize={80}>
            {showLabels && <LabelList dataKey="value" position="top" fill="#e4e7eb" fontSize={12} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RatingBar({ data, height = 240, onSelect }: ChartProps) {
  const fmt: LabelFmt = (v) => `${v} stars`;
  return (
    <div style={{ cursor: onSelect ? "pointer" : "default" }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -18 }} onClick={selectHandler(onSelect)}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" stroke={AXIS} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}★`} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis stroke={AXIS} tick={{ fontSize: 11 }} allowDecimals={false} tickLine={false} axisLine={false} width={30} />
          <Tooltip content={<ChartTip labelFormatter={fmt} />} cursor={cursorFill} />
          <Bar dataKey="value" fill="#00e054" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TimeLine({ data, height = 240, onSelect }: ChartProps) {
  return (
    <div style={{ cursor: onSelect ? "pointer" : "default" }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: -18 }} onClick={selectHandler(onSelect)}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00e054" />
              <stop offset="100%" stopColor="#40bcf4" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" stroke={AXIS} tick={{ fontSize: 11 }} interval="preserveStartEnd" tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis stroke={AXIS} tick={{ fontSize: 11 }} allowDecimals={false} tickLine={false} axisLine={false} width={30} />
          <Tooltip content={<ChartTip />} cursor={{ stroke: "#9ab", strokeDasharray: "3 3" }} />
          <Line type="monotone" dataKey="value" stroke="url(#lineGrad)" strokeWidth={2.5} dot={{ r: 2.5, fill: "#00e054" }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const PALETTE = ["#00e054", "#40bcf4", "#ff8000", "#ff506a", "#b388ff", "#ffd54f", "#4dd0e1", "#a1887f"];

export function HBar({ data, height, onSelect }: ChartProps) {
  const h = height ?? Math.max(120, data.length * 28 + 20);
  return (
    <div style={{ cursor: onSelect ? "pointer" : "default" }}>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 8 }} onClick={selectHandler(onSelect)}>
          <XAxis type="number" stroke={AXIS} tick={{ fontSize: 11 }} allowDecimals={false} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="label" stroke={AXIS} tick={{ fontSize: 12 }} width={150} interval={0} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTip />} cursor={cursorFill} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            <LabelList dataKey="value" position="right" fill="#9ab" fontSize={11} />
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
