import { motion } from "framer-motion"

import ClubCard from "./club-card"

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

export default function HomeList({ clubs }: HomeListProps) {
    return (
        <div className="space-y-3">
            {clubs.map((club, index) => (
                <motion.div
                    key={club.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                    <ClubCard club={club} />
                </motion.div>
            ))}
        </div>
    )
}