import { useState, useEffect, useCallback } from 'react'
import {
  Users, UserCheck, UserX, BarChart3, RefreshCw,
  ChevronDown, Wifi, WifiOff, Clock, Building2,
  Activity, Zap, TableProperties,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/analytics/StatCard'
import { AttendancePieChart } from '@/components/analytics/AttendancePieChart'
import { HourlyChart } from '@/components/analytics/HourlyChart'
import { CategoryChart } from '@/components/analytics/CategoryChart'
import { useEvents } from '@/hooks/useEvents'
import { useAnalytics } from '@/hooks/useAnalytics'
import { formatDateTime, cn } from '@/lib/utils'
import type { RecentCheckinView } from '@/types/database'

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const METHOD_LABEL: Record<string, { label: string; color: string }> = {
  qr:     { label: 'QR',     color: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' },
  manual: { label: 'Manual', color: 'bg-amber-100  dark:bg-amber-900/30  text-amber-700  dark:text-amber-400'  },
  kiosk:  { label: 'Kiosk',  color: 'bg-teal-100   dark:bg-teal-900/30   text-teal-700   dark:text-teal-400'   },
  api:    { label: 'API',    color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400' },
}

const CATEGORY_EMOJI: Record<string, string> = {
  general: '👤', vip: '⭐', speaker: '🎤',
  sponsor: '💼', staff: '🛡️', media: '📸', press: '📰',
}

function LiveIndicator({ live }: { live: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn(
        'h-2 w-2 rounded-full',
        live ? 'bg-green-500 animate-pulse' : 'bg-surface-300 dark:bg-surface-600',
      )} />
      <span className="text-xs text-surface-400 dark:text-surface-500">
        {live ? 'Realtime' : 'Offline'}
      </span>
    </div>
  )
}

function CheckinRow({ item, index }: { item: RecentCheckinView; index: number }) {
  const method = METHOD_LABEL[item.method] ?? { label: item.method, color: '' }
  const initials = item.guest_name
    ?.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() ?? '?'

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        'border-b border-surface-50 dark:border-surface-800/60 last:border-0',
        'hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors',
        index === 0 && 'bg-green-50/40 dark:bg-green-900/10',
      )}
    >
      {/* Avatar */}
      <div className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
        index === 0
          ? 'bg-green-500 text-white ring-2 ring-green-300 dark:ring-green-700'
          : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
      )}>
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">
            {item.guest_name}
          </p>
          {item.category && item.category !== 'general' && (
            <span className="text-xs">{CATEGORY_EMOJI[item.category]}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {item.company && (
            <span className="flex items-center gap-0.5 text-xs text-surface-400 dark:text-surface-500 truncate max-w-[120px]">
              <Building2 className="h-3 w-3 shrink-0" />
              {item.company}
            </span>
          )}
          {(item.table_number || item.seat_number) && (
            <span className="flex items-center gap-0.5 text-xs text-surface-400 dark:text-surface-500">
              <TableProperties className="h-3 w-3 shrink-0" />
              {item.table_number && `M${item.table_number}`}
              {item.table_number && item.seat_number && '·'}
              {item.seat_number && `K${item.seat_number}`}
            </span>
          )}
        </div>
      </div>

      {/* Right: time + method */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn('px-1.5 py-0.5 rounded-md text-[10px] font-semibold', method.color)}>
          {method.label}
        </span>
        <span className="flex items-center gap-0.5 text-[11px] text-surface-400 dark:text-surface-500">
          <Clock className="h-3 w-3" />
          {formatDateTime(item.checked_in_at)}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { events, loading: eventsLoading } = useEvents()
  const [selectedEventId, setSelectedEventId] = useState('')
  const [realtimeConnected, setRealtimeConnected] = useState(true)

  // Auto-select first active event
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      const active =
        events.find((e) => (e as any).status === 'active' || (e as any).status === 'published')
        ?? events[0]
      setSelectedEventId(active.id)
    }
  }, [events, selectedEventId])

  const {
    stats, hourly, byCategory, recentCheckins,
    loading, error, lastUpdated, refetch,
  } = useAnalytics(selectedEventId)

  const selectedEvent = events.find((e) => e.id === selectedEventId)
  const eventName     = (selectedEvent as any)?.title ?? (selectedEvent as any)?.name ?? ''

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <AppLayout title="Analytics">
      <div className="space-y-6 pb-10">

        {/* ── HEADER ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
              Analytics
            </h1>
            {lastUpdated && (
              <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5 flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Diperbarui {formatDateTime(lastUpdated.toISOString())}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <LiveIndicator live={realtimeConnected} />

            {/* Refresh */}
            <button
              onClick={() => refetch()}
              disabled={loading}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                'border-surface-200 dark:border-surface-700',
                'text-surface-400 hover:text-surface-700 dark:hover:text-surface-200',
                'hover:bg-surface-50 dark:hover:bg-surface-800',
                loading && 'opacity-50 cursor-not-allowed',
              )}
              title="Refresh data"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>

            {/* Event selector */}
            <div className="relative">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                disabled={loading}
                className={cn(
                  'appearance-none rounded-xl border pl-3 pr-8 py-2 text-sm font-medium',
                  'bg-white dark:bg-surface-900',
                  'border-surface-200 dark:border-surface-700',
                  'text-surface-800 dark:text-surface-200',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500',
                  'shadow-sm cursor-pointer',
                  'disabled:opacity-50',
                )}
              >
                <option value="">— Pilih Acara —</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {(e as any).title ?? (e as any).name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── STATS GRID ─────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Undangan"
            value={loading ? '…' : stats.total.toLocaleString('id-ID')}
            subtitle="Terdaftar dalam sistem"
            icon={<Users className="h-5 w-5" />}
            iconBg="bg-primary-50 dark:bg-primary-900/30"
            iconColor="text-primary-600 dark:text-primary-400"
            accent="bg-primary-500"
            loading={loading}
          />
          <StatCard
            title="Hadir"
            value={loading ? '…' : stats.checkedIn.toLocaleString('id-ID')}
            subtitle={loading ? '' : `dari ${stats.total} undangan`}
            icon={<UserCheck className="h-5 w-5" />}
            iconBg="bg-green-50 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            accent="bg-green-500"
            trend={stats.checkedIn > 0 ? 'up' : 'neutral'}
            trendLabel={`${stats.percentage}%`}
            loading={loading}
          />
          <StatCard
            title="Belum Hadir"
            value={loading ? '…' : stats.notCheckedIn.toLocaleString('id-ID')}
            subtitle="Menunggu check-in"
            icon={<UserX className="h-5 w-5" />}
            iconBg="bg-amber-50 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
            accent="bg-amber-500"
            trend={stats.notCheckedIn === 0 && stats.total > 0 ? 'up' : 'neutral'}
            trendLabel={stats.notCheckedIn === 0 && stats.total > 0 ? 'Semua hadir!' : undefined}
            loading={loading}
          />
          <StatCard
            title="Kehadiran"
            value={loading ? '…' : `${stats.percentage}%`}
            subtitle={stats.percentage >= 80 ? '🎉 Sangat baik!' : stats.percentage >= 50 ? '👍 Cukup baik' : 'Sedang berlangsung'}
            icon={<BarChart3 className="h-5 w-5" />}
            iconBg="bg-violet-50 dark:bg-violet-900/30"
            iconColor="text-violet-600 dark:text-violet-400"
            accent="bg-violet-500"
            trend={stats.percentage >= 75 ? 'up' : stats.percentage > 0 ? 'neutral' : 'neutral'}
            loading={loading}
          />
        </div>

        {/* ── PROGRESS BAR ───────────────────────────────── */}
        {!loading && stats.total > 0 && (
          <Card className="py-3">
            <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 mb-2">
              <span className="font-medium">Progress Kehadiran</span>
              <span className="font-bold text-surface-700 dark:text-surface-300">
                {stats.checkedIn} / {stats.total}
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700 ease-out"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-surface-400 mt-1.5">
              <span>0%</span>
              <span
                className="font-semibold text-green-600 dark:text-green-400"
                style={{ marginLeft: `calc(${Math.min(stats.percentage, 95)}% - 1rem)` }}
              >
                {stats.percentage}%
              </span>
              <span>100%</span>
            </div>
          </Card>
        )}

        {/* ── CHARTS ROW ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Hourly chart — takes 2/3 */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                  Check-in per Jam
                </h3>
                <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
                  <span className="inline-flex items-center gap-1 mr-2">
                    <span className="h-2 w-2 rounded-sm bg-green-500 inline-block" /> Per jam
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-primary-400 inline-block" /> Kumulatif
                  </span>
                </p>
              </div>
              {hourly.some((h) => h.count > 0) && (
                <Badge variant="success">
                  Puncak {
                    (() => {
                      const peak = [...hourly].sort((a, b) => b.count - a.count)[0]
                      return `${peak?.label} (${peak?.count})`
                    })()
                  }
                </Badge>
              )}
            </div>
            <HourlyChart data={hourly} loading={loading} />
          </Card>

          {/* Donut chart — takes 1/3 */}
          <Card>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">
              Status Kehadiran
            </h3>
            <AttendancePieChart stats={stats} loading={loading} />
          </Card>
        </div>

        {/* ── BOTTOM ROW ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Recent check-ins — 3/5 */}
          <Card className="lg:col-span-3 p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-800">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary-500" />
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                  Check-in Terkini
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <LiveIndicator live={realtimeConnected} />
                <span className="text-xs text-surface-400 dark:text-surface-500">
                  {recentCheckins.length} terbaru
                </span>
              </div>
            </div>

            {loading ? (
              <div className="divide-y divide-surface-50 dark:divide-surface-800/60">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-9 w-9 rounded-full bg-surface-100 dark:bg-surface-800 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-32 rounded bg-surface-100 dark:bg-surface-800 animate-pulse" />
                      <div className="h-2.5 w-20 rounded bg-surface-100 dark:bg-surface-800 animate-pulse" />
                    </div>
                    <div className="h-5 w-12 rounded bg-surface-100 dark:bg-surface-800 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : recentCheckins.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Activity className="h-8 w-8 text-surface-300 dark:text-surface-600" />
                <p className="text-sm text-surface-400">Belum ada check-in</p>
                <p className="text-xs text-surface-300 dark:text-surface-600">
                  Mulai scan QR untuk melihat data
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
                {recentCheckins.map((item, i) => (
                  <CheckinRow key={item.id} item={item} index={i} />
                ))}
              </div>
            )}
          </Card>

          {/* Category breakdown — 2/5 */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                Per Kategori
              </h3>
              {!loading && byCategory.length > 0 && (
                <span className="text-xs text-surface-400">% kehadiran</span>
              )}
            </div>
            <CategoryChart data={byCategory} loading={loading} />

            {/* Summary table */}
            {!loading && byCategory.length > 0 && (
              <div className="mt-4 border-t border-surface-100 dark:border-surface-800 pt-3 space-y-1.5">
                {byCategory.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between text-xs">
                    <span className="text-surface-600 dark:text-surface-400 flex items-center gap-1">
                      <span>{CATEGORY_EMOJI[cat.category] ?? '👤'}</span>
                      <span className="capitalize">{cat.category}</span>
                    </span>
                    <span className="text-surface-400 tabular-nums">
                      {cat.checkedIn}/{cat.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── EMPTY STATE ─────────────────────────────────── */}
        {!loading && !selectedEventId && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <BarChart3 className="h-12 w-12 text-surface-200 dark:text-surface-700" />
            <p className="text-surface-500 dark:text-surface-400 font-medium">Pilih acara untuk melihat analytics</p>
            <p className="text-sm text-surface-400 dark:text-surface-500">
              Pilih acara dari dropdown di atas
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
