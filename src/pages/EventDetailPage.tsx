import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Upload, Download, UserCheck, Users,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { GuestTable } from '@/components/guests/GuestTable'
import { GuestForm } from '@/components/guests/GuestForm'
import { ImportModal } from '@/components/guests/ImportModal'
import { QRCodeDisplay } from '@/components/qr/QRCodeDisplay'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { SearchInput } from '@/components/ui/SearchInput'
import { Pagination } from '@/components/ui/Pagination'
import { PageSpinner } from '@/components/ui/Spinner'
import { eventsService } from '@/services/events.service'
import { excelService } from '@/services/excel.service'
import { useGuests } from '@/hooks/useGuests'
import { usePagination } from '@/hooks/usePagination'
import { useRealtime } from '@/hooks/useRealtime'
import type { Event, Guest, GuestFormData } from '@/types'
import { formatDate, formatTime, calculateCheckInRate } from '@/lib/utils'


const statusVariant = {
  draft: 'default' as const,
  active: 'success' as const,
  completed: 'info' as const,
  cancelled: 'danger' as const,
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [event, setEvent] = useState<Event | null>(null)
  const [eventLoading, setEventLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editGuest, setEditGuest] = useState<Guest | null>(null)
  const [deleteGuest, setDeleteGuest] = useState<Guest | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [qrGuest, setQrGuest] = useState<Guest | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked' | 'pending'>('all')

  const { guests, loading, addGuest, updateGuest, removeGuest, checkInGuest, undoCheckIn, bulkImport, refetch } =
    useGuests(id!)

  // Realtime: reload guests on remote changes
  useRealtime({
    table: 'guests',
    filter: `event_id=eq.${id}`,
    onChange: () => refetch(),
  })

  useEffect(() => {
    if (!id) return
    eventsService.getById(id).then(setEvent).finally(() => setEventLoading(false))
  }, [id])

  const filtered = useMemo(() => {
    return guests
      .filter((g) => {
        if (statusFilter === 'checked') return g.checked_in
        if (statusFilter === 'pending') return !g.checked_in
        return true
      })
      .filter((g) =>
        [g.name, g.email, g.company, g.phone]
          .filter(Boolean)
          .some((f) => f!.toLowerCase().includes(search.toLowerCase()))
      )
  }, [guests, search, statusFilter])

  const pagination = usePagination(filtered.length, 25)
  const paginated = filtered.slice(pagination.from, pagination.to)

  const handleAdd = async (data: GuestFormData) => {
    await addGuest(data)
    setAddOpen(false)
  }

  const handleEdit = async (data: GuestFormData) => {
    if (!editGuest) return
    await updateGuest(editGuest.id, data)
    setEditGuest(null)
  }

  const handleDelete = async () => {
    if (!deleteGuest) return
    setDeleteLoading(true)
    try {
      await removeGuest(deleteGuest.id)
      setDeleteGuest(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleExport = () => {
    if (!event) return
    excelService.exportGuests(guests, event.name)
  }

  if (eventLoading) return <AppLayout title="Loading..."><PageSpinner /></AppLayout>
  if (!event) return <AppLayout title="Not Found"><p className="text-center py-10 text-surface-400">Event not found.</p></AppLayout>

  const checkedIn = guests.filter((g) => g.checked_in).length
  const rate = calculateCheckInRate(checkedIn, guests.length)

  return (
    <AppLayout
      title={event.name}
      navActions={
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/events')}
        >
          Back
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Event Header */}
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">{event.name}</h2>
                <Badge variant={statusVariant[event.status]} dot>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-surface-500 dark:text-surface-400 flex-wrap">
                <span>📅 {formatDate(event.date)}</span>
                {event.time && <span>🕐 {formatTime(event.time)}</span>}
                {event.location && <span>📍 {event.location}</span>}
                {event.capacity && <span>🎯 Capacity: {event.capacity}</span>}
              </div>
            </div>
            {/* Stats mini */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500">Guests</p>
                  <p className="text-sm font-bold text-surface-900 dark:text-surface-100">{guests.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
                  <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-surface-500">Checked In</p>
                  <p className="text-sm font-bold text-surface-900 dark:text-surface-100">
                    {checkedIn} <span className="text-xs font-normal text-surface-400">({rate}%)</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {guests.length > 0 && (
            <div className="mt-4">
              <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all duration-700"
                  style={{ width: `${rate}%` }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); pagination.reset() }}
            placeholder="Search guests..."
            className="flex-1"
            id="guest-search"
          />
          <div className="flex gap-2 flex-wrap">
            {/* Status filter tabs */}
            {(['all', 'checked', 'pending'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setStatusFilter(f); pagination.reset() }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === f
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                }`}
              >
                {f === 'all' ? `All (${guests.length})` : f === 'checked' ? `✓ Checked (${guests.filter((g) => g.checked_in).length})` : `⏳ Pending (${guests.filter((g) => !g.checked_in).length})`}
              </button>
            ))}
            <Button variant="outline" size="sm" icon={<Upload className="h-4 w-4" />} onClick={() => setImportOpen(true)}>
              Import
            </Button>
            <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={handleExport}>
              Export
            </Button>
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
              Add Guest
            </Button>
          </div>
        </div>

        {/* Guest Table */}
        <GuestTable
          guests={paginated}
          loading={loading}
          onEdit={setEditGuest}
          onDelete={setDeleteGuest}
          onCheckIn={(g) => checkInGuest(g.id, 'manual')}
          onUndoCheckIn={(g) => undoCheckIn(g.id)}
          onShowQR={setQrGuest}
        />

        {/* Pagination */}
        {filtered.length > pagination.pageSize && (
          <Pagination
            {...pagination}
            total={filtered.length}
            onPageChange={pagination.goTo}
            onPageSizeChange={pagination.setPageSize}
          />
        )}
      </div>

      {/* Add Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Guest" size="md">
        <GuestForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editGuest} onClose={() => setEditGuest(null)} title="Edit Guest" size="md">
        <GuestForm guest={editGuest} onSubmit={handleEdit} onCancel={() => setEditGuest(null)} />
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteGuest}
        onClose={() => setDeleteGuest(null)}
        title="Remove Guest"
        description={`Remove "${deleteGuest?.name}" from this event?`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteGuest(null)} disabled={deleteLoading}>Cancel</Button>
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete}>Remove</Button>
          </>
        }
      >
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">This will remove the guest and their check-in record.</p>
        </div>
      </Modal>

      {/* Import Modal */}
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={bulkImport} />

      {/* QR Code Modal */}
      <QRCodeDisplay guest={qrGuest} open={!!qrGuest} onClose={() => setQrGuest(null)} />
    </AppLayout>
  )
}
