'use client'

import { Image } from '@imagekit/next'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card3D } from '@/components/ui/card-3d'
import type { Club } from '@/types/club'

interface FeaturedClubCardProps {
  club: Club
  index: number
}

export function FeaturedClubCard({ club, index }: FeaturedClubCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Card3D intensity={10} glow>
        <div className="overflow-hidden border border-border/60 hover:border-primary/30 transition-colors rounded-2xl bg-card">
          <div
            className="h-32 relative"
            style={{ backgroundColor: club.color || '#3B82F6' }}
          >
            {club.logo && typeof club.logo === 'object' && 'url' in club.logo ? (
              <Image
                src={club.logo.url as string}
                alt={club.name || 'Club'}
                fill
                className="object-cover opacity-20"
              />
            ) : null}

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <h3 className="font-bold text-white text-lg truncate">
                {club.name}
              </h3>
            </div>
          </div>

          <div className="p-4">
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3 h-10">
              {club.bio || 'Sin descripción'}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users size={16} />
                <span>{club.total_members?.toLocaleString() || 0}</span>
              </div>

              <Badge
                variant="secondary"
                className="font-semibold"
                style={{
                  backgroundColor: club.color ? `${club.color}20` : undefined,
                  color: club.color || undefined,
                }}
              >
                Nivel {club.level || 1}
              </Badge>
            </div>

            {club.tags && Array.isArray(club.tags) && club.tags.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {club.tags.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs bg-secondary px-2 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card3D>
    </motion.div>
  )
}
