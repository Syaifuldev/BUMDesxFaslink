import { useState, useMemo, useCallback, useEffect } from 'react'
import { History, Download, ScanLine, Hand, Filter } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Pagination } from '@/components/ui/Pagination'
import { checkinService } from '@/services/checkin.service'
import { excelService } from '@/services/excel.service'
import { useEvents } from '@/hooks/useEvents'
import { useAuth } from '@/context/AuthContext'
import { useRealtime } from '@/hooks/useRealtime'
import { usePagination } from '@/hooks/usePagination'
import type { CheckinLog, Guest, Event } from '@/types'
import { formatDateTime } from '@/lib/utils'

export default function CheckinHistoryPage() {
  const { user } = useAuth()
  const { events } = useEvents()
  const [logs, setLogs] = useState<CheckinLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')

  const eventOptions = [
    { value: 'all', label: 'All Events' },
    ...events.map((e) => ({ value: e.id, label: e.name })),
  ]

  const methodOptions = [
    { value: 'all', label: 'All Methods' },
    { value: 'qr', label: 'QR Scan' },
    { value: 'manual', label: 'Manual' },
  ]

  const fetchLogs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await checkinService.getAllLogs(user.id)
      setLogs(data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Realtime updates
  useRealtime({ table: 'guests', onUpdate: () => fetchLogs() })

  const filtered = useMemo(() => {
    return logs
      .filter((l) => eventFilter === 'all' || l.event_id === eventFilter)
      .filter((l) => methodFilter === 'all' || l.method === methodFilter)
      .filter((l) => {
        if (!search) return true
        const guest = l.guest as Guest | undefined
        const event = l.event as Event | undefined
        return (
          guest?.name?.toLowerCase().includes(search.toLowerCase()) ||
          guest?.email?.toLowerCase().includes(search.toLowerCase()) ||
          event?.name?.toLowerCase().includes(search.toLowerCase())
        )
      })
  }, [logs, eventFilter, methodFilter, search])

  const pagination = usePagination(filtered.length, 25)
  const paginated = filtered.slice(pagination.from, pagination.to)

  const handleExport = () => {
    const selectedEvent = events.find((e) => e.id === eventFilter)
    excelService.exportCheckinHistory(filtered, selectedEvent?.name)
  }

  return (
    <AppLayout
      title="Check-in History"
      navActions={
        <Button
          variant="outline"
          size="sm"
          icon={<Download className="h-4 w-4" />}
          onClick={handleExport}
          disabled={filtered.length === 0}
        >
          Export
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); pagination.reset() }}
            placeholder="Search by guest name, email, event..."
            className="flex-1"
            id="history-search"
          />
          <div className="flex gap-2">
            <Select
              options={eventOptions}
              value={eventFilter}
              onChange={(e) => { setEventFilter(e.target.value); pagination.reset() }}
              className="w-44"
            />
            <Select
              options={methodOptions}
              value={methodFilter}
              onChange={(e) => { setMethodFilter(e.target.value); pagination.reset() }}
              className="w-36"
            />
          </div>
        </div>

        {/* Count */}
        {!loading && (
          <p className="text-sm text-surface-500 dark:text-surface-400">
            {filtered.length} check-in record{filtered.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Table */}
        <Card padding="none">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={8} cols={5} />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<History className="h-7 w-7" />}
              title="No check-in history"
              description="Check-in records will appear here as guests are checked in."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Guest
                    </th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Check-in Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Method
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {paginated.map((log) => {
                    const guest = log.guest as Guest | undefined
                    const event = log.event as Event | undefined
                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-surface-900 dark:text-surface-100">
                              {guest?.name || 'Unknown'}
                            </p>
                            {guest?.email && (
                              <p className="text-xs text-surface-400 mt-0.5">{guest.email}</p>
                            )}
                            {guest?.company && (
                              <p className="text-xs text-surface-400">{guest.company}</p>
                            )}
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3">
                          <p className="text-surface-700 dark:text-surface-300">
                            {event?.name || '—'}
                          </p>
                          {event?.date && (
                            <p className="text-xs text-surface-400 mt-0.5">{event.date}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-surface-600 dark:text-surface-400 text-xs">
                          {formatDateTime(log.checked_in_at)}
                        </td>
                        <td className="px-4 py-3">
                          {log.method === 'qr' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                              <ScanLine className="h-3 w-3" /> QR Scan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border border-orange-200 dark:border-orange-700">
                              <Hand className="h-3 w-3" /> Manual
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {filtered.length > pagination.pageSize && (
          <Pagination
            {...pagination}
            total={filtered.length}
            onPageChange={pagination.goTo}
            onPageSizeChange={pagination.setPageSize}
          />
        )}
      </div>
    </AppLayout>
  )
}
