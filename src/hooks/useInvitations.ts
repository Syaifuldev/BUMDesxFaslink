// ============================================================
// hooks/useInvitations.ts
// React state wrapper for invitations.service.ts
// Supports paginated list, CRUD, bulk import, QR lookup
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { invitationsService } from '@/services/invitations.service'
import type {
  InvitationRow,
  InvitationStatusView,
  InvitationFormData,
  InvitationStatus,
  BulkInviteGuest,
  BulkInviteResult,
  FilterState,
  PaginatedResult,
} from '@/types/database'
import toast from 'react-hot-toast'

interface UseInvitationsOptions {
  eventId:    string
  filter?:    Partial<FilterState>
  page?:      number
  pageSize?:  number
  autoFetch?: boolean
}

interface UseInvitationsReturn {
  invitations:  InvitationStatusView[]
  total:        number
  totalPages:   number
  loading:      boolean
  creating:     boolean
  updating:     boolean
  deleting:     boolean
  error:        string | null
  // Actions
  refetch:      () => Promise<void>
  create:       (form: InvitationFormData) => Promise<InvitationRow>
  update:       (id: string, form: Partial<InvitationFormData>) => Promise<InvitationRow>
  updateStatus: (id: string, status: InvitationStatus) => Promise<InvitationRow>
  remove:       (id: string) => Promise<void>
  bulkImport:   (guests: BulkInviteGuest[]) => Promise<BulkInviteResult>
  markSent:     (id: string) => Promise<void>
}

export function useInvitations({
  eventId,
  filter,
  page     = 1,
  pageSize = 25,
  autoFetch = true,
}: UseInvitationsOptions): UseInvitationsReturn {
  const [result, setResult]   = useState<PaginatedResult<InvitationStatusView>>({
    data: [], total: 0, page: 1, pageSize, totalPages: 0,
  })
  const [loading,  setLoading]  = useState(false)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const refetch = useCallback(async () => {
    if (!eventId) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)
    try {
      const data = await invitationsService.getByEvent(
        eventId, filter, page, pageSize,
      )
      setResult(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load invitations'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [eventId, page, pageSize, filter?.search, filter?.status, filter?.category])

  useEffect(() => {
    if (autoFetch) { refetch() }
    return () => { abortRef.current?.abort() }
  }, [refetch, autoFetch])

  // ── Create ──────────────────────────────────────────────
  const create = useCallback(async (form: InvitationFormData): Promise<InvitationRow> => {
    setCreating(true)
    try {
      const row = await invitationsService.create(eventId, form)
      toast.success(`${row.name} added to guest list`)
      await refetch()
      return row
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add guest'
      toast.error(msg)
      throw err
    } finally {
      setCreating(false)
    }
  }, [eventId, refetch])

  // ── Update ──────────────────────────────────────────────
  const update = useCallback(async (
    id:   string,
    form: Partial<InvitationFormData>,
  ): Promise<InvitationRow> => {
    setUpdating(true)
    try {
      const row = await invitationsService.update(id, form)
      toast.success('Guest updated')
      await refetch()
      return row
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update guest'
      toast.error(msg)
      throw err
    } finally {
      setUpdating(false)
    }
  }, [refetch])

  // ── Update RSVP status ──────────────────────────────────
  const updateStatus = useCallback(async (
    id:     string,
    status: InvitationStatus,
  ): Promise<InvitationRow> => {
    setUpdating(true)
    try {
      const row = await invitationsService.updateStatus(id, status)
      toast.success(`Status updated to ${status}`)
      await refetch()
      return row
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update status'
      toast.error(msg)
      throw err
    } finally {
      setUpdating(false)
    }
  }, [refetch])

  // ── Delete ──────────────────────────────────────────────
  const remove = useCallback(async (id: string): Promise<void> => {
    setDeleting(true)
    try {
      await invitationsService.delete(id)
      toast.success('Guest removed')
      await refetch()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove guest'
      toast.error(msg)
      throw err
    } finally {
      setDeleting(false)
    }
  }, [refetch])

  // ── Bulk import ─────────────────────────────────────────
  const bulkImport = useCallback(async (
    guests: BulkInviteGuest[],
  ): Promise<BulkInviteResult> => {
    setCreating(true)
    try {
      const result = await invitationsService.bulkCreate(eventId, guests)
      if (result.inserted > 0) {
        toast.success(`${result.inserted} guest${result.inserted !== 1 ? 's' : ''} imported`)
      }
      if (result.skipped > 0) {
        toast(`${result.skipped} row${result.skipped !== 1 ? 's' : ''} skipped`, { icon: '⚠️' })
      }
      await refetch()
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      toast.error(msg)
      throw err
    } finally {
      setCreating(false)
    }
  }, [eventId, refetch])

  // ── Mark invitation sent ────────────────────────────────
  const markSent = useCallback(async (id: string): Promise<void> => {
    try {
      await invitationsService.markSent(id)
      await refetch()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to mark as sent'
      toast.error(msg)
      throw err
    }
  }, [refetch])

  return {
    invitations: result.data,
    total:       result.total,
    totalPages:  result.totalPages,
    loading,
    creating,
    updating,
    deleting,
    error,
    refetch,
    create,
    update,
    updateStatus,
    remove,
    bulkImport,
    markSent,
  }
}
