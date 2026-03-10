'use client'

import { memo } from 'react'
import { SpotlightCard } from '@/components/ui/spotlight'
import { Badge } from '@/components/ui/badge'
import { Users, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { Image } from '@imagekit/next'
import type { Club } from '@/types/club'

interface FeedClubCardProps {
  club: Club
  index: number
}

function FeedClubCardInner({ club, index }: FeedClubCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <SpotlightCard className="h-full border border-border/60 bg-card rounded-2xl overflow-hidden">
        <div
          className="h-24 relative"
          style={{ backgroundColor: club.color || '#64748B' }}
        >
          {club.logo && typeof club.logo === 'object' && 'url' in club.logo ? (
            <Image
              src={club.logo.url as string}
              alt={club.name || 'Club'}
              fill
              className="object-cover opacity-30"
            />
          ) : null}

          {club.privacity === 'private' && (
            <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
              <Lock size={14} className="text-white" />
            </div>
          )}

          <Badge
            className="absolute bottom-2 left-2 font-semibold"
            style={{
              backgroundColor: club.color || '#64748B',
              color: 'white',
            }}
          >
            Lvl {club.level || 1}
          </Badge>
        </div>

        <div className="p-3">
          <h3 className="font-semibold text-sm truncate mb-1">
            {club.name}
          </h3>

          <p className="text-xs text-muted-foreground line-clamp-2 mb-2 h-8">
            {club.bio || 'Sin descripción'}
          </p>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users size={12} />
            <span>{club.total_members?.toLocaleString() || 0}</span>
          </div>

          {club.tags && Array.isArray(club.tags) && club.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {club.tags.slice(0, 2).map((tag, i) => (
                <span
                  key={i}
                  className="text-xs bg-secondary px-1.5 py-0.5 rounded-full truncate max-w-[70px]"
                  title={tag}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </SpotlightCard>
    </motion.div>
  )
}

export const FeedClubCard = memo(FeedClubCardInner)
