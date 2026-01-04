"use client"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Edit, Coins, Flame } from "lucide-react"
import { useTheme } from "next-themes"
import SubscriptionSection from "@/components/club/subscription-section"
import SocialCoinModal from "@/components/Zphase/social-coin-modal"
import GlassCard from "@/components/ui/glass-card"
import CreateClubLink from "@/components/create-club-link"
import SuperlikeModal from "@/components/post/superlike-modal"
import EditProfileModal from "@/components/profile/edit-profile-modal"
import { useRouter } from "next/navigation"

// Datos de ejemplo para el perfil
const mockProfile = {
  name: "Juan Pérez",
  username: "juanperez",
  description:
    "Desarrollador web y entusiasta de la tecnología. Me encanta aprender cosas nuevas y compartir conocimientos.",
  imageUrl: "/placeholder.svg?height=100&width=100",
  subscriptions: 5,
  socialCoins: 120,
  superlikes: 10,
}

// Datos de ejemplo para las suscripciones
const mockSubscriptions = [
  {
    id: "1",
    clubName: "Programación",
    clubImage: "/placeholder.svg?height=60&width=60",
    channelName: "Recursos Premium",
    price: 5,
    billingPeriod: "monthly",
  },
  {
    id: "2",
    clubName: "Diseño UX/UI",
    clubImage: "/placeholder.svg?height=60&width=60",
    channelName: "Tutoriales Avanzados",
    price: 8,
    billingPeriod: "monthly",
  },
  {
    id: "3",
    clubName: "Marketing Digital",
    clubImage: "/placeholder.svg?height=60&width=60",
    channelName: "Estrategias SEO",
    price: 10,
    billingPeriod: "monthly",
  },
  {
    id: "4",
    clubName: "Fotografía",
    clubImage: "/placeholder.svg?height=60&width=60",
    channelName: "Edición Profesional",
    price: 15,
    billingPeriod: "yearly",
  },
  {
    id: "5",
    clubName: "Emprendimiento",
    clubImage: "/placeholder.svg?height=60&width=60",
    channelName: "Mentorías",
    price: 20,
    billingPeriod: "monthly",
  },
]

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }
  const { theme, setTheme } = useTheme()
  const [isDarkMode, setIsDarkMode] = useState(true) // Dark mode enabled by default
  const [autoPlay, setAutoPlay] = useState(true) // Auto play enabled by default
  const [showSocialCoinModal, setShowSocialCoinModal] = useState(false)
  const [showSuperlikeModal, setShowSuperlikeModal] = useState(false)
  const [socialCoins, setSocialCoins] = useState(mockProfile.socialCoins)
  const [superlikes, setSuperlikes] = useState(mockProfile.superlikes)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)


  // Set dark theme by default on component mount
  useEffect(() => {
    setTheme("dark")
  }, [setTheme])

  const handleThemeChange = (checked: boolean) => {
    setIsDarkMode(checked)
    setTheme(checked ? "dark" : "light")
  }

  const handleLogout = async () => {
    console.log("Cerrar sesión")
    const { error } = await signOut();

    if (error) {
      alert(`Ha ocurrido un error: ${error}`)
      return
    } else {
      window.location.href = '/login'

    }
    // Aquí iría la lógica para cerrar sesión
  }

  const handleDeleteAccount = () => {
    console.log("Eliminar cuenta")
    // Aquí iría la lógica para eliminar la cuenta
  }

  const handleCancelSubscription = (id: string) => {
    console.log("Cancelar suscripción:", id)
    // Aquí iría la lógica para cancelar la suscripción
  }

  const handlePurchaseSocialCoins = (amount: number) => {
    console.log(`Comprando ${amount} SocialCoins`)
    setSocialCoins(socialCoins + amount)
    setShowSocialCoinModal(false)
  }

  const handlePurchaseSuperlikes = (amount: number) => {
    console.log(`Comprando ${amount} Superlikes`)
    setSuperlikes(superlikes + amount)
    setShowSuperlikeModal(false)
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col items-center mb-6 relative">
        <GlassCard className="w-full max-w-md p-6 flex flex-col items-center">
          {/* Avatar que ocupa casi todo el espacio */}
          <div className="w-full flex justify-center mb-2">
            <div className="relative w-[85%] pt-[85%]">
              <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-transparent">
                <img
                  src={mockProfile.imageUrl || "/placeholder.svg"}
                  alt={mockProfile.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all hover:scale-105"
            onClick={() => setShowEditProfileModal(true)}
          >
            <Edit size={20} className="text-amber-600 dark:text-amber-400" />
            <span className="sr-only">Editar perfil</span>
          </Button>
          <h1 className="text-xl font-serif font-bold">{mockProfile.name}</h1>
          <p className="text-muted-foreground">@{mockProfile.username}</p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center">
              <Coins size={16} className="text-amber-500 mr-1" />
              <span className="text-amber-600 dark:text-amber-400 font-medium">{socialCoins}</span>
            </div>
            <div className="flex items-center">
              <div className="relative mr-1">
                <Flame size={16} className="text-orange-500" />
                <div className="absolute inset-0 rounded-full border border-orange-500 animate-pulse"></div>
              </div>
              <span className="text-orange-600 dark:text-orange-400 font-medium">{superlikes}</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <Card className="mb-6 hover:shadow-md transition-all duration-300">
        <CardContent className="pt-6">
          <p className="mb-6 font-serif">{mockProfile.description}</p>

          <SubscriptionSection
            subscriptionsCount={mockProfile.subscriptions}
            subscriptions={mockSubscriptions}
            onCancelSubscription={handleCancelSubscription}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-xl hover:border-amber-200 dark:hover:border-amber-800 transition-colors">
          <div className="flex items-center space-x-2">
            <Label htmlFor="theme-mode" className="font-serif">
              Tema oscuro
            </Label>
            <Switch id="theme-mode" checked={isDarkMode} onCheckedChange={handleThemeChange} />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-xl hover:border-amber-200 dark:hover:border-amber-800 transition-colors">
          <div className="flex items-center space-x-2">
            <Label htmlFor="auto-play" className="font-serif">
              Autoplay
            </Label>
            <Switch id="auto-play" checked={autoPlay} onCheckedChange={setAutoPlay} />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between p-4 border rounded-xl hover:border-amber-200 dark:hover:border-amber-800 transition-colors">
            <Label htmlFor="language" className="font-serif">
              Idioma
            </Label>
            <select
              id="language"
              className="w-32 rounded-full border border-input bg-background px-3 py-1 focus:outline-none transition-all focus:border-amber-300 dark:focus:border-amber-700"
              defaultValue="es"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <Button
            onClick={() => setShowSocialCoinModal(true)}
            variant="gradient"
            className="w-full shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] group"
          >
            <Coins className="mr-2 h-5 w-5 group-hover:animate-bounce" />
            Comprar SocialCoins
          </Button>

          <Button
            onClick={() => setShowSuperlikeModal(true)}
            variant="gradient"
            className="w-full shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] group bg-gradient-to-r from-orange-500 to-red-500"
          >
            <div className="relative mr-2">
              <Flame className="h-5 w-5 group-hover:animate-pulse" />
              <div className="absolute inset-0 rounded-full border border-white/50 group-hover:animate-ping"></div>
            </div>
            Comprar Superlikes
          </Button>
        </div>

        {/* Añadir enlace para crear club */}
        <div className="border rounded-xl overflow-hidden">
          <CreateClubLink />
        </div>

        <Button
          variant="outline"
          className="w-full justify-start rounded-xl hover:border-amber-200 dark:hover:border-amber-800 transition-all"
          onClick={handleLogout}
        >
          Cerrar sesión
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
          onClick={handleDeleteAccount}
        >
          <AlertTriangle size={16} className="mr-2" />
          Eliminar cuenta
        </Button>
      </div>

      <SocialCoinModal
        open={showSocialCoinModal}
        onOpenChange={setShowSocialCoinModal}
        onPurchase={handlePurchaseSocialCoins}
      />

      <SuperlikeModal
        open={showSuperlikeModal}
        onOpenChange={setShowSuperlikeModal}
        onPurchase={handlePurchaseSuperlikes}
      />

      {showEditProfileModal && (
        <EditProfileModal open={showEditProfileModal} onOpenChange={setShowEditProfileModal} profile={mockProfile} />
      )}
    </div>
  )
}
