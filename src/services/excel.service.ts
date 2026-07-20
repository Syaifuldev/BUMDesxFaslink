import * as XLSX from 'xlsx'
import type { Guest, ImportGuestRow, CheckinLog } from '@/types'
import { formatDateTime } from '@/lib/utils'
import { downloadBlob } from '@/lib/utils'

export const excelService = {
  // Parse an imported Excel/CSV file into rows
  async parseImportFile(file: File): Promise<{ valid: ImportGuestRow[]; invalid: ImportGuestRow[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
            defval: '',
            raw: false,
          })

          const valid: ImportGuestRow[] = []
          const invalid: ImportGuestRow[] = []

          rows.forEach((row, idx) => {
            const name = (row['Name'] || row['name'] || row['NAMA'] || row['Nama'] || '').trim()
            const errors: string[] = []

            if (!name) errors.push('Name is required')

            const guest: ImportGuestRow = {
              name,
              company: (row['Alamat'] || row['alamat'] || row['Company'] || row['company'] || '').trim() || undefined,
              _rowIndex: idx + 2,
              _errors: errors,
            }

            if (errors.length > 0) {
              invalid.push(guest)
            } else {
              valid.push(guest)
            }
          })

          resolve({ valid, invalid })
        } catch (err) {
          reject(new Error('Failed to parse file. Please use the provided template.'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  },

  // Download a blank import template
  downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nama', 'Alamat'],
      ['John Doe', 'Jl. Raya No. 123'],
    ])
    ws['!cols'] = [25, 40].map((w) => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Guests')
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    downloadBlob(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      'guest_import_template.xlsx'
    )
  },

  // Export guest list to Excel
  exportGuests(guests: Guest[], eventName: string) {
    const rows = guests.map((g) => ({
      Nama: g.name,
      Alamat: g.company || '',
      'QR Code': g.qr_code,
      'Checked In': g.checked_in ? 'Yes' : 'No',
      'Check-in Time': g.checked_in_at ? formatDateTime(g.checked_in_at) : '',
      'Registered At': formatDateTime(g.created_at),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [25, 40, 36, 12, 22, 22].map((w) => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Guests')
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const safe = eventName.replace(/[^a-z0-9]/gi, '_')
    downloadBlob(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `${safe}_guests.xlsx`
    )
  },

  // Export check-in history
  exportCheckinHistory(logs: CheckinLog[], eventName?: string) {
    const rows = logs.map((log) => ({
      'Guest Name': (log.guest as Guest)?.name || '',
      Email: (log.guest as Guest)?.email || '',
      Company: (log.guest as Guest)?.company || '',
      'Event Name': (log.event as { name: string })?.name || '',
      'Check-in Time': formatDateTime(log.checked_in_at),
      Method: log.method.toUpperCase(),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [22, 25, 20, 25, 22, 10].map((w) => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Check-in History')
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const safe = (eventName || 'all').replace(/[^a-z0-9]/gi, '_')
    downloadBlob(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `${safe}_checkin_history.xlsx`
    )
  },
}
