"use client"

import type React from "react"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, Coins, Check, Copy, Crown, Shield, Users, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { DotsLoader } from "@/components/ui/spinner"
import GlassCard from "@/components/ui/glass-card"

// Datos de ejemplo para el club
const mockClub = {
  id: "1",
  name: "Programación",
  imageUrl: "/placeholder.svg?height=100&width=100",
  description:
    "Comunidad dedicada a compartir conocimientos y recursos sobre programación, desarrollo web y tecnologías emergentes. Aquí encontrarás desde tutoriales básicos hasta discusiones avanzadas sobre arquitectura de software.",
  members: 1250,
  createdAt: "Enero 2023",
  level: 8, // Nivel del club del 1 al 10
  isAdmin: true, // Para mostrar opciones de administrador
  color: "#f97316", // Color del club
  tags: ["JavaScript", "React", "Node.js", "TypeScript", "Web Dev"], // Máximo 5 etiquetas
  highlights: [
    { id: "1", title: "Tutorial", imageUrl: "/placeholder.svg?height=60&width=60" },
    { id: "2", title: "Proyecto", imageUrl: "/placeholder.svg?height=60&width=60" },
    { id: "3", title: "Tip", imageUrl: "/placeholder.svg?height=60&width=60" },
    { id: "4", title: "Recurso", imageUrl: "/placeholder.svg?height=60&width=60" },
  ],
  rewards: [
    { id: "1", title: "Suscripción Premium", points: 100, icon: "💎" },
    { id: "2", title: "Consulta Gratis", points: 250, icon: "📞" },
    { id: "3", title: "Acceso Beta", points: 500, icon: "🧪" },
  ],
  consultations: 47,
  newMembersThisMonth: 89,
}

// Datos de ejemplo para el usuario
const mockUser = {
  socialCoins: 120,
}

export default function ClubInfoPage({ params }: { params: { id: string } }) {
  const [showTipDialog, setShowTipDialog] = useState(false)
  const [tipAmount, setTipAmount] = useState("10")
  const [socialCoins, setSocialCoins] = useState(mockUser.socialCoins)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const { toast } = useToast()

  // Generar el enlace de invitación
  const inviteLink = `https://socialclubs.com/invite/${mockClub.id}`

  const handleSendTip = async () => {
    setIsProcessing(true)
    // Simulación de envío de propina (reemplazar con lógica real)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Verificar si el monto de la propina es válido
    if (Number.parseInt(tipAmount) > socialCoins) {
      toast({
        title: "Error",
        description: "No tienes suficientes SocialCoins para enviar esta propina.",
        variant: "destructive",
      })
      setIsProcessing(false)
      return
    }

    // Actualizar el estado de las SocialCoins (simulación)
    setSocialCoins(socialCoins - Number.parseInt(tipAmount))

    // Mostrar diálogo de éxito
    setShowSuccessDialog(true)
    setShowTipDialog(false)
    setIsProcessing(false)

    // Mostrar toast de éxito
    toast({
      title: "¡Propina enviada!",
      description: `Has enviado ${tipAmount} SocialCoins a ${mockClub.name}.`,
    })
  }

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
    toast({
      title: "¡Enlace copiado!",
      description: "El enlace de invitación se ha copiado al portapapeles.",
    })
  }

  const getVerificationBadge = () => {
    if (mockClub.level >= 10) {
      return (
        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full p-1 shadow-lg">
          <Crown size={12} className="text-white" />
        </div>
      )
    } else if (mockClub.level >= 5) {
      return (
        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full p-1 shadow-lg">
          <Shield size={12} className="text-white" />
        </div>
      )
    }
    return null
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="mb-4">
        <Link
          href={`/clubs/${params.id}`}
          className="flex items-center text-muted-foreground hover:text-foreground group"
        >
          <ArrowLeft size={18} className="mr-1 group-hover:-translate-x-1 transition-transform" />
          <span>Volver</span>
        </Link>
      </div>

      <div className="flex flex-col items-center mb-6 relative text-center">
        <div className="relative mb-4">
          <Avatar
            className="h-24 w-24 hover:scale-105 transition-transform ring-2"
            style={{ ringColor: `${mockClub.color}40` }}
          >
            <AvatarImage src={mockClub.imageUrl || "/placeholder.svg"} alt={mockClub.name} />
            <AvatarFallback style={{ backgroundColor: `${mockClub.color}20`, color: mockClub.color }}>
              {mockClub.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {getVerificationBadge()}

          <div className="absolute -bottom-2 -right-2">
            <Badge
              className="h-6 px-2 text-xs font-bold shadow-lg"
              style={{
                backgroundColor: mockClub.color,
                color: "white",
              }}
            >
              Nv.{mockClub.level}
            </Badge>
          </div>
        </div>

        {mockClub.isAdmin && (
          <Link href={`/clubs/${params.id}/edit`}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 transition-transform hover:scale-110 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              <Edit size={20} className="text-amber-600 dark:text-amber-400" />
              <span className="sr-only">Editar club</span>
            </Button>
          </Link>
        )}

        <h1 className="text-2xl font-serif font-bold mb-2">{mockClub.name}</h1>

        <div className="flex items-center justify-center gap-3 mb-4">
          <Button
            variant="premium"
            size="sm"
            className="transition-transform hover:scale-105"
            onClick={() => setShowTipDialog(true)}
          >
            <Coins size={16} className="mr-1" />
            Enviar propina
          </Button>
          <div className="flex items-center bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 px-3 py-1 rounded-full shadow-sm">
            <Coins size={14} className="text-amber-500 mr-1" />
            <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">{socialCoins}</span>
          </div>
        </div>
      </div>

      {/* Descripción */}
      <GlassCard
        className="shadow-sm hover:shadow-md transition-all duration-300"
        color={mockClub.color}
        style={{ borderColor: `${mockClub.color}40` }}
      >
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-serif font-semibold mb-3" style={{ color: mockClub.color }}>
                Descripción
              </h2>
              <p className="text-muted-foreground leading-relaxed">{mockClub.description}</p>

              <div className="flex justify-between mt-4 pt-4 border-t" style={{ borderColor: `${mockClub.color}20` }}>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Miembros</h3>
                  <p className="font-serif font-semibold text-lg">{mockClub.members.toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Creado</h3>
                  <p className="font-serif font-semibold text-lg">{mockClub.createdAt}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </GlassCard>

      {/* Enlace de invitación */}
      <GlassCard
        className="shadow-sm hover:shadow-md transition-all duration-300"
        color={mockClub.color}
        style={{ borderColor: `${mockClub.color}40` }}
      >
        <CardContent className="pt-6">
          <h2 className="text-lg font-serif font-semibold mb-3" style={{ color: mockClub.color }}>
            Enlace de invitación
          </h2>
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <Input value={inviteLink} readOnly className="flex-1 text-sm" />
            <Button variant="outline" size="sm" onClick={copyInviteLink}>
              <Copy size={16} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Comparte este enlace para invitar a otros a unirse al club
          </p>
        </CardContent>
      </GlassCard>

      {/* Tags */}
      <GlassCard
        className="shadow-sm hover:shadow-md transition-all duration-300"
        color={mockClub.color}
        style={{ borderColor: `${mockClub.color}40` }}
      >
        <CardContent className="pt-6">
          <h2 className="text-lg font-serif font-semibold mb-4 text-center" style={{ color: mockClub.color }}>
            Etiquetas
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {mockClub.tags.map((tag, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="rounded-full transition-all hover:scale-105 bg-transparent"
                style={{
                  borderColor: mockClub.color,
                  color: mockClub.color,
                  backgroundColor: `${mockClub.color}10`,
                }}
              >
                {tag}
              </Button>
            ))}
          </div>
        </CardContent>
      </GlassCard>

      {/* Highlights */}
      <GlassCard
        className="shadow-sm hover:shadow-md transition-all duration-300"
        color={mockClub.color}
        style={{ borderColor: `${mockClub.color}40` }}
      >
        <CardContent className="pt-6">
          <h2 className="text-lg font-serif font-semibold mb-4 text-center" style={{ color: mockClub.color }}>
            Highlights
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 justify-center">
            {mockClub.highlights.map((highlight) => (
              <div key={highlight.id} className="flex flex-col items-center flex-shrink-0">
                <div
                  className="w-16 h-16 rounded-full p-1 mb-2 cursor-pointer hover:scale-105 transition-transform"
                  style={{ background: `linear-gradient(45deg, ${mockClub.color}, ${mockClub.color}80)` }}
                >
                  <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={highlight.imageUrl || "/placeholder.svg"} alt={highlight.title} />
                      <AvatarFallback className="text-xs">{highlight.title.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <span className="text-xs text-center font-medium">{highlight.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </GlassCard>

      {/* Recompensas */}
      <GlassCard
        className="shadow-sm hover:shadow-md transition-all duration-300"
        color={mockClub.color}
        style={{ borderColor: `${mockClub.color}40` }}
      >
        <CardContent className="pt-6">
          <h2 className="text-lg font-serif font-semibold mb-4 text-center" style={{ color: mockClub.color }}>
            Recompensas disponibles
          </h2>
          <div className="space-y-3">
            {mockClub.rewards.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm"
                style={{ borderColor: `${mockClub.color}30`, backgroundColor: `${mockClub.color}05` }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{reward.icon}</span>
                  <div>
                    <h3 className="font-medium">{reward.title}</h3>
                  </div>
                </div>
                <Badge
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: mockClub.color,
                    color: "white",
                  }}
                >
                  {reward.points} Pts
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </GlassCard>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard
          className="shadow-sm hover:shadow-md transition-all duration-300"
          color={mockClub.color}
          style={{ borderColor: `${mockClub.color}40` }}
        >
          <CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp size={20} style={{ color: mockClub.color }} />
            </div>
            <h3 className="text-xl font-bold" style={{ color: mockClub.color }}>
              {mockClub.consultations}
            </h3>
            <p className="text-xs text-muted-foreground">Consultas realizadas</p>
          </CardContent>
        </GlassCard>

        <GlassCard
          className="shadow-sm hover:shadow-md transition-all duration-300"
          color={mockClub.color}
          style={{ borderColor: `${mockClub.color}40` }}
        >
          <CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center mb-1">
              <Users size={20} style={{ color: mockClub.color }} />
            </div>
            <h3 className="text-xl font-bold" style={{ color: mockClub.color }}>
              {mockClub.newMembersThisMonth}
            </h3>
            <p className="text-xs text-muted-foreground">Miembros nuevos este mes</p>
          </CardContent>
        </GlassCard>
      </div>

      {/* Notificaciones */}
      <div
        className="flex items-center justify-between p-4 border rounded-xl transition-colors"
        style={{
          borderColor: notificationsEnabled ? `${mockClub.color}40` : "transparent",
          backgroundColor: notificationsEnabled ? `${mockClub.color}05` : "transparent",
        }}
      >
        <div className="flex items-center space-x-2">
          <Label htmlFor="notifications" className="text-sm font-medium">
            Notificaciones
          </Label>
          <Switch
            id="notifications"
            checked={notificationsEnabled}
            onCheckedChange={setNotificationsEnabled}
            style={
              {
                "--switch-thumb": notificationsEnabled ? mockClub.color : undefined,
                "--switch-track": notificationsEnabled ? `${mockClub.color}40` : undefined,
              } as React.CSSProperties
            }
          />
        </div>
      </div>

      {/* Diálogo para enviar propina */}
      <Dialog open={showTipDialog} onOpenChange={setShowTipDialog}>
        <DialogContent className="sm:max-w-md rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Enviar propina a {mockClub.name}</DialogTitle>
            <DialogDescription>
              Apoya a este club enviando SocialCoins. Tus propinas ayudan a mantener contenido de calidad.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="tip-amount">Cantidad de SocialCoins</Label>
              <Input
                id="tip-amount"
                type="number"
                min="1"
                max={socialCoins}
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                className="text-center text-lg"
              />
              <p className="text-xs text-center text-muted-foreground">Tienes {socialCoins} SocialCoins disponibles</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTipDialog(false)} className="rounded-full">
              Cancelar
            </Button>
            <Button onClick={handleSendTip} variant="gradient" className="rounded-full" disabled={isProcessing}>
              {isProcessing ? <DotsLoader variant="premium" className="mr-2" /> : <Coins size={16} className="mr-2" />}
              Enviar propina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de éxito */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center font-serif">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full mr-2">
                <Check size={20} className="text-green-500" />
              </div>
              ¡Propina enviada con éxito!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <div className="mb-4 flex justify-center">
              <div className="relative">
                <Coins size={48} className="text-amber-500 animate-pulse" />
                <div className="absolute -top-2 -right-2 bg-green-100 dark:bg-green-900/30 rounded-full p-1">
                  <Check size={16} className="text-green-500" />
                </div>
              </div>
            </div>
            <p className="mb-2 font-serif">
              Excelente, has apoyado al Club <span className="font-bold">{mockClub.name}</span> con{" "}
              <span className="font-bold text-amber-500">{tipAmount} SocialCoins</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Tu apoyo ayuda a mantener contenido de calidad en la plataforma.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="w-full rounded-full transition-all hover:scale-105"
              variant="premium"
            >
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
