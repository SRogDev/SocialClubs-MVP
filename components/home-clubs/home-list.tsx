import { motion } from 'framer-motion'
import { memo, useMemo } from 'react'

import ClubCard from './club-card'

interface ClubDisplayData {
    id: string
    name: string
    image: string
    color: string
    members: number
    level: number
    lastContent: {
        type: string
        preview: string
        time: string
    }
}

interface HomeListProps {
    clubs: ClubDisplayData[]
}

const HomeList = memo(({ clubs }: HomeListProps) => {
    const items = useMemo(() => clubs, [clubs])
    return (
        <div className="space-y-3">
            {items.map((club, index) => (
                <motion.div
                    key={club.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                >
                    <ClubCard club={club} />
                </motion.div>
            ))}
        </div>
    )
})

export default HomeList
