'use client'

import { Image } from '@imagekit/next'
import { motion } from 'framer-motion'
import { AlertTriangle, Edit, Coins, Flame } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'

import SubscriptionSection from '@/components/club/subscription-section'
import CreateClubLink from '@/components/create-club-link'
import SuperlikeModal from '@/components/post/superlike-modal'
import EditProfileModal from '@/components/profile/edit-profile-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import GlassCard from '@/components/ui/glass-card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

import SocialCoinModal from '@/components/Zphase/social-coin-modal'
import { SpotlightCard } from '@/components/ui/spotlight'
import { createClient } from '@/lib/supabase/client'


interface ProfileData {
    name: string
    username: string
    description: string
    imageUrl: string
    subscriptions: number
    socialCoins: number
    superlikes: number
}

interface Subscription {
    id: string
    clubName: string
    clubImage: string
    channelName: string
    price: number
    billingPeriod: string
}

interface ProfileClientProps {
    profile: ProfileData
    subscriptions: Subscription[]
}

export default function ProfileClient({ profile, subscriptions }: ProfileClientProps) {
    const { setTheme, resolvedTheme } = useTheme()
    const router = useRouter()
    const [isDarkMode, setIsDarkMode] = useState(true)
    const [autoPlay, setAutoPlay] = useState(true)
    const [showSocialCoinModal, setShowSocialCoinModal] = useState(false)
    const [showSuperlikeModal, setShowSuperlikeModal] = useState(false)
    const [socialCoins, setSocialCoins] = useState(profile.socialCoins)
    const [superlikes, setSuperlikes] = useState(profile.superlikes)
    const [showEditProfileModal, setShowEditProfileModal] = useState(false)

    // Sync isDarkMode with actual resolved theme
    useEffect(() => {
        if (resolvedTheme) setIsDarkMode(resolvedTheme === 'dark')
    }, [resolvedTheme])

    const handleThemeChange = (checked: boolean) => {
        setIsDarkMode(checked)
        setTheme(checked ? 'dark' : 'light')
    }

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/auth/login')
    }

    const handleDeleteAccount = () => {
        // TODO: implement account deletion
        console.log('Eliminar cuenta')
    }

    const handleCancelSubscription = (id: string) => {
        console.log('Cancelar suscripción:', id)
    }

    return (
        <div className="container py-6 pb-24">
            {/* Avatar + profile card */}
            <div className="flex flex-col items-center mb-6 relative">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full"
                >
                    <GlassCard className="w-full max-w-md p-6 flex flex-col items-center relative">
                        <div className="w-full flex justify-center mb-2">
                            <div className="relative w-[85%] pt-[85%]">
                                <div className="absolute inset-0 rounded-full overflow-hidden ring-2 ring-primary/20">
                                    <Image
                                        src={profile.imageUrl || '/placeholder.svg'}
                                        alt={`Foto de perfil de ${profile.name}`}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 85vw, 340px"
                                    />
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 hover:bg-primary/10 transition-colors"
                            onClick={() => setShowEditProfileModal(true)}
                            aria-label="Editar perfil"
                        >
                            <Edit size={20} className="text-primary" aria-hidden />
                        </Button>
                        <h1 className="text-xl font-sans font-bold">{profile.name}</h1>
                        <p className="text-muted-foreground">@{profile.username}</p>
                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1">
                                <Coins size={16} className="text-primary" aria-hidden />
                                <span className="text-primary font-medium">{socialCoins}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Flame size={16} className="text-orange-500" aria-hidden />
                                <span className="text-orange-600 dark:text-orange-400 font-medium">{superlikes}</span>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>

            {/* Bio + subscriptions */}
            <Card className="mb-6 hover:shadow-md transition-all duration-300">
                <CardContent className="pt-6">
                    <p className="mb-6 font-sans">{profile.description}</p>
                    <SubscriptionSection
                        subscriptionsCount={profile.subscriptions}
                        subscriptions={subscriptions}
                        onCancelSubscription={handleCancelSubscription}
                    />
                </CardContent>
            </Card>

            {/* Settings */}
            <div className="space-y-4">
                <SpotlightCard>
                    <div className="flex items-center justify-between p-4 border rounded-xl hover:border-primary/30 transition-colors">
                        <Label htmlFor="theme-mode" className="font-sans">Tema oscuro</Label>
                        <Switch id="theme-mode" checked={isDarkMode} onCheckedChange={handleThemeChange} />
                    </div>
                </SpotlightCard>

                <SpotlightCard>
                    <div className="flex items-center justify-between p-4 border rounded-xl hover:border-primary/30 transition-colors">
                        <Label htmlFor="auto-play" className="font-sans">Autoplay</Label>
                        <Switch id="auto-play" checked={autoPlay} onCheckedChange={setAutoPlay} />
                    </div>
                </SpotlightCard>

                <SpotlightCard>
                    <div className="flex items-center justify-between p-4 border rounded-xl hover:border-primary/30 transition-colors">
                        <Label htmlFor="language" className="font-sans">Idioma</Label>
                        <select
                            id="language"
                            className="w-32 rounded-full border border-input bg-background px-3 py-1 focus:outline-none focus:border-primary/50 transition-all"
                            defaultValue="es"
                        >
                            <option value="es">Español</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                </SpotlightCard>

                <div className="pt-4 space-y-3">
                    <Button
                        onClick={() => setShowSocialCoinModal(true)}
                        className="w-full shadow-lg hover:shadow-xl transition-shadow group bg-gradient-to-r from-primary to-orange-400 text-white"
                    >
                        <Coins className="mr-2 h-5 w-5 group-hover:animate-bounce" aria-hidden />
                        Comprar SocialCoins
                    </Button>

                    <Button
                        onClick={() => setShowSuperlikeModal(true)}
                        className="w-full shadow-lg hover:shadow-xl transition-shadow group bg-gradient-to-r from-orange-500 to-red-500 text-white"
                    >
                        <Flame className="mr-2 h-5 w-5 group-hover:animate-pulse" aria-hidden />
                        Comprar Superlikes
                    </Button>
                </div>

                <div className="border rounded-xl overflow-hidden">
                    <CreateClubLink />
                </div>

                <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl hover:border-primary/30 transition-all"
                    onClick={handleLogout}
                >
                    Cerrar sesión
                </Button>

                <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl transition-all opacity-50 cursor-not-allowed"
                    disabled
                    title="Próximamente"
                >
                    <AlertTriangle size={16} className="mr-2" aria-hidden />
                    Eliminar cuenta
                </Button>
            </div>

            <SocialCoinModal
                open={showSocialCoinModal}
                onOpenChange={setShowSocialCoinModal}
                onPurchase={(amount) => { setSocialCoins((c) => c + amount); setShowSocialCoinModal(false) }}
            />
            <SuperlikeModal
                open={showSuperlikeModal}
                onOpenChange={setShowSuperlikeModal}
                onPurchase={(amount) => { setSuperlikes((s) => s + amount); setShowSuperlikeModal(false) }}
            />
            {showEditProfileModal && (
                <EditProfileModal
                    open={showEditProfileModal}
                    onOpenChange={setShowEditProfileModal}
                    profile={profile}
                />
            )}
        </div>
    )
}
