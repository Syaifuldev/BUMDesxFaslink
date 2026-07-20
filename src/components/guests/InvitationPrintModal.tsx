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

  // Format Hari, Tanggal
  const dateObj = new Date(event.date)
  const hari = dateObj.toLocaleDateString('id-ID', { weekday: 'long' })
  const tanggal = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      {/* ── MODAL FOR PREVIEW ──────────────────────────────────────── */}
      <div className="print:hidden">
        <Modal
          open={open}
          onClose={onClose}
          title="Cetak Kartu Undangan"
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={onClose}>Batal</Button>
              <Button onClick={handlePrint} icon={<Printer className="h-4 w-4" />}>
                Cetak ke PDF
              </Button>
            </>
          }
        >
          <div className="p-4 bg-surface-100 dark:bg-surface-800 rounded-xl overflow-hidden flex justify-center">
            {/* Preview Card */}
            <div className="bg-white text-black p-8 shadow-sm w-full max-w-2xl border relative">
              <div className="text-center mb-8 border-b-2 border-black pb-4">
                <h1 className="text-2xl font-black uppercase tracking-wider">KARTU UNDANGAN</h1>
                <h2 className="text-xl font-bold mt-1 text-gray-800">{event.name}</h2>
              </div>
              
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start justify-between">
                <div className="flex-1 space-y-4 text-lg">
                  <div>
                    <p className="text-sm text-gray-500 font-semibold uppercase">Nama Tamu</p>
                    <p className="font-bold text-xl">{guest.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 font-semibold uppercase">Alamat / Instansi</p>
                    <p className="font-medium text-gray-800">{guest.company || '-'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 font-semibold uppercase">Waktu & Tempat</p>
                    <p className="font-medium text-gray-800">{hari}, {tanggal}</p>
                    {event.location && <p className="font-medium text-gray-800">{event.location}</p>}
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-xl">
                  <QRCodeSVG value={guest.qr_code} size={150} level="H" includeMargin />
                  <p className="text-xs text-center mt-2 text-gray-500 font-mono">SCAN UNTUK MASUK</p>
                </div>
              </div>

              <div className="mt-12 flex justify-end">
                <div className="text-center">
                  <p className="text-sm text-gray-800 mb-16">Direktur BUMDes Padas Jaya,</p>
                  <p className="font-bold text-lg underline">Ferry Tri Sukarno</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      </div>

      {/* ── PRINT ONLY VIEW ──────────────────────────────────────── */}
      {open && (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999] text-black">
          <div className="w-full h-full p-10 print:p-0 flex items-center justify-center">
            {/* The actual A4 or Card size for print */}
            <div className="w-[800px] border-2 border-black p-10 relative">
              <div className="text-center mb-10 border-b-4 border-black pb-6">
                <h1 className="text-4xl font-black uppercase tracking-widest">KARTU UNDANGAN</h1>
                <h2 className="text-2xl font-bold mt-2 text-gray-800 uppercase">{event.name}</h2>
              </div>
              
              <div className="flex gap-10 items-start justify-between">
                <div className="flex-1 space-y-6 text-xl">
                  <div>
                    <p className="text-base text-gray-600 font-bold uppercase tracking-wider mb-1">Nama Tamu</p>
                    <p className="font-black text-3xl">{guest.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-base text-gray-600 font-bold uppercase tracking-wider mb-1">Alamat / Instansi</p>
                    <p className="font-bold text-2xl text-gray-800">{guest.company || '-'}</p>
                  </div>
                  
                  <div>
                    <p className="text-base text-gray-600 font-bold uppercase tracking-wider mb-1">Waktu & Tempat</p>
                    <p className="font-bold text-2xl text-gray-800">{hari}, {tanggal}</p>
                    <p className="font-bold text-xl text-gray-700 mt-1">{event.location || '-'}</p>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-center p-6 border-4 border-black rounded-2xl bg-white">
                  <QRCodeSVG value={guest.qr_code} size={220} level="H" includeMargin />
                  <p className="text-sm text-center mt-3 font-bold tracking-widest text-black">SCAN UNTUK MASUK</p>
                </div>
              </div>

              <div className="mt-20 flex justify-end pr-10">
                <div className="text-center">
                  <p className="text-lg text-gray-800 font-medium mb-24">Direktur BUMDes Padas Jaya,</p>
                  <p className="font-black text-2xl underline">Ferry Tri Sukarno</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
