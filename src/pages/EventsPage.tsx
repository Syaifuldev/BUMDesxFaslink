import { useState, useMemo } from 'react'
import { Plus, Search, Filter, CalendarDays } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { EventCard } from '@/components/events/EventCard'
import { EventForm } from '@/components/events/EventForm'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Pagination } from '@/components/ui/Pagination'
import { useEvents } from '@/hooks/useEvents'
import { usePagination } from '@/hooks/usePagination'
import type { Event, EventFormData } from '@/types'
import toast from 'react-hot-toast'

const STATUS_FILTER = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function EventsPage() {
  const { events, loading, createEvent, updateEvent, deleteEvent } = useEvents()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const filtered = useMemo(() => {
    return events
      .filter((e) => statusFilter === 'all' || e.status === statusFilter)
      .filter((e) =>
        [e.name, e.description, e.location]
          .filter(Boolean)
          .some((f) => f!.toLowerCase().includes(search.toLowerCase()))
      )
  }, [events, search, statusFilter])

  const pagination = usePagination(filtered.length, 12)
  const paginated = filtered.slice(pagination.from, pagination.to)

  const handleCreate = async (data: EventFormData) => {
    await createEvent(data)
    setCreateOpen(false)
  }

  const handleEdit = async (data: EventFormData) => {
    if (!editingEvent) return
    await updateEvent(editingEvent.id, data)
    setEditingEvent(null)
  }

  const handleDelete = async () => {
    if (!deletingEvent) return
    setDeleteLoading(true)
    try {
      await deleteEvent(deletingEvent.id)
      setDeletingEvent(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <AppLayout
      title="Events"
      navActions={
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
          New Event
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); pagination.reset() }}
            placeholder="Search events..."
            className="flex-1"
            id="event-search"
          />
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-surface-400 shrink-0" />
            <Select
              options={STATUS_FILTER}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); pagination.reset() }}
              className="w-36"
            />
          </div>
        </div>

        {/* Count */}
        {!loading && (
          <p className="text-sm text-surface-500 dark:text-surface-400">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
            {search || statusFilter !== 'all' ? ' found' : ' total'}
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : paginated.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-7 w-7" />}
            title={search || statusFilter !== 'all' ? 'No events match your filter' : 'No events yet'}
            description={
              search || statusFilter !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Create your first event to get started.'
            }
            action={
              !search && statusFilter === 'all' ? (
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                  Create Event
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={setEditingEvent}
                onDelete={setDeletingEvent}
              />
            ))}
          </div>
        )}

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

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Event"
        description="Fill in the event details to get started."
        size="md"
      >
        <EventForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        title="Edit Event"
        size="md"
      >
        <EventForm
          event={editingEvent}
          onSubmit={handleEdit}
          onCancel={() => setEditingEvent(null)}
        />
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deletingEvent}
        onClose={() => setDeletingEvent(null)}
        title="Delete Event"
        description={`Are you sure you want to delete "${deletingEvent?.name}"? This will also delete all guests and check-in records.`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeletingEvent(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete}>
              Delete Event
            </Button>
          </>
        }
      >
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">
            ⚠ This action cannot be undone. All associated data will be permanently deleted.
          </p>
        </div>
      </Modal>
    </AppLayout>
  )
}
