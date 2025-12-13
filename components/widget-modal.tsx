"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { availableWidgets } from "@/components/all-widget"
import Widget from "@/components/widget"

interface WidgetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  widgetType: string
}

export default function WidgetModal({ open, onOpenChange, widgetType }: WidgetModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [isPublishing, setIsPublishing] = useState(false)
  const { toast } = useToast()

  // Encontrar la configuración del widget seleccionado
  const widgetConfig = availableWidgets.find((w) => w.id === widgetType)

  if (!widgetConfig) {
    return null
  }

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }))
  }

  const validateForm = () => {
    // Validar campos requeridos
    for (const field of widgetConfig.modalConfig.fields) {
      if (!formData[field.id] || formData[field.id].trim() === "") {
        toast({
          title: `${field.label} es requerido`,
          description: `Por favor completa el campo ${field.label.toLowerCase()}`,
          variant: "destructive",
        })
        return false
      }

      // Validación específica para URLs en caso de Magic Link
      if (field.id === "url" && widgetType === "magic-link") {
        if (!isValidUrl(formData.url)) {
          toast({
            title: "URL inválida",
            description: "Por favor ingresa una URL válida",
            variant: "destructive",
          })
          return false
        }
      }
    }
    return true
  }

  const handlePublish = () => {
    if (!validateForm()) {
      return
    }

    setIsPublishing(true)

    // Simulamos el envío al chat
    setTimeout(() => {
      // Crear el widget en el chat (simulado)
      console.log(`Widget ${widgetType} publicado:`, formData)

      // Mostrar toast de éxito
      toast({
        title: `${widgetConfig.name} publicado`,
        description: `Tu ${widgetConfig.name} ha sido publicado en el chat`,
      })

      // Cerrar el modal y resetear estados
      setIsPublishing(false)
      setFormData({})
      onOpenChange(false)

      // Simulamos la inserción del widget en el chat
      const widgetContainer = document.createElement("div")
      widgetContainer.className = "mb-4"

      // Renderizar el widget en el DOM (esto es solo para simulación)
      // En una implementación real, esto se manejaría a través del estado de React
      const widgetElement = document.createElement("div")
      widgetElement.className = "widget-preview"
      widgetElement.innerHTML = `
        <div class="p-4 border rounded-lg shadow-sm bg-background">
          <div class="flex items-center mb-2">
            <span class="mr-2 text-primary">⚡</span>
            <h3 class="font-medium">${formData.title || "Widget"}</h3>
          </div>
          <div class="p-2 bg-muted/30 rounded-md">
            ${formData.content || formData.url || "Contenido del widget"}
          </div>
        </div>
      `

      // Aquí se insertaría en un chat real
      console.log("Widget renderizado en el chat:", widgetElement.innerHTML)

      // Simular la aparición del widget en el canal General
      const generalChannel = document.querySelector('[data-channel="general"]')
      if (generalChannel) {
        generalChannel.appendChild(widgetContainer)
      }
    }, 1500)
  }

  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  // Renderizar vista previa según el tipo de widget
  const renderPreview = () => {
    // Verificar si hay datos suficientes para mostrar una vista previa
    const hasRequiredData = widgetConfig.modalConfig.fields.every(
      (field) => formData[field.id] && formData[field.id].trim() !== "",
    )

    if (!hasRequiredData) {
      return null
    }

    // Crear datos para la vista previa
    const previewData = {
      type: widgetType,
      ...formData,
    }

    return (
      <div className="p-4 border rounded-lg bg-muted/30">
        <h4 className="text-sm font-medium mb-2">Vista previa:</h4>
        <Widget data={previewData} preview={true} />
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {widgetConfig.icon && <widgetConfig.icon className="mr-2 h-5 w-5 text-primary" />}
            {widgetConfig.modalConfig.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {widgetConfig.modalConfig.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={field.id}
                  placeholder={field.placeholder}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  rows={4}
                />
              ) : (
                <Input
                  id={field.id}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                />
              )}
            </div>
          ))}

          {/* Vista previa dinámica */}
          {renderPreview()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? (
              "Publicando..."
            ) : (
              <>
                <Send size={16} className="mr-2" />
                {widgetConfig.modalConfig.submitLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
