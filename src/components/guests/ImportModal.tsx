import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { excelService } from '@/services/excel.service'
import type { ImportGuestRow, GuestFormData } from '@/types'
import { cn } from '@/lib/utils'

interface ImportModalProps {
  open: boolean
  onClose: () => void
  onImport: (rows: GuestFormData[]) => Promise<unknown>
}

export function ImportModal({ open, onClose, onImport }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [valid, setValid] = useState<ImportGuestRow[]>([])
  const [invalid, setInvalid] = useState<ImportGuestRow[]>([])
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setValid([])
    setInvalid([])
  }

  const handleFile = async (f: File) => {
    setFile(f)
    setParsing(true)
    try {
      const result = await excelService.parseImportFile(f)
      setValid(result.valid)
      setInvalid(result.invalid)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Parse error'
      alert(msg)
    } finally {
      setParsing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.csv') || f.name.endsWith('.xls'))) {
      handleFile(f)
    }
  }

  const handleImport = async () => {
    if (valid.length === 0) return
    setImporting(true)
    try {
      const rows: GuestFormData[] = valid.map(({ _rowIndex: _, _errors: __, ...row }) => row as GuestFormData)
      await onImport(rows)
      onClose()
      reset()
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    if (!importing) { onClose(); reset() }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Guests from Excel"
      description="Upload an Excel (.xlsx) or CSV file to bulk import guests."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} loading={importing} disabled={valid.length === 0}>
            Import {valid.length > 0 && `${valid.length} Guests`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Template download */}
        <button
          onClick={() => excelService.downloadTemplate()}
          className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          <Download className="h-4 w-4" />
          Download Import Template
        </button>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 px-4 cursor-pointer transition-all',
            dragging
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
              : 'border-surface-300 dark:border-surface-700 hover:border-primary-400 hover:bg-surface-50 dark:hover:bg-surface-800/50'
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100 dark:bg-surface-800">
            <FileSpreadsheet className="h-6 w-6 text-surface-400" />
          </div>
          {file ? (
            <div className="text-center">
              <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{file.name}</p>
              <button
                onClick={(e) => { e.stopPropagation(); reset() }}
                className="mt-1 text-xs text-red-500 hover:underline flex items-center gap-1 mx-auto"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Drop file here or click to browse
              </p>
              <p className="text-xs text-surface-400 mt-1">Supports .xlsx, .xls, .csv</p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        {/* Preview */}
        {(valid.length > 0 || invalid.length > 0) && !parsing && (
          <div className="space-y-3">
            {valid.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 p-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    {valid.length} valid rows ready to import
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {valid.slice(0, 3).map((r, i) => (
                      <li key={i} className="text-xs text-green-600 dark:text-green-400">
                        {r.name}{r.company ? ` — ${r.company}` : ''}
                      </li>
                    ))}
                    {valid.length > 3 && (
                      <li className="text-xs text-green-500 dark:text-green-500">
                        +{valid.length - 3} more...
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
            {invalid.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {invalid.length} rows have errors and will be skipped
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {invalid.slice(0, 3).map((r, i) => (
                      <li key={i} className="text-xs text-amber-600 dark:text-amber-400">
                        Row {r._rowIndex}: {r._errors?.join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {parsing && (
          <div className="flex items-center gap-2 text-sm text-surface-500">
            <Upload className="h-4 w-4 animate-bounce" />
            Parsing file...
          </div>
        )}
      </div>
    </Modal>
  )
}
