"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Camera, ImageIcon, Upload, Mic, VideoIcon, FileText, Folder, Radio } from "lucide-react"

export type MediaType = "image" | "video" | "audio" | "document"

interface MediaSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: MediaType
  onSelect: (source: string, file?: File) => void
}

export default function MediaSelectionModal({ open, onOpenChange, type, onSelect }: MediaSelectionModalProps) {
  const [selectedTab, setSelectedTab] = useState<string>("device")
  const fileInputRef = useState<HTMLInputElement | null>(null)[1]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onSelect("file", file)
      onOpenChange(false)
    }
  }

  const getAcceptedFileTypes = () => {
    switch (type) {
      case "image":
        return "image/*"
      case "video":
        return "video/*"
      case "audio":
        return "audio/*"
      case "document":
        return ".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
      default:
        return ""
    }
  }

  const renderSourceOptions = () => {
    switch (type) {
      case "image":
        return (
          <>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="device" onClick={() => setSelectedTab("device")}>
                Dispositivo
              </TabsTrigger>
              <TabsTrigger value="camera" onClick={() => setSelectedTab("camera")}>
                Cámara
              </TabsTrigger>
            </TabsList>
            <TabsContent value="device" className="py-4">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef?.click()}
                >
                  <ImageIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Haz clic para seleccionar una imagen</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <Button
                    variant="outline"
                    className="flex flex-col items-center justify-center h-24 p-2"
                    onClick={() => onSelect("gallery")}
                  >
                    <Folder className="w-8 h-8 mb-2" />
                    <span className="text-xs">Galería</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex flex-col items-center justify-center h-24 p-2"
                    onClick={() => onSelect("files")}
                  >
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-xs">Archivos</span>
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="camera" className="py-4">
              <div className="flex flex-col items-center gap-4">
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center w-full h-32 p-2"
                  onClick={() => onSelect("camera")}
                >
                  <Camera className="w-12 h-12 mb-2" />
                  <span>Abrir cámara</span>
                </Button>
              </div>
            </TabsContent>
          </>
        )
      case "video":
        return (
          <>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="device" onClick={() => setSelectedTab("device")}>
                Grabado
              </TabsTrigger>
              <TabsTrigger value="live" onClick={() => setSelectedTab("live")}>
                Live
              </TabsTrigger>
            </TabsList>
            <TabsContent value="device" className="py-4">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef?.click()}
                >
                  <VideoIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Haz clic para seleccionar un video</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <Button
                    variant="outline"
                    className="flex flex-col items-center justify-center h-24 p-2"
                    onClick={() => onSelect("gallery")}
                  >
                    <Folder className="w-8 h-8 mb-2" />
                    <span className="text-xs">Galería</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex flex-col items-center justify-center h-24 p-2"
                    onClick={() => onSelect("files")}
                  >
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-xs">Archivos</span>
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="live" className="py-4">
              <div className="flex flex-col items-center gap-4">
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center w-full h-32 p-2"
                  onClick={() => onSelect("live")}
                >
                  <Radio className="w-12 h-12 mb-2 text-red-500 animate-pulse" />
                  <span>Iniciar transmisión en vivo</span>
                </Button>
              </div>
            </TabsContent>
          </>
        )
      case "audio":
        return (
          <>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="device" onClick={() => setSelectedTab("device")}>
                Dispositivo
              </TabsTrigger>
              <TabsTrigger value="record" onClick={() => setSelectedTab("record")}>
                Grabar
              </TabsTrigger>
            </TabsList>
            <TabsContent value="device" className="py-4">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef?.click()}
                >
                  <Mic className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Haz clic para seleccionar un audio</p>
                </div>
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-24 p-2 w-full"
                  onClick={() => onSelect("files")}
                >
                  <Upload className="w-8 h-8 mb-2" />
                  <span className="text-xs">Archivos</span>
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="record" className="py-4">
              <div className="flex flex-col items-center gap-4">
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center w-full h-32 p-2"
                  onClick={() => onSelect("record")}
                >
                  <Mic className="w-12 h-12 mb-2" />
                  <span>Grabar audio</span>
                </Button>
              </div>
            </TabsContent>
          </>
        )
      case "document":
        return (
          <>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="device" onClick={() => setSelectedTab("device")}>
                Dispositivo
              </TabsTrigger>
              <TabsTrigger value="apps" onClick={() => setSelectedTab("apps")}>
                Apps
              </TabsTrigger>
            </TabsList>
            <TabsContent value="device" className="py-4">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef?.click()}
                >
                  <FileText className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Haz clic para seleccionar un documento</p>
                </div>
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-24 p-2 w-full"
                  onClick={() => onSelect("files")}
                >
                  <Upload className="w-8 h-8 mb-2" />
                  <span className="text-xs">Archivos</span>
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="apps" className="py-4">
              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-24 p-2"
                  onClick={() => onSelect("wps")}
                >
                  <FileText className="w-8 h-8 mb-2" />
                  <span className="text-xs">WPS Office</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-24 p-2"
                  onClick={() => onSelect("google-docs")}
                >
                  <FileText className="w-8 h-8 mb-2" />
                  <span className="text-xs">Google Docs</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-24 p-2"
                  onClick={() => onSelect("notes")}
                >
                  <FileText className="w-8 h-8 mb-2" />
                  <span className="text-xs">Notas</span>
                </Button>
              </div>
            </TabsContent>
          </>
        )
      default:
        return null
    }
  }

  const getTitle = () => {
    switch (type) {
      case "image":
        return "Seleccionar imagen"
      case "video":
        return "Seleccionar video"
      case "audio":
        return "Seleccionar audio"
      case "document":
        return "Seleccionar documento"
      default:
        return "Seleccionar archivo"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="device" className="w-full">
          {renderSourceOptions()}
        </Tabs>
        <input
          type="file"
          ref={fileInputRef}
          accept={getAcceptedFileTypes()}
          onChange={handleFileChange}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  )
}
