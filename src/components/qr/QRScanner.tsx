import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { Camera, CameraOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface QRScannerProps {
  onScan: (result: string) => void
  active: boolean
}

const QR_CONTAINER_ID = 'qr-scanner-container'

export function QRScanner({ onScan, active }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null)

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState()
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop()
        }
      } catch { /* ignore */ }
    }
    setScanning(false)
  }, [])

  const startScanner = useCallback(async (cameraId?: string) => {
    setError(null)
    try {
      // Get cameras
      const devices = await Html5Qrcode.getCameras()
      if (!devices || devices.length === 0) {
        setError('No camera found on this device.')
        return
      }
      setCameras(devices)
      const camId = cameraId || devices[devices.length - 1]?.id // prefer rear
      setSelectedCamera(camId)

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(QR_CONTAINER_ID, { verbose: false })
      }

      await scannerRef.current.start(
        camId,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText)
        },
        undefined
      )
      setScanning(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera access denied'
      setError(msg.includes('permission') ? 'Camera permission denied. Please allow camera access.' : msg)
    }
  }, [onScan])

  useEffect(() => {
    if (active) {
      startScanner()
    } else {
      stopScanner()
    }
    return () => { stopScanner() }
  }, [active, startScanner, stopScanner])

  const handleCameraSwitch = async (id: string) => {
    await stopScanner()
    setTimeout(() => startScanner(id), 300)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Camera selector */}
      {cameras.length > 1 && (
        <div className="flex gap-2 flex-wrap justify-center">
          {cameras.map((cam) => (
            <button
              key={cam.id}
              onClick={() => handleCameraSwitch(cam.id)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                selectedCamera === cam.id
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-surface-300 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-primary-400'
              )}
            >
              {cam.label || `Camera ${cam.id.slice(0, 6)}`}
            </button>
          ))}
        </div>
      )}

      {/* Scanner viewport */}
      <div className="relative w-full max-w-xs aspect-square">
        <div
          id={QR_CONTAINER_ID}
          className={cn(
            'w-full h-full rounded-2xl overflow-hidden border-2',
            scanning ? 'border-primary-500' : 'border-surface-300 dark:border-surface-700',
            'bg-surface-900 dark:bg-surface-950'
          )}
        />
        {/* Scan overlay corners */}
        {scanning && (
          <>
            <div className="absolute top-4 left-4 h-8 w-8 border-t-2 border-l-2 border-primary-400 rounded-tl-lg" />
            <div className="absolute top-4 right-4 h-8 w-8 border-t-2 border-r-2 border-primary-400 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-primary-400 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-primary-400 rounded-br-lg" />
            {/* Animated scan line */}
            <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-primary-400 to-transparent animate-[scanline_2s_ease-in-out_infinite] top-1/2" />
          </>
        )}
        {!scanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="h-12 w-12 text-surface-400" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center gap-2 text-center">
          <CameraOff className="h-8 w-8 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => startScanner()}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Retry
          </Button>
        </div>
      )}

      {scanning && (
        <p className="text-sm text-surface-500 dark:text-surface-400 animate-pulse">
          Point camera at a QR code...
        </p>
      )}
    </div>
  )
}
