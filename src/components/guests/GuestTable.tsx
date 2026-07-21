import { useState } from 'react'
import {
  Edit, Trash2, QrCode, CheckCircle2, XCircle, ChevronUp, ChevronDown, Mail, Phone, Building2, Printer
} from 'lucide-react'
import type { Guest } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { formatDateTime, truncate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface GuestTableProps {
  guests: Guest[]
  loading: boolean
  startIndex?: number
  onEdit: (guest: Guest) => void
  onDelete: (guest: Guest) => void
  onCheckIn: (guest: Guest) => void
  onUndoCheckIn: (guest: Guest) => void
  onShowQR: (guest: Guest) => void
  onPrint?: (guest: Guest) => void
}

type SortField = 'name' | 'company' | 'checked_in' | 'created_at' | 'none'
type SortDir = 'asc' | 'desc'

export function GuestTable({
  guests, loading, startIndex = 0, onEdit, onDelete, onCheckIn, onUndoCheckIn, onShowQR, onPrint
}: GuestTableProps) {
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'none', dir: 'asc' })

  const handleSort = (field: SortField) => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' }
    )
  }

  const sorted = sort.field === 'none' ? guests : [...guests].sort((a, b) => {
    const mul = sort.dir === 'asc' ? 1 : -1
    const valA = a[sort.field as keyof Guest] ?? ''
    const valB = b[sort.field as keyof Guest] ?? ''
    if (typeof valA === 'boolean') return ((valA ? 1 : 0) - (valB ? 1 : 0)) * mul
    return String(valA).localeCompare(String(valB)) * mul
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <ChevronUp className="h-3 w-3 opacity-30" />
    return sort.dir === 'asc'
      ? <ChevronUp className="h-3 w-3 text-primary-500" />
      : <ChevronDown className="h-3 w-3 text-primary-500" />
  }

  const ThButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-surface-900 dark:hover:text-surface-100 transition-colors"
    >
      {children}
      <SortIcon field={field} />
    </button>
  )

  if (loading) return <TableSkeleton rows={6} cols={6} />

  if (guests.length === 0) {
    return (
      <EmptyState
        icon={<QrCode className="h-7 w-7" />}
        title="No guests yet"
        description="Add guests manually or import from Excel to get started."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider w-16">
              No.
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              <ThButton field="name">Guest</ThButton>
            </th>
            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              <ThButton field="company">Alamat</ThButton>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              <ThButton field="checked_in">Status</ThButton>
            </th>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Check-in Time
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
          {sorted.map((guest, idx) => (
            <tr
              key={guest.id}
              className={cn(
                'group hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors',
                guest.checked_in && 'bg-green-50/40 dark:bg-green-900/5'
              )}
            >
              <td className="px-4 py-3 text-surface-500 font-mono text-xs">
                {(guest as any)._globalIndex ?? idx + 1}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="font-medium text-surface-900 dark:text-surface-100">{guest.name}</span>
                </div>
              </td>
              <td className="hidden md:table-cell px-4 py-3">
                {guest.company ? (
                  <span className="flex items-center gap-1.5 text-surface-600 dark:text-surface-400">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-surface-400" />
                    {truncate(guest.company, 25)}
                  </span>
                ) : (
                  <span className="text-surface-300 dark:text-surface-600">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {guest.checked_in ? (
                  <Badge variant="success" dot>Checked In</Badge>
                ) : (
                  <Badge variant="warning" dot>Pending</Badge>
                )}
              </td>
              <td className="hidden lg:table-cell px-4 py-3 text-xs text-surface-500 dark:text-surface-400">
                {guest.checked_in_at ? formatDateTime(guest.checked_in_at) : '—'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onPrint?.(guest)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Print Invitation"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onShowQR(guest)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    title="Show QR"
                  >
                    <QrCode className="h-4 w-4" />
                  </button>
                  {guest.checked_in ? (
                    <button
                      onClick={() => onUndoCheckIn(guest)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      title="Undo Check-in"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onCheckIn(guest)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      title="Check In"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(guest)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(guest)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
