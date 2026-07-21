import { useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { Guest, Event } from '@/types'
import { formatDate } from '@/lib/utils'

interface InvitationPrintModalProps {
  guests: Guest[]
  event: Event | null
  open: boolean
  onClose: () => void
}

export function InvitationPrintModal({ guests, event, open, onClose }: InvitationPrintModalProps) {
  if (!guests.length || !event) return null

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

  const previewGuest = guests[0]

  const renderCard = (guest: Guest) => {
    const q = guest.qr_code || guest.id || 'no-qr'
    return (
      <div className="bg-white text-black p-4 sm:p-6 w-full relative">
        <div className="text-center mb-4 border-b-2 border-black pb-3">
          <div className="absolute top-2 left-4 sm:top-4 sm:left-6 flex items-center justify-start h-16 w-32 sm:h-20 sm:w-40">
            <img src="/bumdes_logo.png" alt="BUMDes Logo" className="max-h-full max-w-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
          </div>
          <div className="absolute top-2 right-4 sm:top-4 sm:right-6 flex items-center justify-end h-16 w-32 sm:h-20 sm:w-40">
            <img src="/fastlink_logo.png" alt="Fastlink Logo" className="max-h-full max-w-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
          </div>

          <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider mt-4 sm:mt-2">KARTU UNDANGAN</h1>
          <h2 className="text-base sm:text-lg font-bold mt-1 text-gray-800">{event.name}</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start justify-between text-center sm:text-left">
          <div className="flex-1 space-y-3 text-sm sm:text-base w-full">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 font-semibold uppercase">Nama Tamu</p>
              <p className="font-bold text-lg sm:text-xl">{guest.name}</p>
            </div>
            
            <div>
              <p className="text-xs sm:text-sm text-gray-500 font-semibold uppercase">Alamat</p>
              <p className="font-medium text-gray-800">{guest.company || '-'}</p>
            </div>
            
            <div>
              <p className="text-xs sm:text-sm text-gray-500 font-semibold uppercase">Waktu & Tempat</p>
              <p className="font-medium text-gray-800">{hari}, {tanggal}</p>
              <p className="font-medium text-gray-800">Pukul 06.30 s.d. Selesai</p>
              {event.location && <p className="font-medium text-gray-800 mt-1">{event.location}</p>}
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center p-2 sm:p-3 border-2 border-dashed border-gray-300 rounded-xl">
            <QRCodeSVG 
              value={q} 
              size={100} 
              level="H" 
              includeMargin 
              imageSettings={{
                src: "/bumdes_logo.png",
                height: 26,
                width: 26,
                excavate: true,
              }}
            />
            <p className="text-[9px] sm:text-[10px] text-center mt-1 text-gray-500 font-mono">Scan Saat Registrasi Oleh Panitia</p>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 flex justify-between items-end">
          <div className="text-[10px] sm:text-xs text-gray-600 font-medium pb-2 italic text-left">
            * NB: Harap undangan dibawa
          </div>
          <div className="text-center flex flex-col items-center">
            <p className="text-xs sm:text-sm text-gray-800 relative z-10">Direktur BUMDes Padas Jaya,</p>
            <div className="h-16 sm:h-20 flex items-center justify-center my-0 relative">
              <img src="/ttd_direktur.png" alt="Tanda Tangan" className="max-h-full max-w-full object-contain mix-blend-multiply" onError={(e) => e.currentTarget.style.display = 'none'} />
            </div>
            <p className="font-bold text-sm sm:text-base underline relative z-10">Ferry Tri Sukarno</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ── MODAL FOR PREVIEW ──────────────────────────────────────── */}
      <div className="print:hidden">
        <Modal
          open={open}
          onClose={onClose}
          title={guests.length > 1 ? `Cetak ${guests.length} Kartu Undangan` : "Cetak Kartu Undangan"}
          size="3xl"
        footer={
          <>
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={handlePrint} icon={<Printer className="h-4 w-4" />}>
              {guests.length > 1 ? `Cetak ${guests.length} PDF` : "Cetak ke PDF"}
            </Button>
          </>
        }
      >
          <div className="p-2 sm:p-4 bg-surface-100 dark:bg-surface-800 rounded-xl overflow-hidden flex justify-center w-full">
            {/* Preview Card */}
            <div className="w-[195mm] max-w-full shadow-sm border border-gray-200 bg-white mx-auto">
              {renderCard(previewGuest)}
            </div>
          </div>
          {guests.length > 1 && (
            <p className="text-center text-sm text-surface-500 mt-4">
              Menampilkan pratinjau tamu pertama. {guests.length - 1} kartu lainnya akan dicetak otomatis.
            </p>
          )}
        </Modal>
      </div>

      {/* ── PRINT ONLY VIEW ──────────────────────────────────────── */}
      {open && (
        <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-[9999] text-black m-0 p-0 overflow-visible">
          <style>
            {`
              @media print {
                @page { margin: 5mm; size: portrait; }
                body { margin: 0; padding: 0; }
                .print-page-break { page-break-after: always; }
                .print-page-break:last-child { page-break-after: auto; }
              }
            `}
          </style>
          
          {guests.map((g, idx) => {
            const q = g.qr_code || g.id || 'no-qr'
            return (
              <div key={g.id || idx} className="w-full flex items-start justify-center pt-2 print-page-break">
                {/* 195mm width to fit nicely within F4 (210/215mm) with small margins */}
                <div className="w-[195mm] max-w-full">
                  {renderCard(g)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
