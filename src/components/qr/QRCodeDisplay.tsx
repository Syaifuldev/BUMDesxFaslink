import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Download, X } from 'lucide-react'
import type { Guest } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils'

interface QRCodeDisplayProps {
  guest: Guest | null
  open: boolean
  onClose: () => void
}

export function QRCodeDisplay({ guest, open, onClose }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleDownload = () => {
    if (!guest || !canvasRef.current) return
    const canvas = canvasRef.current.querySelector('canvas')
    if (!canvas) return

    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `qr_${guest.name.replace(/\s+/g, '_')}_${guest.id.slice(0, 8)}.png`
    a.click()
  }

  if (!guest) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Guest QR Code"
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} icon={<X className="h-4 w-4" />}>
            Close
          </Button>
          <Button size="sm" onClick={handleDownload} icon={<Download className="h-4 w-4" />}>
            Download PNG
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4">
        {/* QR Code */}
        <div
          ref={canvasRef}
          className="flex items-center justify-center p-5 rounded-2xl bg-white shadow-inner border border-surface-100"
        >
          <QRCodeCanvas
            value={guest.qr_code}
            size={200}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Guest Info */}
        <div className="w-full space-y-2 text-center">
          <p className="font-semibold text-surface-900 dark:text-surface-100 text-lg">{guest.name}</p>
          {guest.company && (
            <p className="text-sm text-surface-500 dark:text-surface-400">{guest.company}</p>
          )}
          {(guest.table_number || guest.seat_number) && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {guest.table_number && (
                <Badge variant="purple">Table {guest.table_number}</Badge>
              )}
              {guest.seat_number && (
                <Badge variant="info">Seat {guest.seat_number}</Badge>
              )}
            </div>
          )}
          <div className="flex items-center justify-center">
            {guest.checked_in ? (
              <Badge variant="success" dot>
                Checked in {guest.checked_in_at ? `at ${formatDateTime(guest.checked_in_at)}` : ''}
              </Badge>
            ) : (
              <Badge variant="warning" dot>Not yet checked in</Badge>
            )}
          </div>
        </div>

        {/* QR Code value */}
        <div className="w-full rounded-lg bg-surface-50 dark:bg-surface-800 px-3 py-2 text-center">
          <p className="text-[10px] font-mono text-surface-400 dark:text-surface-500 break-all select-all">
            {guest.qr_code}
          </p>
        </div>
      </div>
    </Modal>
  )
}
