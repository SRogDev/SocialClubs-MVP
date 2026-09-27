'use client'

import { Download } from 'lucide-react'
import { useState } from 'react'

import { exportMetricsAction } from '@/app/actions/adminActions'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export function DashboardExportButton() {
    const [isExporting, setIsExporting] = useState(false)
    const { toast } = useToast()

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const result = await exportMetricsAction()

            if (result.error) {
                toast({
                    title: 'Error al exportar',
                    description: result.error,
                    variant: 'destructive',
                })
                return
            }

            if (result.data) {
                // Crear blob y descargar
                const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' })
                const link = document.createElement('a')
                const url = URL.createObjectURL(blob)
                const timestamp = new Date().toISOString().split('T')[0]

                link.setAttribute('href', url)
                link.setAttribute('download', `metrics-${timestamp}.csv`)
                link.style.visibility = 'hidden'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)

                toast({
                    title: 'Exportación exitosa',
                    description: `Archivo metrics-${timestamp}.csv descargado`,
                })
            }
        } catch (error) {
            console.error('Error exporting:', error)
            toast({
                title: 'Error al exportar',
                description: 'No se pudo exportar los datos',
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
            className="gap-2"
        >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exportando...' : 'Export CSV'}
        </Button>
    )
}
