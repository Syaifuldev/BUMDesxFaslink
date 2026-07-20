// ============================================================
// hooks/useQRScanner.ts
// Manages html5-qrcode lifecycle:  start → scan → stop
// Abstracts camera selection, state machine, and cleanup
// ============================================================

import { useRef, useState, useCallback, useEffect } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'

export type ScannerState = 'idle' | 'starting' | 'scanning' | 'stopping' | 'error'

export interface Camera {
  id:    string
  label: string
}

interface UseQRScannerOptions {
  containerId:  string
  fps?:         number
  qrboxSize?:   number
  onScan:       (text: string) => void
  onError?:     (err: string) => void
}

interface UseQRScannerReturn {
  state:          ScannerState
  cameras:        Camera[]
  activeCamera:   string | null
  cameraError:    string | null
  start:          (cameraId?: string) => Promise<void>
  stop:           () => Promise<void>
  switchCamera:   (cameraId: string) => Promise<void>
  isScanning:     boolean
}

export function useQRScanner({
  containerId,
  fps       = 12,
  qrboxSize = 250,
  onScan,
  onError,
}: UseQRScannerOptions): UseQRScannerReturn {
  const scannerRef    = useRef<Html5Qrcode | null>(null)
  const [state,          setState]         = useState<ScannerState>('idle')
  const [cameras,        setCameras]       = useState<Camera[]>([])
  const [activeCamera,   setActiveCamera]  = useState<string | null>(null)
  const [cameraError,    setCameraError]   = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      // cleanup on unmount
      if (scannerRef.current) {
        try {
          const s = scannerRef.current.getState()
          if (
            s === Html5QrcodeScannerState.SCANNING ||
            s === Html5QrcodeScannerState.PAUSED
          ) {
            scannerRef.current.stop().catch(() => {})
          }
        } catch { /* ignore */ }
      }
    }
  }, [])

  const stop = useCallback(async () => {
    if (!scannerRef.current) return
    setState('stopping')
    try {
      const s = scannerRef.current.getState()
      if (
        s === Html5QrcodeScannerState.SCANNING ||
        s === Html5QrcodeScannerState.PAUSED
      ) {
        await scannerRef.current.stop()
      }
    } catch { /* ignore */ }
    if (mountedRef.current) {
      setState('idle')
      setActiveCamera(null)
    }
  }, [])

  const start = useCallback(async (cameraId?: string) => {
    setCameraError(null)
    setState('starting')

    try {
      // Enumerate cameras on first call
      let availCameras = cameras
      if (availCameras.length === 0) {
        const devices = await Html5Qrcode.getCameras()
        if (!devices || devices.length === 0) {
          throw new Error('Tidak ada kamera yang ditemukan di perangkat ini.')
        }
        availCameras = devices.map((d) => ({ id: d.id, label: d.label || `Kamera ${d.id.slice(0, 6)}` }))
        if (mountedRef.current) setCameras(availCameras)
      }

      // Prefer rear camera (last in list on Android) or override
      const targetId = cameraId
        ?? availCameras.find((c) =>
            c.label.toLowerCase().includes('back') ||
            c.label.toLowerCase().includes('rear') ||
            c.label.toLowerCase().includes('environment')
          )?.id
        ?? availCameras[availCameras.length - 1]?.id
        ?? availCameras[0].id

      // Stop any existing session first
      if (scannerRef.current) {
        try {
          const s = scannerRef.current.getState()
          if (s === Html5QrcodeScannerState.SCANNING || s === Html5QrcodeScannerState.PAUSED) {
            await scannerRef.current.stop()
          }
        } catch { /* ignore */ }
      } else {
        scannerRef.current = new Html5Qrcode(containerId, { verbose: false })
      }

      await scannerRef.current.start(
        targetId,
        {
          fps,
          qrbox:           { width: qrboxSize, height: qrboxSize },
          aspectRatio:     1.0,
          disableFlip:     false,
          videoConstraints: {
            facingMode: 'environment',
            width:      { ideal: 1280 },
            height:     { ideal: 720 },
          },
        },
        (decodedText) => {
          onScan(decodedText)
        },
        (errMsg) => {
          // Ignore frame-level decode errors (expected for every non-QR frame)
          if (errMsg.includes('No MultiFormat Readers')) return
          onError?.(errMsg)
        },
      )

      if (mountedRef.current) {
        setState('scanning')
        setActiveCamera(targetId)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membuka kamera'
      const friendly = msg.includes('Permission')
        ? 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.'
        : msg.includes('tidak ada') || msg.includes('No camera')
        ? 'Tidak ada kamera yang tersedia di perangkat ini.'
        : msg
      if (mountedRef.current) {
        setCameraError(friendly)
        setState('error')
      }
    }
  }, [cameras, containerId, fps, qrboxSize, onScan, onError])

  const switchCamera = useCallback(async (cameraId: string) => {
    await stop()
    // Small delay to let the DOM settle
    await new Promise((r) => setTimeout(r, 300))
    await start(cameraId)
  }, [stop, start])

  return {
    state,
    cameras,
    activeCamera,
    cameraError,
    start,
    stop,
    switchCamera,
    isScanning: state === 'scanning',
  }
}
