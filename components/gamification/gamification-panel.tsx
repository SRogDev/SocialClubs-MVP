'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Zap, TrendingUp, Crown, Medal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export interface UserGamification {
  points: number
  rank: string
  rankIcon: string
  nextRankPoints: number
  currentRankPoints: number
  achievements: Achievement[]
  recentActions: RecentAction[]
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  progress?: number
  maxProgress?: number
}

export interface RecentAction {
  id: string
  action: string
  points: number
  timestamp: string
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatarUrl?: string
  points: number
  rankTitle: string
  isCurrentUser?: boolean
}

interface GamificationPanelProps {
  userGamification: UserGamification
  leaderboard: LeaderboardEntry[]
  clubName: string
}

const RANK_COLORS: Record<string, string> = {
  Novato: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  Explorador: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Miembro: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Veterano: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  Elite: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  Leyenda: 'bg-orange-100 text-primary dark:bg-orange-900/30 dark:text-primary',
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown size={18} className="text-yellow-500" />
  if (rank === 2) return <Medal size={18} className="text-slate-400" />
  if (rank === 3) return <Medal size={18} className="text-primary/70" />
  return <span className="text-xs font-bold text-muted-foreground w-5 text-center">#{rank}</span>
}

export function GamificationPanel({ userGamification, leaderboard, clubName }: GamificationPanelProps) {
  const [tab, setTab] = useState('overview')

  const range = userGamification.nextRankPoints - userGamification.currentRankPoints
  const earned = userGamification.points - userGamification.currentRankPoints
  const progressPct = range > 0 ? Math.round((earned / range) * 100) : 100

  return (
    <div className="space-y-4">
      {/* Points card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="overflow-hidden border border-primary/15 bg-gradient-to-br from-card to-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{clubName}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black">{userGamification.points.toLocaleString()}</span>
                  <Zap size={18} className="text-primary mb-0.5" />
                  <span className="text-xs text-muted-foreground">puntos</span>
                </div>
              </div>
              <div
                className={`px-3 py-1.5 rounded-full text-sm font-semibold ${RANK_COLORS[userGamification.rank] ?? RANK_COLORS['Novato']
                  }`}
              >
                {userGamification.rankIcon} {userGamification.rank}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Próximo rango</span>
                <span>
                  {userGamification.points.toLocaleString()} / {userGamification.nextRankPoints.toLocaleString()}
                </span>
              </div>
              <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-orange-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progressPct, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Actividad</TabsTrigger>
          <TabsTrigger value="leaderboard">Ranking</TabsTrigger>
          <TabsTrigger value="achievements">Logros</TabsTrigger>
        </TabsList>

        {/* Activity tab */}
        <TabsContent value="overview" className="mt-3">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <TrendingUp size={15} className="text-primary" />
                Actividad reciente
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1.5">
              <AnimatePresence>
                {userGamification.recentActions.slice(0, 6).map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0"
                  >
                    <span className="text-sm text-foreground">{a.action}</span>
                    <span className="text-sm font-semibold text-primary">+{a.points}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {userGamification.recentActions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Comienza a participar para ganar puntos
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard tab */}
        <TabsContent value="leaderboard" className="mt-3">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Trophy size={15} className="text-primary" />
                Top miembros
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-1">
              {leaderboard.map((entry, i) => (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl ${entry.isCurrentUser
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted/50'
                    }`}
                >
                  <div className="w-6 flex items-center justify-center">
                    <RankIcon rank={entry.rank} />
                  </div>
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={entry.avatarUrl} />
                    <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">
                      {entry.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${entry.isCurrentUser ? 'text-primary' : ''}`}>
                      {entry.username}
                      {entry.isCurrentUser && <span className="text-xs opacity-60 ml-1">(tú)</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{entry.rankTitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{entry.points.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">pts</p>
                  </div>
                </motion.div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Sin datos aún</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements tab */}
        <TabsContent value="achievements" className="mt-3">
          <div className="grid grid-cols-2 gap-2.5">
            {userGamification.achievements.map((ach, i) => (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card
                  className={`relative overflow-hidden transition-all ${!ach.unlocked ? 'opacity-45 grayscale' : 'border-primary/20'
                    }`}
                >
                  {ach.unlocked && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                  )}
                  <CardContent className="p-3">
                    <div className="text-2xl mb-1.5">{ach.icon}</div>
                    <p className="text-xs font-semibold leading-snug">{ach.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{ach.description}</p>
                    {ach.progress !== undefined && ach.maxProgress !== undefined && (
                      <div className="mt-2 space-y-1">
                        <Progress value={(ach.progress / ach.maxProgress) * 100} className="h-1" />
                        <p className="text-[10px] text-muted-foreground">
                          {ach.progress}/{ach.maxProgress}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {userGamification.achievements.length === 0 && (
              <div className="col-span-2 text-center py-8 text-sm text-muted-foreground">
                No hay logros configurados aún
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
