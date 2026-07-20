import { CalendarDays, MapPin, Users, Clock, MoreHorizontal, Edit, Trash2, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Event } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate, formatTime, calculateCheckInRate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

interface EventCardProps {
  event: Event
  onEdit: (event: Event) => void
  onDelete: (event: Event) => void
}

const statusVariant = {
  draft: 'default' as const,
  active: 'success' as const,
  completed: 'info' as const,
  cancelled: 'danger' as const,
}

export function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const rate = calculateCheckInRate(event.checked_in_count ?? 0, event.guest_count ?? 0)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div
      className={cn(
        'group relative rounded-2xl border bg-white dark:bg-surface-900',
        'border-surface-200 dark:border-surface-800 shadow-sm',
        'hover:shadow-md hover:border-surface-300 dark:hover:border-surface-700',
        'transition-all duration-200 overflow-hidden'
      )}
    >
      {/* Top accent bar */}
      <div
        className={cn(
          'h-1 w-full',
          event.status === 'active' && 'bg-gradient-to-r from-green-400 to-emerald-500',
          event.status === 'draft' && 'bg-gradient-to-r from-surface-300 to-surface-400',
          event.status === 'completed' && 'bg-gradient-to-r from-blue-400 to-indigo-500',
          event.status === 'cancelled' && 'bg-gradient-to-r from-red-400 to-rose-500'
        )}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-surface-900 dark:text-surface-100 truncate cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              {event.name}
            </h3>
            {event.description && (
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 line-clamp-1">{event.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusVariant[event.status]} dot>
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </Badge>

            {/* Menu */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((p) => !p)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                aria-label="Event options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 w-40 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-lg z-20 py-1 animate-fade-in">
                  <button
                    onClick={() => { navigate(`/events/${event.id}`); setMenuOpen(false) }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View Detail
                  </button>
                  <button
                    onClick={() => { onEdit(event); setMenuOpen(false) }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => { onDelete(event); setMenuOpen(false) }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>{formatDate(event.date)}</span>
            {event.time && (
              <>
                <Clock className="h-3.5 w-3.5 shrink-0 ml-1" />
                <span>{formatTime(event.time)}</span>
              </>
            )}
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>
              {event.guest_count ?? 0} guests
              {event.capacity ? ` / ${event.capacity} capacity` : ''}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {(event.guest_count ?? 0) > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-surface-500 dark:text-surface-400">Check-in Progress</span>
              <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
                {event.checked_in_count ?? 0}/{event.guest_count ?? 0} ({rate}%)
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                style={{ width: `${rate}%` }}
              />
            </div>
          </div>
        )}

        {/* Action */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => navigate(`/events/${event.id}`)}
        >
          Manage Event
        </Button>
      </div>
    </div>
  )
}
