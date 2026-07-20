// ============================================================
// components/analytics/HourlyChart.tsx
// Area + Bar combo chart showing check-ins per hour
// ============================================================
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { HourlyDataPoint } from '@/hooks/useAnalytics'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2.5 shadow-lg text-sm min-w-[130px]">
      <p className="font-semibold text-surface-700 dark:text-surface-300 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name === 'count' ? 'Check-in' : 'Kumulatif'}
          </span>
          <span className="font-bold text-surface-900 dark:text-surface-100">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  data:    HourlyDataPoint[]
  loading: boolean
}

export function HourlyChart({ data, loading }: Props) {
  const now        = new Date().getHours()
  const hasData    = data.some((d) => d.count > 0)

  // Only show hours with data + a few before/after for context
  const firstActive = data.findIndex((d) => d.count > 0)
  const lastActive  = [...data].reverse().findIndex((d) => d.count > 0)
  const start = Math.max(0,  firstActive === -1 ? 6  : firstActive  - 1)
  const end   = Math.min(23, lastActive  === -1 ? 22 : 23 - lastActive + 1)
  const visible = hasData ? data.slice(start, end + 1) : data.slice(6, 23)

  if (loading) {
    return (
      <div className="flex h-[260px] items-end gap-1 px-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            style={{ height: `${20 + Math.random() * 60}%` }}
            className="flex-1 rounded-t-md bg-surface-100 dark:bg-surface-800 animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={visible} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-surface-100 dark:text-surface-800"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'currentColor' }}
          className="text-surface-400 dark:text-surface-500"
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'currentColor' }}
          className="text-surface-400 dark:text-surface-500"
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />

        {/* Cumulative area */}
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#areaGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
          animationDuration={800}
        />

        {/* Per-hour bars */}
        <Bar
          dataKey="count"
          fill="#10b981"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          animationDuration={600}
        />

        {/* "Now" marker */}
        {hasData && (
          <ReferenceLine
            x={`${String(now).padStart(2, '0')}:00`}
            stroke="#f59e0b"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{
              value: 'Sekarang',
              position: 'insideTopRight',
              fontSize: 10,
              fill: '#f59e0b',
            }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
