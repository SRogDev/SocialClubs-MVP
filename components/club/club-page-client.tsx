'use client'

import { Image } from '@imagekit/next'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, Crown, Lock, Users, ArrowLeft, Settings } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Widget selection now lives inside ChatContentCreationBar
import MediaSelectionModal from '@/components/post/media-selection-modal'
import type { MediaType } from '@/components/post/media-selection-modal'
import { ClubLevelBadge } from '@/components/shared/ClubLevelBadge'
import { usePostStore } from '@/stores/post'
import { useToast } from '@/hooks/use-toast'
import { joinClubAction } from '@/app/actions/clubActions'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import ChatContentCreationBar from '@/components/chats/chat-content-creation-bar'
import ContentCreationBar from '@/components/club/content-creation-bar'
import FloatingJoinButton from '@/components/club/floating-join-button'
import { PwaInstallBanner } from '@/components/club/PwaInstallBanner'
import PostCard from '@/components/post/post-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SpotlightCard } from '@/components/ui/spotlight'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Club, Channel } from '@/types/club'

const WelcomeClubMessage = dynamic(
    () => import('@/components/club/welcome-club-message'),
    { ssr: false }
)

interface ClubPageClientProps {
    club: Club
    channels: Channel[]
    isMember: boolean
    isCreator: boolean
    userId: string | null
    initialPosts?: any[]
    /** True when the URL contains ?joined=true — triggers PWA install banner */
    showPwaPrompt?: boolean
}

export function ClubPageClient({
    club,
    channels,
    isMember,
    isCreator,
    userId,
    initialPosts = [],
    showPwaPrompt = false,
}: ClubPageClientProps) {
    const storePosts = usePostStore((s) => s.posts)
    const posts = storePosts.length > 0 ? storePosts : initialPosts
    const { toast } = useToast()
    const router = useRouter()

    const firstChannelId = channels[0]?.id?.toString() ?? 'general'
    const [activeTab, setActiveTab] = useState(firstChannelId)
    const [showMediaModal, setShowMediaModal] = useState(false)
    const [currentMediaType, setCurrentMediaType] = useState<MediaType>('image')
    const [availableSuperlikes, setAvailableSuperlikes] = useState(10)
    const [showJoinAnimation, setShowJoinAnimation] = useState(false)
    const [hasJoined, setHasJoined] = useState(false)
    const [showUI, setShowUI] = useState(true)
    const [lastScrollY, setLastScrollY] = useState(0)

    const contentRef = useRef<HTMLDivElement>(null)

    const isVisitor = !isMember
    const visibleChannels = isVisitor ? channels.slice(0, 1) : channels
    const effectiveActiveTab = isVisitor ? firstChannelId : activeTab

    const clubImageUrl =
        club.logo && typeof club.logo === 'object' && 'url' in club.logo
            ? (club.logo.url as string)
            : '/placeholder.svg'
    const clubColor = club.color || '#f97316'
    const clubName = club.name || 'Club'

    // Hide bottom nav while inside club view
    useEffect(() => {
        const bottomNav = document.querySelector('[data-bottom-nav]') as HTMLElement
        if (bottomNav) bottomNav.style.display = 'none'
        return () => {
            if (bottomNav) bottomNav.style.display = ''
        }
    }, [])

    // Auto-hide chrome on downward scroll
    useEffect(() => {
        const el = contentRef.current
        if (!el) return
        const onScroll = () => {
            const cur = el.scrollTop
            if (cur > lastScrollY + 10) setShowUI(false)
            else if (cur < lastScrollY - 10) setShowUI(true)
            setLastScrollY(cur)
        }
        el.addEventListener('scroll', onScroll, { passive: true })
        return () => el.removeEventListener('scroll', onScroll)
    }, [lastScrollY])

    const handleJoinClub = useCallback(async () => {
        if (!userId) {
            toast({ title: 'Inicia sesión para unirte', description: 'Necesitas una cuenta para unirte a un club.' })
            router.push('/auth/login')
            return
        }
        // Optimistic: update UI immediately
        setHasJoined(true)
        setShowJoinAnimation(true)
        toast({ title: '¡Te has unido!', description: `Bienvenido a ${clubName}` })

        // Fire server action in background
        joinClubAction(club.id)
            .then((result) => {
                if (!result.success) throw new Error(result.error)
            })
            .catch(() => {
                // Revert on failure
                setHasJoined(false)
                toast({ title: 'Error al unirse', description: 'Inténtalo de nuevo.', variant: 'destructive' })
            })
            .finally(() => setShowJoinAnimation(false))
    }, [club.id, clubName, userId, toast, router])

    return (
        <>
            <WelcomeClubMessage
                clubId={club.id}
                clubName={clubName}
                clubColor={clubColor}
                clubIconUrl={clubImageUrl}
                welcomeMessage={(club as any).welcomeMessage || '¡Bienvenido a la comunidad!'}
            />

            {/* PWA install banner — shown right after a user joins for the first time */}
            <PwaInstallBanner show={showPwaPrompt} clubColor={clubColor} />

            <div className="min-h-screen bg-background flex flex-col">
                {/* ─── Premium sticky header ───────────────────────────── */}
                <div className="sticky top-0 z-50">
                    {/* Subtle color wash behind header */}
                    <div
                        className="absolute inset-0 opacity-[0.07] pointer-events-none"
                        style={{ background: `linear-gradient(90deg, ${clubColor} 0%, transparent 60%)` }}
                        aria-hidden
                    />
                    <div className="relative border-b border-border/50 bg-background/85 backdrop-blur-xl">
                        <div className="flex items-center justify-between px-4 py-3 gap-3">
                            {/* Back + Club identity */}
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => router.push('/clubs')}
                                    aria-label="Volver"
                                >
                                    <ArrowLeft size={18} />
                                </Button>

                                <Link
                                    href={`/clubs/${club.id}/info`}
                                    className="flex items-center gap-2.5 min-w-0 group"
                                >
                                    <div
                                        className="relative h-9 w-9 shrink-0 rounded-xl overflow-hidden ring-2 ring-border group-hover:ring-primary/40 transition-all"
                                    >
                                        <Image
                                            src={clubImageUrl}
                                            alt={`Logo de ${clubName}`}
                                            fill
                                            className="object-cover"
                                            sizes="36px"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <h1 className="font-bold text-sm leading-tight truncate">{clubName}</h1>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Users size={10} aria-hidden />
                                            <span>{(club.total_members ?? 0).toLocaleString()} miembros</span>
                                        </p>
                                    </div>
                                </Link>
                            </div>

                            {/* Right actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {isCreator && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        asChild
                                        aria-label="Panel del club"
                                    >
                                        <Link href={`/clubs/${club.id}/panel`}>
                                            <Settings size={16} />
                                        </Link>
                                    </Button>
                                )}
                                <ClubLevelBadge level={club.level ?? 1} color={clubColor} size="sm" />
                            </div>
                        </div>

                        {/* ─── Channel tabs (always visible) ─── */}
                        <Tabs value={effectiveActiveTab} onValueChange={setActiveTab}>
                            <ScrollArea className="w-full">
                                <TabsList className="w-full flex justify-start px-3 h-10 bg-transparent gap-0.5 border-t border-border/30">
                                    {(visibleChannels.length > 0
                                        ? visibleChannels
                                        : [{ id: 0, club_id: club.id, name: 'General', type: 'free', membership: null }]
                                    ).map((channel) => {
                                        const tabVal = channel.id?.toString() ?? 'general'
                                        const isActiveTab = effectiveActiveTab === tabVal
                                        return (
                                            <TabsTrigger
                                                key={channel.id}
                                                value={tabVal}
                                                className={cn(
                                                    'relative px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200',
                                                    'data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground',
                                                    'data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none'
                                                )}
                                            >
                                                <span className="flex items-center gap-1">
                                                    {channel.name ?? 'Canal'}
                                                    {channel.membership && channel.membership !== 'free' && (
                                                        <Lock size={9} className="opacity-50" aria-label="Canal de pago" />
                                                    )}
                                                </span>
                                                {isActiveTab && (
                                                    <motion.div
                                                        layoutId="tab-indicator"
                                                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                                                        style={{ backgroundColor: clubColor }}
                                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                    />
                                                )}
                                            </TabsTrigger>
                                        )
                                    })}
                                    {isVisitor && channels.length > 1 && (
                                        <span className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground/50 ml-1">
                                            <Lock size={9} aria-hidden />
                                            +{channels.length - 1} más
                                        </span>
                                    )}
                                </TabsList>
                            </ScrollArea>
                        </Tabs>
                    </div>
                </div>

                {/* ─── Scrollable content ──────────────────────────────── */}
                <div className="flex-1 overflow-hidden">
                    <div ref={contentRef} className="h-full overflow-y-auto pb-32">
                        <Tabs value={effectiveActiveTab} onValueChange={setActiveTab}>
                            {(visibleChannels.length > 0
                                ? visibleChannels
                                : [{ id: 0, club_id: club.id, name: 'General', type: 'free', membership: null }]
                            ).map((channel) => {
                                const tabVal = channel.id?.toString() ?? 'general'
                                const isPaid = channel.membership && channel.membership !== 'free'

                                return (
                                    <TabsContent
                                        key={channel.id}
                                        value={tabVal}
                                        className="mt-0 p-0 focus-visible:outline-none"
                                    >
                                        {isPaid ? (
                                            /* ─── Subscription gate ─── */
                                            <div className="flex flex-col items-center justify-center min-h-[65vh] p-6">
                                                <SpotlightCard className="max-w-sm w-full text-center p-8 rounded-2xl border border-border/60 bg-card">
                                                    <div
                                                        className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${clubColor}28, ${clubColor}0a)`,
                                                            border: `1px solid ${clubColor}28`,
                                                        }}
                                                    >
                                                        <Crown size={28} style={{ color: clubColor }} aria-hidden />
                                                    </div>
                                                    <h3 className="text-xl font-bold mb-2">Canal exclusivo</h3>
                                                    <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                                                        Suscríbete para desbloquear el contenido exclusivo de este canal.
                                                    </p>
                                                    <Button
                                                        size="lg"
                                                        className="w-full font-semibold text-white border-0"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${clubColor}, ${clubColor}cc)`,
                                                            boxShadow: `0 4px 24px ${clubColor}38`,
                                                        }}
                                                    >
                                                        Suscribirse ahora
                                                    </Button>
                                                </SpotlightCard>
                                            </div>
                                        ) : (
                                            /* ─── Channel content ─── */
                                            <div className="w-full">
                                                {posts.length > 0 ? (
                                                    posts.map((post) => (
                                                        <PostCard
                                                            key={post.id}
                                                            {...post}
                                                            availableSuperlikes={availableSuperlikes}
                                                            onSuperlikePurchase={() => setAvailableSuperlikes(30)}
                                                            isInsideClub
                                                            clubWidgetId={post.type === 'widget' ? post.content?.club_widget_id : undefined}
                                                            userId={userId}
                                                        />
                                                    ))
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center min-h-[58vh] gap-4 p-8 text-center">
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ duration: 0.4 }}
                                                            className="p-5 rounded-2xl"
                                                            style={{
                                                                background: `linear-gradient(135deg, ${clubColor}14, ${clubColor}05)`,
                                                                border: `1px solid ${clubColor}1e`,
                                                            }}
                                                        >
                                                            <Crown size={32} style={{ color: `${clubColor}80` }} aria-hidden />
                                                        </motion.div>
                                                        <div className="space-y-1.5 max-w-xs">
                                                            <h3 className="font-semibold">Sin publicaciones aún</h3>
                                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                                {isCreator
                                                                    ? 'Crea el primer post para dar la bienvenida a tu comunidad.'
                                                                    : 'Aún no hay publicaciones en este canal.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </TabsContent>
                                )
                            })}
                        </Tabs>
                    </div>
                </div>

                {/* Show UI button when chrome is hidden */}
                <AnimatePresence>
                    {!showUI && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.18 }}
                            className="fixed bottom-20 right-4 z-50 rounded-full p-2.5 shadow-lg text-white"
                            style={{ background: clubColor }}
                            onClick={() => setShowUI(true)}
                            aria-label="Mostrar controles"
                        >
                            <ChevronUp size={20} aria-hidden />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Content creation bar — creators only */}
                <AnimatePresence>
                    {showUI && isCreator && (
                        <motion.div
                            initial={{ y: 0, opacity: 1 }}
                            exit={{ y: 80, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="fixed bottom-0 left-0 right-0 z-20 md:left-[220px]"
                        >
                            <ContentCreationBar clubColor={clubColor} />
                            <ChatContentCreationBar clubId={club.id} userId={userId} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating join button — visitors only */}
                {isVisitor && !hasJoined && (
                    <FloatingJoinButton
                        clubName={clubName}
                        clubIconUrl={clubImageUrl}
                        clubColor={clubColor}
                        onJoin={handleJoinClub}
                        isJoining={showJoinAnimation}
                    />
                )}

                {/* Widget selector is rendered inside ChatContentCreationBar */}
                <MediaSelectionModal
                    open={showMediaModal}
                    onOpenChange={setShowMediaModal}
                    type={currentMediaType}
                    onSelect={(source, file) => console.log(source, file)}
                    clubId={club.id}
                />
            </div>
        </>
    )
}
