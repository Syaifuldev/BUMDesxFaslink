// ============================================================
// components/analytics/CategoryChart.tsx
// Horizontal bar chart showing attendance rate per category
// ============================================================
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import type { CategoryDataPoint } from '@/hooks/useAnalytics'

const CATEGORY_COLORS: Record<string, string> = {
  general:  '#6366f1',
  vip:      '#f59e0b',
  speaker:  '#10b981',
  sponsor:  '#3b82f6',
  staff:    '#8b5cf6',
  media:    '#ec4899',
  press:    '#14b8a6',
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Umum',
  vip:     'VIP',
  speaker: 'Pembicara',
  sponsor: 'Sponsor',
  staff:   'Panitia',
  media:   'Media',
  press:   'Pers',
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as CategoryDataPoint
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2.5 shadow-lg text-sm">
      <p className="font-semibold text-surface-800 dark:text-surface-200 mb-1">
        {CATEGORY_LABELS[label] ?? label}
      </p>
      <div className="space-y-0.5 text-xs text-surface-500 dark:text-surface-400">
        <div className="flex justify-between gap-4">
          <span>Total undangan</span>
          <span className="font-bold text-surface-800 dark:text-surface-200">{d.count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Hadir</span>
          <span className="font-bold text-green-600 dark:text-green-400">{d.checkedIn}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Kehadiran</span>
          <span className="font-bold text-primary-600 dark:text-primary-400">{d.rate}%</span>
        </div>
      </div>
    </div>
  )
}

interface Props {
  data:    CategoryDataPoint[]
  loading: boolean
}

export function CategoryChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3 p-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-16 h-3 rounded bg-surface-100 dark:bg-surface-800 animate-pulse shrink-0" />
            <div
              className="h-6 rounded-md bg-surface-100 dark:bg-surface-800 animate-pulse"
              style={{ width: `${40 + i * 15}%` }}
            />
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-surface-400">
        Belum ada data
      </div>
    )
  }

  const display = data
    .map((d) => ({ ...d, label: CATEGORY_LABELS[d.category] ?? d.category }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, display.length * 48)}>
      <BarChart
        data={display}
        layout="vertical"
        margin={{ top: 0, right: 60, left: 4, bottom: 0 }}
        barCategoryGap="25%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-surface-100 dark:text-surface-800"
          horizontal={false}
        />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: 'currentColor' }}
          className="text-surface-400"
          tickFormatter={(v) => `${v}%`}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: 'currentColor' }}
          className="text-surface-600 dark:text-surface-400"
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
        <Bar
          dataKey="rate"
          radius={[0, 6, 6, 0]}
          maxBarSize={28}
          animationDuration={700}
        >
          {display.map((entry, i) => (
            <Cell
              key={i}
              fill={CATEGORY_COLORS[entry.category] ?? '#6366f1'}
            />
          ))}
          <LabelList
            dataKey="rate"
            position="right"
            formatter={(v: unknown) => `${v}%`}
            style={{ fontSize: 11, fontWeight: 600, fill: 'currentColor' }}
            className="text-surface-600 dark:text-surface-400"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
