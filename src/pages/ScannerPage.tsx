import { useState, useCallback, useEffect, useRef } from 'react'
import {
  ScanLine, Camera, CameraOff, RefreshCw, CheckCircle2,
  AlertTriangle, XCircle, Users, UserCheck, Clock,
  ChevronDown, Zap, RotateCcw, StopCircle,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { useQRScanner } from '@/hooks/useQRScanner'
import { useEvents } from '@/hooks/useEvents'
import { playSuccessSound, playWarningSound, playErrorSound } from '@/lib/scannerSound'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { InvitationRow } from '@/types/database'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type ScanResult =
  | { type: 'idle' }
  | { type: 'processing' }
  | { type: 'success';    invitation: InvitationRow; checkedInAt: string }
  | { type: 'duplicate';  invitation: InvitationRow; previousAt: string }
  | { type: 'not_found';  qrToken: string }
  | { type: 'error';      message: string }

interface EventStats {
  total:     number
  checkedIn: number
  pending:   number
}

const QR_CONTAINER_ID = 'qr-reader-viewport'
const AUTO_RESTART_MS = 2500

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function buildDeviceInfo() {
  return {
    user_agent:  navigator.userAgent,
    platform:    navigator.platform,
    app_version: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
  }
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2', color)}>
      <span className="h-4 w-4">{icon}</span>
      <div className="leading-none">
        <p className="text-xs opacity-70">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  )
}

function ResultPanel({ result, onDismiss }: { result: ScanResult; onDismiss: () => void }) {
  if (result.type === 'idle' || result.type === 'processing') return null

  const configs = {
    success: {
      wrapper:  'border-green-400 dark:border-green-600',
      icon:     <CheckCircle2 className="h-14 w-14 text-green-500" />,
      title:    'Berhasil Check-in! 🎉',
      titleCls: 'text-green-700 dark:text-green-400',
      badgeCls: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
    },
    duplicate: {
      wrapper:  'border-amber-400 dark:border-amber-600',
      icon:     <AlertTriangle className="h-14 w-14 text-amber-500" />,
      title:    'Sudah Check-in',
      titleCls: 'text-amber-700 dark:text-amber-400',
      badgeCls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
    },
    not_found: {
      wrapper:  'border-red-400 dark:border-red-600',
      icon:     <XCircle className="h-14 w-14 text-red-500" />,
      title:    'QR Tidak Ditemukan',
      titleCls: 'text-red-700 dark:text-red-400',
      badgeCls: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
    },
    error: {
      wrapper:  'border-red-400 dark:border-red-600',
      icon:     <XCircle className="h-14 w-14 text-red-500" />,
      title:    'Terjadi Kesalahan',
      titleCls: 'text-red-700 dark:text-red-400',
      badgeCls: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
    },
  } as const

  const cfg = configs[result.type as keyof typeof configs]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div
        className={cn(
          'relative w-full max-w-sm rounded-3xl border-2 p-6 shadow-2xl transition-all duration-300 animate-in zoom-in-95 bg-white dark:bg-surface-900',
          cfg.wrapper
        )}
      >
        <div className="flex flex-col items-center text-center gap-4">
          {/* Icon */}
          <div className={cn(
            'shrink-0 rounded-full p-4',
            result.type === 'success'   && 'bg-green-50 dark:bg-green-900/20 animate-[pulse_1s_ease-in-out_2]',
            result.type === 'duplicate' && 'bg-amber-50 dark:bg-amber-900/20 animate-bounce',
            (result.type === 'not_found' || result.type === 'error') && 'bg-red-50 dark:bg-red-900/20',
          )}>
            {cfg.icon}
          </div>

          {/* Content */}
          <div className="space-y-3 w-full">
            <h3 className={cn('text-2xl font-black leading-tight', cfg.titleCls)}>
              {cfg.title}
            </h3>

            {result.type === 'success' && (
              <div className="space-y-2 mt-4">
                <div className={cn('inline-block px-5 py-2 rounded-full text-xl font-bold', cfg.badgeCls)}>
                  {result.invitation.name}
                </div>
                {result.invitation.company && (
                  <p className="text-base font-semibold text-surface-600 dark:text-surface-300">
                    🏢 {result.invitation.company}
                  </p>
                )}
                <div className="flex items-center justify-center gap-1.5 text-sm text-surface-500 mt-2">
                  <Clock className="h-4 w-4" />
                  Berhasil pada {new Date(result.checkedInAt).toLocaleTimeString('id-ID')}
                </div>
              </div>
            )}

            {result.type === 'duplicate' && (
              <div className="space-y-2 mt-4">
                <div className={cn('inline-block px-5 py-2 rounded-full text-xl font-bold', cfg.badgeCls)}>
                  {result.invitation.name}
                </div>
                {result.invitation.company && (
                  <p className="text-base font-semibold text-surface-600 dark:text-surface-300">
                    🏢 {result.invitation.company}
                  </p>
                )}
                <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 mt-3 bg-amber-100 dark:bg-amber-900/30 py-2 px-4 rounded-xl inline-flex">
                  <Clock className="h-4 w-4" />
                  Sudah masuk jam {new Date(result.previousAt).toLocaleTimeString('id-ID')}
                </div>
              </div>
            )}

            {result.type === 'not_found' && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-mono bg-red-100 dark:bg-red-900/30 py-2 px-3 rounded-lg overflow-hidden text-ellipsis whitespace-nowrap">
                QR: {result.qrToken}
              </p>
            )}

            {result.type === 'error' && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {result.message}
              </p>
            )}
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <XCircle className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// SCANNER VIEWPORT
// ─────────────────────────────────────────────

function ScannerViewport({
  isScanning,
  isProcessing,
  resultType,
}: {
  isScanning:   boolean
  isProcessing: boolean
  resultType?:  string
}) {
  const borderColor =
    resultType === 'success'
      ? 'border-green-500'
      : resultType === 'duplicate'
      ? 'border-amber-500'
      : resultType === 'not_found' || resultType === 'error'
      ? 'border-red-500'
      : isScanning
      ? 'border-primary-500'
      : 'border-surface-300 dark:border-surface-700'

  return (
    <div className="relative w-full max-w-[320px] mx-auto aspect-square">
      {/* Camera container */}
      <div
        id={QR_CONTAINER_ID}
        className={cn(
          'w-full h-full rounded-2xl overflow-hidden border-2 transition-colors duration-300',
          'bg-surface-900 dark:bg-black',
          borderColor,
        )}
      />

      {/* Scan corners */}
      {isScanning && (
        <>
          <div className="absolute top-3 left-3   h-7 w-7 border-t-[3px] border-l-[3px] border-primary-400 rounded-tl-lg" />
          <div className="absolute top-3 right-3  h-7 w-7 border-t-[3px] border-r-[3px] border-primary-400 rounded-tr-lg" />
          <div className="absolute bottom-3 left-3  h-7 w-7 border-b-[3px] border-l-[3px] border-primary-400 rounded-bl-lg" />
          <div className="absolute bottom-3 right-3 h-7 w-7 border-b-[3px] border-r-[3px] border-primary-400 rounded-br-lg" />
          {/* Animated scan line */}
          <div className="absolute inset-x-5 h-[2px] rounded-full bg-gradient-to-r from-transparent via-primary-400 to-transparent animate-[scanline_2.4s_ease-in-out_infinite]" />
        </>
      )}

      {/* Success overlay */}
      {resultType === 'success' && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-2xl animate-[fadeIn_0.2s_ease-out]">
          <div className="h-20 w-20 flex items-center justify-center rounded-full bg-green-500 animate-[bounceIn_0.4s_cubic-bezier(0.36,0.07,0.19,0.97)]">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
        </div>
      )}

      {/* Duplicate overlay */}
      {resultType === 'duplicate' && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-500/20 rounded-2xl animate-[fadeIn_0.2s_ease-out]">
          <div className="h-20 w-20 flex items-center justify-center rounded-full bg-amber-500">
            <AlertTriangle className="h-10 w-10 text-white" />
          </div>
        </div>
      )}

      {/* Not found / error overlay */}
      {(resultType === 'not_found' || resultType === 'error') && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-2xl animate-[fadeIn_0.2s_ease-out]">
          <div className="h-20 w-20 flex items-center justify-center rounded-full bg-red-500">
            <XCircle className="h-10 w-10 text-white" />
          </div>
        </div>
      )}

      {/* Processing spinner overlay */}
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
          <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      {/* Idle placeholder */}
      {!isScanning && !isProcessing && !resultType && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Camera className="h-12 w-12 text-surface-400" />
          <p className="text-xs text-surface-400">Kamera tidak aktif</p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function ScannerPage() {
  const { events, loading: eventsLoading } = useEvents()
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [scanResult, setScanResult]           = useState<ScanResult>({ type: 'idle' })
  const [stats, setStats]                     = useState<EventStats>({ total: 0, checkedIn: 0, pending: 0 })
  const [statsLoading, setStatsLoading]       = useState(false)
  const [isSoundEnabled, setIsSoundEnabled]   = useState(true)

  // Guard: prevent processing the same token within a short window
  const processingRef  = useRef(false)
  const lastTokenRef   = useRef<string | null>(null)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Auto-select first event ──────────────────────────────
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      const active = events.find((e) => e.status === 'active' || (e as any).status === 'published') ?? events[0]
      setSelectedEventId(active.id)
    }
  }, [events, selectedEventId])

  // ── Fetch event stats ────────────────────────────────────
  const fetchStats = useCallback(async (eventId: string) => {
    if (!eventId) return
    setStatsLoading(true)
    try {
      // Count total guests
      const { count: total } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)

      // Count checked-in
      const { count: checkedIn } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('checked_in', true)

      setStats({
        total:     total     ?? 0,
        checkedIn: checkedIn ?? 0,
        pending:   (total ?? 0) - (checkedIn ?? 0),
      })
    } catch { /* silent */ }
    finally { setStatsLoading(false) }
  }, [])

  useEffect(() => {
    if (selectedEventId) { fetchStats(selectedEventId) }
  }, [selectedEventId, fetchStats])

  // ── QR scan handler ──────────────────────────────────────
  const handleScan = useCallback(async (qrToken: string) => {
    // Prevent concurrent or duplicate-token processing
    if (processingRef.current || qrToken === lastTokenRef.current) return
    if (!selectedEventId) return

    processingRef.current = true
    lastTokenRef.current  = qrToken
    setScanResult({ type: 'processing' })

    // Clear any pending restart timer
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current)

    try {
      // ── Step 1: Resolve QR token → guest ────────────
      const { data: guest, error: invErr } = await supabase
        .from('guests')
        .select('*')
        .eq('qr_code', qrToken)
        .eq('event_id', selectedEventId)
        .single()

      if (invErr || !guest) {
        setScanResult({ type: 'not_found', qrToken })
        isSoundEnabled && playErrorSound()
        scheduleRestart()
        return
      }

      // ── Step 2: Check for existing active check-in ────────
      if (guest.checked_in) {
        setScanResult({
          type:       'duplicate',
          invitation: guest as any,
          previousAt: guest.checked_in_at || new Date().toISOString(),
        })
        isSoundEnabled && playWarningSound()
        scheduleRestart()
        return
      }

      // ── Step 3: Perform check-in ─────────────────────────
      const now = new Date().toISOString()

      const { error: checkinErr } = await supabase
        .from('guests')
        .update({ checked_in: true, checked_in_at: now, checkin_method: 'qr' })
        .eq('id', guest.id)

      if (checkinErr) throw new Error(checkinErr.message)

      setScanResult({
        type:        'success',
        invitation:  guest as any,
        checkedInAt: now,
      })
      isSoundEnabled && playSuccessSound()

      // Refresh stats
      fetchStats(selectedEventId)
      scheduleRestart()

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem'
      setScanResult({ type: 'error', message: msg })
      isSoundEnabled && playErrorSound()
      scheduleRestart()
    } finally {
      processingRef.current = false
      // Allow re-scan of same token after 4s
      setTimeout(() => { lastTokenRef.current = null }, 4000)
    }
  }, [selectedEventId, isSoundEnabled, fetchStats])

  // ── Auto-restart: resume scanning after result shown ─────
  const scheduleRestart = useCallback(() => {
    restartTimerRef.current = setTimeout(() => {
      setScanResult({ type: 'idle' })
    }, AUTO_RESTART_MS)
  }, [])

  // ── Hook: scanner lifecycle ──────────────────────────────
  const {
    state:        scannerState,
    cameras,
    activeCamera,
    cameraError,
    start,
    stop,
    switchCamera,
    isScanning,
  } = useQRScanner({
    containerId: QR_CONTAINER_ID,
    fps:         12,
    qrboxSize:   240,
    onScan:      handleScan,
  })

  // cleanup timers on unmount
  useEffect(() => () => {
    restartTimerRef.current && clearTimeout(restartTimerRef.current)
    stop()
  }, [stop])

  // ── Derived state ────────────────────────────────────────
  const isProcessing  = scanResult.type === 'processing'
  const resultType    = scanResult.type !== 'idle' && scanResult.type !== 'processing'
    ? scanResult.type : undefined
  const selectedEvent = events.find((e) => e.id === selectedEventId)

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <AppLayout title="QR Scanner">
      <div className="max-w-md mx-auto space-y-4 pb-8">

        {/* ── EVENT SELECTOR ──────────────────────────────── */}
        <Card>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide">
              Acara
            </label>
            <div className="relative">
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value)
                  setScanResult({ type: 'idle' })
                  lastTokenRef.current = null
                }}
                disabled={isScanning}
                className={cn(
                  'w-full appearance-none rounded-xl border px-3 py-2.5 pr-8 text-sm font-medium',
                  'bg-surface-50 dark:bg-surface-800',
                  'border-surface-200 dark:border-surface-700',
                  'text-surface-900 dark:text-surface-100',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors',
                )}
              >
                <option value="">— Pilih Acara —</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {(e as any).title ?? (e as any).name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            </div>
          </div>
        </Card>

        {/* ── STATS BAR ────────────────────────────────────── */}
        {selectedEventId && (
          <div className="grid grid-cols-3 gap-2">
            <StatPill
              icon={<Users className="h-4 w-4" />}
              label="Total Tamu"
              value={stats.total}
              color="bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300"
            />
            <StatPill
              icon={<UserCheck className="h-4 w-4" />}
              label="Hadir"
              value={stats.checkedIn}
              color="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
            />
            <StatPill
              icon={<Clock className="h-4 w-4" />}
              label="Belum Hadir"
              value={stats.pending}
              color="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
            />
          </div>
        )}

        {/* ── SCANNER CARD ─────────────────────────────────── */}
        <Card>
          <div className="space-y-4">

            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                  Pemindai Kode QR
                </h2>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  {isScanning
                    ? 'Arahkan kamera ke kode QR tamu'
                    : 'Tekan Mulai untuk mengaktifkan kamera'}
                </p>
              </div>
              {/* Sound toggle */}
              <button
                onClick={() => setIsSoundEnabled((p) => !p)}
                title={isSoundEnabled ? 'Matikan suara' : 'Aktifkan suara'}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors',
                  isSoundEnabled
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-400',
                )}
              >
                {isSoundEnabled ? '🔊' : '🔇'}
              </button>
            </div>

            {/* Viewport */}
            <ScannerViewport
              isScanning={isScanning}
              isProcessing={isProcessing}
              resultType={resultType}
            />

            {/* Camera error */}
            {cameraError && (
              <div className="flex items-start gap-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2.5">
                <CameraOff className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{cameraError}</p>
              </div>
            )}

            {/* Camera selector (multi-cam devices) */}
            {isScanning && cameras.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                <p className="text-xs text-surface-400 self-center">Kamera:</p>
                {cameras.map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => switchCamera(cam.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                      activeCamera === cam.id
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'border-surface-300 dark:border-surface-700 text-surface-500 dark:text-surface-400 hover:border-primary-400',
                    )}
                  >
                    {cam.label.length > 20 ? cam.label.slice(0, 20) + '…' : cam.label}
                  </button>
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-2">
              {!isScanning ? (
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (!selectedEventId) return
                    setScanResult({ type: 'idle' })
                    start()
                  }}
                  disabled={!selectedEventId || scannerState === 'starting'}
                  loading={scannerState === 'starting'}
                  icon={<Zap className="h-4 w-4" />}
                >
                  {scannerState === 'starting' ? 'Membuka Kamera…' : 'Mulai Scan'}
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  variant="danger"
                  onClick={stop}
                  loading={scannerState === 'stopping'}
                  icon={<StopCircle className="h-4 w-4" />}
                >
                  Hentikan
                </Button>
              )}

              {/* Refresh stats */}
              <button
                onClick={() => fetchStats(selectedEventId)}
                disabled={!selectedEventId || statsLoading}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
                  'border-surface-200 dark:border-surface-700',
                  'text-surface-400 hover:text-surface-600 dark:hover:text-surface-200',
                  'hover:bg-surface-50 dark:hover:bg-surface-800',
                  statsLoading && 'opacity-50 cursor-not-allowed',
                )}
                title="Refresh statistik"
              >
                <RefreshCw className={cn('h-4 w-4', statsLoading && 'animate-spin')} />
              </button>
            </div>

            {/* Status label */}
            <div className="flex items-center justify-center gap-2">
              <span className={cn(
                'inline-block h-2 w-2 rounded-full',
                isScanning   ? 'bg-green-500 animate-pulse' :
                isProcessing ? 'bg-amber-500 animate-pulse' :
                'bg-surface-300 dark:bg-surface-600',
              )} />
              <span className="text-xs text-surface-400">
                {isScanning
                  ? `Memindai${selectedEvent ? ` — ${(selectedEvent as any).title ?? (selectedEvent as any).name}` : ''}…`
                  : isProcessing
                  ? 'Memproses kode QR…'
                  : scannerState === 'error'
                  ? 'Kamera tidak tersedia'
                  : 'Scanner tidak aktif'}
              </span>
            </div>
          </div>
        </Card>

        {/* ── RESULT PANEL ─────────────────────────────────── */}
        <ResultPanel
          result={scanResult}
          onDismiss={() => {
            setScanResult({ type: 'idle' })
            lastTokenRef.current = null
            restartTimerRef.current && clearTimeout(restartTimerRef.current)
          }}
        />

        {/* ── INSTRUCTIONS (idle) ───────────────────────────── */}
        {scanResult.type === 'idle' && !isScanning && (
          <Card className="bg-surface-50/50 dark:bg-surface-900/30">
            <div className="flex items-start gap-3">
              <ScanLine className="h-5 w-5 text-primary-500 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Cara Penggunaan
                </p>
                <ol className="text-xs text-surface-500 dark:text-surface-400 space-y-1 list-decimal list-inside">
                  <li>Pilih acara di dropdown atas</li>
                  <li>Tekan <strong>Mulai Scan</strong></li>
                  <li>Izinkan akses kamera saat diminta</li>
                  <li>Arahkan kamera ke kode QR tamu</li>
                  <li>Check-in otomatis setelah QR terdeteksi</li>
                  <li>Scanner akan aktif kembali otomatis setelah 2 detik</li>
                </ol>
              </div>
            </div>
          </Card>
        )}

        {/* ── AUTO-RESTART COUNTDOWN ────────────────────────── */}
        {(scanResult.type === 'success' || scanResult.type === 'duplicate' ||
          scanResult.type === 'not_found' || scanResult.type === 'error') &&
          isScanning && (
          <p className="text-center text-xs text-surface-400 animate-pulse">
            Scanner aktif kembali dalam {AUTO_RESTART_MS / 1000} detik…
          </p>
        )}
      </div>
    </AppLayout>
  )
}
