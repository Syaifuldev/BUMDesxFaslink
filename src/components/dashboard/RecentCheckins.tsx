import { useEffect, useState, useCallback } from 'react'
import { Clock, CheckCircle2, ScanLine, Hand } from 'lucide-react'
import { checkinService } from '@/services/checkin.service'
import { useAuth } from '@/context/AuthContext'
import { useRealtime } from '@/hooks/useRealtime'
import { formatDateTime, getInitials } from '@/lib/utils'
import type { CheckinLog, Guest, Event } from '@/types'
import { Skeleton } from '@/components/ui/Skeleton'

export function RecentCheckins() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<CheckinLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    if (!user) return
    try {
      const data = await checkinService.getRecentLogs(user.id, 10)
      setLogs(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Realtime: refetch on new check-in
  useRealtime({
    table: 'checkin_logs',
    onInsert: () => fetchLogs(),
  })

  return (
    <div className="space-y-3">
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-3 w-20 shrink-0" />
          </div>
        ))
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-surface-300 dark:text-surface-600 mb-2" />
          <p className="text-sm text-surface-500 dark:text-surface-400">No check-ins yet</p>
          <p className="text-xs text-surface-400 dark:text-surface-500">Activity will appear here in real-time</p>
        </div>
      ) : (
        logs.map((log) => {
          const guest = log.guest as Guest | undefined
          const event = log.event as Event | undefined
          return (
            <div
              key={log.id}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors animate-fade-in"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white text-xs font-semibold shrink-0 shadow-sm shadow-primary-900/20">
                {getInitials(guest?.name || 'G')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                  {guest?.name || 'Unknown Guest'}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                  {event?.name || 'Unknown Event'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1 text-xs text-surface-400 dark:text-surface-500">
                  <Clock className="h-3 w-3" />
                  <span>{formatDateTime(log.checked_in_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  {log.method === 'qr' ? (
                    <ScanLine className="h-3 w-3 text-primary-500" />
                  ) : (
                    <Hand className="h-3 w-3 text-amber-500" />
                  )}
                  <span className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">
                    {log.method}
                  </span>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
