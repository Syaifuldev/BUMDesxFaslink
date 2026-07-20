import { useEffect, useState, useCallback } from 'react'
import {
  CalendarDays, Users, CheckCircle2, Clock, ArrowUpRight, TrendingUp,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { RecentCheckins } from '@/components/dashboard/RecentCheckins'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { eventsService } from '@/services/events.service'
import { useAuth } from '@/context/AuthContext'
import { useRealtime } from '@/hooks/useRealtime'
import type { DashboardStats, Event } from '@/types'
import { formatDate, calculateCheckInRate } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

const statusVariant = {
  draft: 'default' as const,
  active: 'success' as const,
  completed: 'info' as const,
  cancelled: 'danger' as const,
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user) return
    try {
      const [statsData, eventsData] = await Promise.all([
        eventsService.getDashboardStats(user.id),
        eventsService.getAll(user.id),
      ])
      setStats(statsData)
      setEvents(eventsData.slice(0, 5))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  // Realtime: update stats on guest check-in
  useRealtime({ table: 'guests', onUpdate: () => fetchData() })

  const statsCards = stats
    ? [
        {
          title: 'Total Events',
          value: stats.totalEvents,
          icon: <CalendarDays />,
          iconColor: 'text-primary-600 dark:text-primary-400',
          iconBg: 'bg-primary-50 dark:bg-primary-900/30',
          subtitle: `${stats.activeEvents} active`,
        },
        {
          title: 'Total Guests',
          value: stats.totalGuests.toLocaleString(),
          icon: <Users />,
          iconColor: 'text-blue-600 dark:text-blue-400',
          iconBg: 'bg-blue-50 dark:bg-blue-900/30',
        },
        {
          title: 'Checked In',
          value: stats.totalCheckedIn.toLocaleString(),
          icon: <CheckCircle2 />,
          iconColor: 'text-green-600 dark:text-green-400',
          iconBg: 'bg-green-50 dark:bg-green-900/30',
          subtitle: `${stats.checkInRate}% rate`,
        },
        {
          title: 'Pending',
          value: stats.totalPending.toLocaleString(),
          icon: <Clock />,
          iconColor: 'text-amber-600 dark:text-amber-400',
          iconBg: 'bg-amber-50 dark:bg-amber-900/30',
          subtitle: 'Awaiting check-in',
        },
      ]
    : []

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats */}
        <section>
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statsCards.map((card) => (
                <StatsCard key={card.title} {...card} />
              ))}
            </div>
          )}
        </section>

        {/* Check-in rate bar */}
        {stats && stats.totalGuests > 0 && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                  Overall Check-in Rate
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  Across all events
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <TrendingUp className="h-4 w-4" />
                <span className="text-lg font-bold">{stats.checkInRate}%</span>
              </div>
            </div>
            <div className="h-2.5 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all duration-1000"
                style={{ width: `${stats.checkInRate}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-surface-400 mt-1.5">
              <span>{stats.totalCheckedIn} checked in</span>
              <span>{stats.totalPending} pending</span>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Check-ins */}
          <Card>
            <CardHeader
              title="Recent Check-ins"
              description="Live activity feed"
              action={
                <Badge variant="success" dot>Live</Badge>
              }
            />
            <RecentCheckins />
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader
              title="Events Overview"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/events')}
                  icon={<ArrowUpRight className="h-4 w-4" />}
                >
                  View All
                </Button>
              }
            />
            <div className="space-y-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
                ))
              ) : events.length === 0 ? (
                <p className="text-sm text-center text-surface-400 py-6">
                  No events yet. <button className="text-primary-600 dark:text-primary-400 hover:underline" onClick={() => navigate('/events')}>Create your first event →</button>
                </p>
              ) : (
                events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => navigate(`/events/${event.id}`)}
                    className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30 shrink-0">
                        <CalendarDays className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {event.name}
                        </p>
                        <p className="text-xs text-surface-400">{formatDate(event.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant={statusVariant[event.status]} dot>
                        {event.status}
                      </Badge>
                      <span className="text-xs text-surface-400">
                        {calculateCheckInRate(event.checked_in_count ?? 0, event.guest_count ?? 0)}%
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
