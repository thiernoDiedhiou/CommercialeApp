import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface Props {
  isOpen: boolean
  onScan: (barcode: string) => void
  onClose: () => void
}

export function BarcodeScannerModal({ isOpen, onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    setError(null)
    setScanning(false)

    let active = true
    let stopControls: (() => void) | null = null
    const reader = new BrowserMultiFormatReader()

    reader
      .decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        // Le callback est appelé à chaque frame — on ignore les erreurs
        // (NotFoundException = aucun code trouvé dans le cadre, comportement normal).
        (result) => {
          if (!active || !result) return
          active = false
          stopControls?.()
          onScan(result.getText())
          onClose()
        },
      )
      .then((controls) => {
        stopControls = () => controls.stop()
        if (active) setScanning(true)
      })
      .catch(() => {
        if (active) setError("Impossible d'accéder à la caméra. Vérifiez les permissions.")
      })

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
          {scanning && (
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
            Pointez la caméra vers le code-barres du produit
          </p>
        )}

        <Button variant="outline" className="w-full" onClick={onClose}>
          Annuler
        </Button>
      </div>
    </Modal>
  )
}
