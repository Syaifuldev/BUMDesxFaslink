import { useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { Guest, Event } from '@/types'
import { formatDate } from '@/lib/utils'

interface InvitationPrintModalProps {
  guest: Guest | null
  event: Event | null
  open: boolean
  onClose: () => void
}

export function InvitationPrintModal({ guest, event, open, onClose }: InvitationPrintModalProps) {
  if (!guest || !event) return null

  const handlePrint = () => {
    window.print()
  }

  // Format Hari, Tanggal with safety fallback
  let hari = '-'
  let tanggal = '-'
  try {
    const dateObj = new Date(event.date)
    hari = dateObj.toLocaleDateString('id-ID', { weekday: 'long' })
    tanggal = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch (e) {
    // ignore
  }

  const qrValue = guest.qr_code || guest.id || 'no-qr'

  return (
    <>
      {/* ── MODAL FOR PREVIEW ──────────────────────────────────────── */}
      <Modal
        open={open}
        onClose={onClose}
        title="Cetak Kartu Undangan"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={handlePrint} icon={<Printer className="h-4 w-4" />}>
              Cetak ke PDF
            </Button>
          </>
        }
      >
          <div className="p-2 sm:p-4 bg-surface-100 dark:bg-surface-800 rounded-xl overflow-hidden flex justify-center w-full">
            {/* Preview Card */}
            <div className="bg-white text-black p-6 sm:p-8 shadow-sm w-full max-w-3xl border relative">
              <div className="text-center mb-6 border-b-2 border-black pb-4">
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider">KARTU UNDANGAN</h1>
                <h2 className="text-lg sm:text-xl font-bold mt-1 text-gray-800">{event.name}</h2>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start justify-between text-center sm:text-left">
                <div className="flex-1 space-y-4 text-base sm:text-lg w-full">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500 font-semibold uppercase">Nama Tamu</p>
                    <p className="font-bold text-lg sm:text-xl">{guest.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500 font-semibold uppercase">Alamat / Instansi</p>
                    <p className="font-medium text-gray-800">{guest.company || '-'}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500 font-semibold uppercase">Waktu & Tempat</p>
                    <p className="font-medium text-gray-800">{hari}, {tanggal}</p>
                    {event.location && <p className="font-medium text-gray-800">{event.location}</p>}
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-center p-3 sm:p-4 border-2 border-dashed border-gray-300 rounded-xl">
                  <QRCodeSVG value={qrValue} size={120} level="H" includeMargin />
                  <p className="text-[10px] sm:text-xs text-center mt-2 text-gray-500 font-mono">SCAN UNTUK MASUK</p>
                </div>
              </div>

              <div className="mt-8 sm:mt-12 flex justify-end">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-800 mb-12 sm:mb-16">Direktur BUMDes Padas Jaya,</p>
                  <p className="font-bold text-base sm:text-lg underline">Ferry Tri Sukarno</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>

      {/* ── PRINT ONLY VIEW ──────────────────────────────────────── */}
      {open && (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999] text-black w-full h-full m-0 p-0">
          <style>
            {`
              @media print {
                @page { margin: 10mm; size: portrait; }
                body { margin: 0; padding: 0; }
              }
            `}
          </style>
          <div className="w-full flex items-start justify-center pt-8">
            {/* Strictly 180mm width guarantees it fits within A4 portrait (210mm) */}
            <div className="w-[180mm] max-w-full border-2 border-black p-6 relative">
              <div className="text-center mb-6 border-b-4 border-black pb-4">
                <h1 className="text-2xl font-black uppercase tracking-widest">KARTU UNDANGAN</h1>
                <h2 className="text-lg font-bold mt-1 text-gray-800 uppercase">{event.name}</h2>
              </div>
              
              <div className="flex gap-6 items-start justify-between">
                <div className="flex-1 space-y-5 text-base">
                  <div>
                    <p className="text-xs text-gray-600 font-bold uppercase tracking-wider mb-1">Nama Tamu</p>
                    <p className="font-black text-xl">{guest.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-600 font-bold uppercase tracking-wider mb-1">Alamat / Instansi</p>
                    <p className="font-bold text-lg text-gray-800">{guest.company || '-'}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-600 font-bold uppercase tracking-wider mb-1">Waktu & Tempat</p>
                    <p className="font-bold text-lg text-gray-800">{hari}, {tanggal}</p>
                    <p className="font-bold text-base text-gray-700 mt-1">{event.location || '-'}</p>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-center p-3 border-4 border-black rounded-xl bg-white">
                  <QRCodeSVG value={qrValue} size={130} level="H" includeMargin />
                  <p className="text-[10px] text-center mt-2 font-bold tracking-widest text-black">SCAN MASUK</p>
                </div>
              </div>

              <div className="mt-12 flex justify-end pr-4">
                <div className="text-center">
                  <p className="text-sm text-gray-800 font-medium mb-16">Direktur BUMDes Padas Jaya,</p>
                  <p className="font-black text-lg underline">Ferry Tri Sukarno</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
