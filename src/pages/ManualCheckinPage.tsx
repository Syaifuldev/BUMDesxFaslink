import { useState, useCallback, useEffect } from 'react'
import { Search, CheckCircle2, XCircle, AlertTriangle, Hand, Users, UserCheck, Clock } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useEvents } from '@/hooks/useEvents'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Guest } from '@/types'

interface EventStats {
  total: number
  checkedIn: number
  pending: number
}

export default function ManualCheckinPage() {
  const { events } = useEvents()
  const [selectedEventId, setSelectedEventId] = useState('')
  const [search, setSearch] = useState('')
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [stats, setStats] = useState<EventStats>({ total: 0, checkedIn: 0, pending: 0 })

  // Auto-select first event
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      const active = events.find((e) => e.status === 'active') ?? events[0]
      setSelectedEventId(active.id)
    }
  }, [events, selectedEventId])

  // Fetch stats
  const fetchStats = useCallback(async (eventId: string) => {
    if (!eventId) return
    const { count: total } = await supabase
      .from('guests').select('*', { count: 'exact', head: true }).eq('event_id', eventId)
    const { count: checkedIn } = await supabase
      .from('guests').select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('checked_in', true)
    setStats({ total: total ?? 0, checkedIn: checkedIn ?? 0, pending: (total ?? 0) - (checkedIn ?? 0) })
  }, [])

  useEffect(() => { if (selectedEventId) fetchStats(selectedEventId) }, [selectedEventId, fetchStats])

  // Search guests
  const handleSearch = useCallback(async () => {
    if (!selectedEventId) { toast.error('Pilih acara terlebih dahulu'); return }
    setLoading(true)
    try {
      let query = supabase.from('guests').select('*').eq('event_id', selectedEventId).order('name')
      if (search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`)
      }
      const { data, error } = await query.limit(50)
      if (error) throw error
      setGuests(data ?? [])
    } catch (err) {
      toast.error('Gagal mencari tamu')
    } finally {
      setLoading(false)
    }
  }, [selectedEventId, search])

  // Load all guests when event changes
  useEffect(() => {
    if (selectedEventId) handleSearch()
  }, [selectedEventId])

  // Manual check-in
  const handleCheckIn = async (guest: Guest) => {
    if (guest.checked_in) { toast.error(`${guest.name} sudah check-in`); return }
    setCheckingIn(guest.id)
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('guests')
        .update({ checked_in: true, checked_in_at: now })
        .eq('id', guest.id)
      if (error) throw error
      toast.success(`✅ ${guest.name} berhasil check-in!`)
      // Update local state
      setGuests((prev) => prev.map((g) => g.id === guest.id ? { ...g, checked_in: true, checked_in_at: now } : g))
      fetchStats(selectedEventId)
    } catch {
      toast.error('Gagal melakukan check-in')
    } finally {
      setCheckingIn(null)
    }
  }

  const filteredGuests = search.trim()
    ? guests.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : guests

  return (
    <AppLayout title="Check-in Manual">
      <div className="max-w-2xl mx-auto space-y-4 pb-8">

        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Gunakan check-in manual jika barcode tamu rusak atau tidak bisa terbaca kamera.
          </p>
        </div>

        {/* Event selector */}
        <Card>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide">
              Acara
            </label>
            <div className="relative">
              <select
                value={selectedEventId}
                onChange={(e) => { setSelectedEventId(e.target.value); setGuests([]) }}
                className={cn(
                  'w-full appearance-none rounded-xl border px-3 py-2.5 pr-8 text-sm font-medium',
                  'bg-surface-50 dark:bg-surface-800',
                  'border-surface-200 dark:border-surface-700',
                  'text-surface-900 dark:text-surface-100',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500',
                  'transition-colors',
                )}
              >
                <option value="">— Pilih Acara —</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            </div>
          </div>
        </Card>

        {/* Stats */}
        {selectedEventId && (
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300">
              <Users className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs opacity-70">Total</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              <UserCheck className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs opacity-70">Hadir</p>
                <p className="text-lg font-bold">{stats.checkedIn}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              <Clock className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs opacity-70">Belum</p>
                <p className="text-lg font-bold">{stats.pending}</p>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <Card>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                placeholder="Cari nama tamu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={cn(
                  'w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm',
                  'bg-surface-50 dark:bg-surface-800',
                  'border-surface-200 dark:border-surface-700',
                  'text-surface-900 dark:text-surface-100',
                  'placeholder:text-surface-400',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500',
                  'transition-colors',
                )}
              />
            </div>
            <Button onClick={handleSearch} loading={loading} icon={<Search className="h-4 w-4" />}>
              Cari
            </Button>
          </div>
        </Card>

        {/* Guest List */}
        <Card padding="none">
          {loading ? (
            <div className="p-6 text-center text-sm text-surface-400">Memuat tamu...</div>
          ) : filteredGuests.length === 0 ? (
            <EmptyState
              icon={<Users className="h-7 w-7" />}
              title="Tidak ada tamu ditemukan"
              description="Coba ketik nama tamu dan tekan Cari."
            />
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {filteredGuests.map((guest) => (
                <div
                  key={guest.id}
                  className={cn(
                    'flex items-center justify-between px-4 py-3 transition-colors',
                    guest.checked_in
                      ? 'bg-green-50/50 dark:bg-green-900/10'
                      : 'hover:bg-surface-50 dark:hover:bg-surface-800/30'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-surface-900 dark:text-surface-100 truncate">
                      {guest.name}
                    </p>
                    {guest.company && (
                      <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{guest.company}</p>
                    )}
                    {guest.checked_in && guest.checked_in_at && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                        ✓ Hadir {formatDateTime(guest.checked_in_at)}
                      </p>
                    )}
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    {guest.checked_in ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Hadir
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleCheckIn(guest)}
                        loading={checkingIn === guest.id}
                        icon={<Hand className="h-3.5 w-3.5" />}
                      >
                        Check-in
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </AppLayout>
  )
}
