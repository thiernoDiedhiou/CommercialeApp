import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface Props {
  isOpen: boolean
  onScan: (barcode: string) => void
  onClose: () => void
}

const COOLDOWN_MS = 2000 // évite de scanner deux fois le même code en restant pointé dessus

export function BarcodeScannerModal({ isOpen, onScan, onClose }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const lastScanRef = useRef<{ code: string; time: number } | null>(null)

  const [error,    setError]    = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    setError(null)
    setScanning(false)
    setLastScan(null)
    lastScanRef.current = null

    let active = true
    let stopControls: (() => void) | null = null
    const reader = new BrowserMultiFormatReader()

    ;(async () => {
      // Préfère la caméra arrière sur mobile (autofocus), sinon première caméra disponible
      let deviceId: string | undefined
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices()
        const rearCamera = devices.find((d) => /back|rear|environment/i.test(d.label))
        deviceId = rearCamera?.deviceId ?? devices[0]?.deviceId
      } catch {
        // listVideoInputDevices peut échouer avant la permission — on laisse undefined (auto)
      }

      if (!active) return

      reader
        .decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result) => {
            if (!active || !result) return

            const code = result.getText()
            const now  = Date.now()

            // Cooldown : ignore le même code scanné en moins de 2s
            if (
              lastScanRef.current &&
              lastScanRef.current.code === code &&
              now - lastScanRef.current.time < COOLDOWN_MS
            ) return

            lastScanRef.current = { code, time: now }
            setLastScan(code)
            onScan(code)

            // Efface le feedback après 1.5s — la caméra continue en arrière-plan
            setTimeout(() => setLastScan(null), 1500)
          },
        )
        .then((controls) => {
          stopControls = () => controls.stop()
          if (active) setScanning(true)
        })
        .catch(() => {
          if (active) setError("Impossible d'accéder à la caméra. Vérifiez les permissions.")
        })
    })()

    return () => {
      active = false
      stopControls?.()
      BrowserMultiFormatReader.releaseAllStreams()
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scanner un code-barres" size="sm">
      <div className="space-y-4">
        {/* Viewfinder */}
        <div className="relative overflow-hidden rounded-xl bg-black aspect-[4/3]">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
          />

          {/* Cadre de visée */}
          {scanning && !lastScan && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-52 h-32">
                <span className="absolute top-0 left-0 h-5 w-5 border-t-2 border-l-2 border-white rounded-tl" />
                <span className="absolute top-0 right-0 h-5 w-5 border-t-2 border-r-2 border-white rounded-tr" />
                <span className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-white rounded-bl" />
                <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-white rounded-br" />
                <div className="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-0.5 bg-red-400 opacity-80 animate-pulse" />
              </div>
            </div>
          )}

          {/* Feedback scan réussi */}
          {lastScan && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 animate-in fade-in duration-150">
              <div className="rounded-2xl bg-white px-6 py-4 text-center shadow-2xl">
                <div className="mb-1 text-3xl text-ds-green">✓</div>
                <p className="font-mono text-xs text-gray-500">{lastScan}</p>
              </div>
            </div>
          )}

          {/* Spinner d'initialisation */}
          {!scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
            </div>
          )}
        </div>

        {error ? (
          <p className="text-sm text-red-500 text-center">{error}</p>
        ) : (
          <p className="text-xs text-center text-gray-400">
            Scanner continu — pointez vers le code-barres. La caméra reste active entre les scans.
          </p>
        )}

        <Button variant="outline" className="w-full" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </Modal>
  )
}
