'use client'

import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface ExportButtonProps {
    onExport: () => Promise<string> // Función que retorna el CSV como string
    filename?: string
    className?: string
}

export function ExportButton({
    onExport,
    filename = 'export.csv',
    className,
}: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false)
    const { toast } = useToast()

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const csvData = await onExport()

            // Crear blob y descargar
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)

            link.setAttribute('href', url)
            link.setAttribute('download', filename)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            toast({
                title: 'Exportación exitosa',
                description: `Archivo ${filename} descargado correctamente`,
            })
        } catch (error) {
            console.error('Error exporting data:', error)
            toast({
                title: 'Error al exportar',
                description: 'No se pudo exportar los datos. Intenta nuevamente.',
                variant: 'destructive',
            })
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <Button
            onClick={handleExport}
            disabled={isExporting}
            variant="outline"
            className={className}
        >
            {isExporting ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                </>
            ) : (
                <>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                </>
            )}
        </Button>
    )
}
