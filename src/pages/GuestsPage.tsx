import { useState, useMemo, useEffect } from 'react'
import { Users, Download, Upload } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { GuestTable } from '@/components/guests/GuestTable'
import { GuestForm } from '@/components/guests/GuestForm'
import { ImportModal } from '@/components/guests/ImportModal'
import { QRCodeDisplay } from '@/components/qr/QRCodeDisplay'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { useGuests } from '@/hooks/useGuests'
import { useEvents } from '@/hooks/useEvents'
import { usePagination } from '@/hooks/usePagination'
import { excelService } from '@/services/excel.service'
import type { Guest, GuestFormData } from '@/types'

export default function GuestsPage() {
  const { events } = useEvents()
  const [selectedEventId, setSelectedEventId] = useState<string>('')

  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id)
    }
  }, [events, selectedEventId])

  const { guests, loading, addGuest, updateGuest, removeGuest, checkInGuest, undoCheckIn, bulkImport } =
    useGuests(selectedEventId)

  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editGuest, setEditGuest] = useState<Guest | null>(null)
  const [deleteGuest, setDeleteGuest] = useState<Guest | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [qrGuest, setQrGuest] = useState<Guest | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const filtered = useMemo(() => {
    if (!search) return guests
    return guests.filter((g) =>
      [g.name, g.email, g.company, g.phone]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(search.toLowerCase()))
    )
  }, [guests, search])

  const pagination = usePagination(filtered.length, 25)
  const paginated = filtered.slice(pagination.from, pagination.to)

  const eventOptions = [
    { value: '', label: 'Select an event...' },
    ...events.map((e) => ({ value: e.id, label: e.name })),
  ]

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  const handleAdd = async (data: GuestFormData) => { await addGuest(data); setAddOpen(false) }
  const handleEdit = async (data: GuestFormData) => {
    if (!editGuest) return
    await updateGuest(editGuest.id, data)
    setEditGuest(null)
  }
  const handleDelete = async () => {
    if (!deleteGuest) return
    setDeleteLoading(true)
    try { await removeGuest(deleteGuest.id); setDeleteGuest(null) }
    finally { setDeleteLoading(false) }
  }

  return (
    <AppLayout
      title="Guests"
      navActions={
        selectedEventId ? (
          <Button size="sm" onClick={() => setAddOpen(true)}>+ Add Guest</Button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        {/* Event selector */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            options={eventOptions}
            value={selectedEventId}
            onChange={(e) => { setSelectedEventId(e.target.value); pagination.reset() }}
            className="sm:w-72"
          />
          {selectedEventId && (
            <>
              <SearchInput
                value={search}
                onChange={(v) => { setSearch(v); pagination.reset() }}
                placeholder="Search guests..."
                className="flex-1"
                id="guests-search"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" icon={<Upload className="h-4 w-4" />} onClick={() => setImportOpen(true)}>
                  Import
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="h-4 w-4" />}
                  onClick={() => selectedEvent && excelService.exportGuests(guests, selectedEvent.name)}
                  disabled={guests.length === 0}
                >
                  Export
                </Button>
              </div>
            </>
          )}
        </div>

        {!selectedEventId ? (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title="Select an event"
            description="Choose an event above to view and manage its guest list."
          />
        ) : (
          <>
            <GuestTable
              guests={paginated}
              loading={loading}
              onEdit={setEditGuest}
              onDelete={setDeleteGuest}
              onCheckIn={(g) => checkInGuest(g.id, 'manual')}
              onUndoCheckIn={(g) => undoCheckIn(g.id)}
              onShowQR={setQrGuest}
            />
            {filtered.length > pagination.pageSize && (
              <Pagination
                {...pagination}
                total={filtered.length}
                onPageChange={pagination.goTo}
                onPageSizeChange={pagination.setPageSize}
              />
            )}
          </>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Guest" size="md">
        <GuestForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>
      <Modal open={!!editGuest} onClose={() => setEditGuest(null)} title="Edit Guest" size="md">
        <GuestForm guest={editGuest} onSubmit={handleEdit} onCancel={() => setEditGuest(null)} />
      </Modal>
      <Modal
        open={!!deleteGuest}
        onClose={() => setDeleteGuest(null)}
        title="Remove Guest"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteGuest(null)} disabled={deleteLoading}>Cancel</Button>
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete}>Remove</Button>
          </>
        }
      >
        <p className="text-sm text-surface-600 dark:text-surface-400">
          Remove <strong>{deleteGuest?.name}</strong> from the guest list?
        </p>
      </Modal>
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={bulkImport} />
      <QRCodeDisplay guest={qrGuest} open={!!qrGuest} onClose={() => setQrGuest(null)} />
    </AppLayout>
  )
}
