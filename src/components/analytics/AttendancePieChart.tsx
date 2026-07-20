// ============================================================
// components/analytics/AttendancePieChart.tsx
// Donut chart: Checked-in vs Not checked-in
// ============================================================
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { AttendanceStats } from '@/hooks/useAnalytics'

const RADIAN = Math.PI / 180

function CustomLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent, value, name,
}: any) {
  if (percent < 0.06) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x} y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight={700}
    >
      {value}
    </text>
  )
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const { name, value, payload: p } = payload[0]
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 shadow-lg text-sm">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.fill }} />
        <span className="font-medium text-surface-800 dark:text-surface-200">{name}</span>
      </div>
      <p className="text-lg font-bold text-surface-900 dark:text-surface-100 mt-0.5">{value} orang</p>
    </div>
  )
}

interface Props {
  stats:   AttendanceStats
  loading: boolean
}

export function AttendancePieChart({ stats, loading }: Props) {
  const data = [
    { name: 'Hadir',        value: stats.checkedIn,    fill: '#10b981' },
    { name: 'Belum Hadir',  value: stats.notCheckedIn, fill: '#f59e0b' },
  ].filter((d) => d.value > 0)

  return (
    <div className="flex flex-col h-full">
      {/* Centre percentage text */}
      <div className="flex items-center justify-center gap-4 mb-2">
        <div className="text-center">
          <p className="text-4xl font-black text-surface-900 dark:text-surface-100 tabular-nums">
            {loading ? '—' : `${stats.percentage}%`}
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wide">
            Tingkat Kehadiran
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-44 w-44 rounded-full bg-surface-100 dark:bg-surface-800 animate-pulse" />
        </div>
      ) : stats.total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-surface-400">
          Belum ada data undangan
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={CustomLabel}
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.fill}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-surface-600 dark:text-surface-400">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
