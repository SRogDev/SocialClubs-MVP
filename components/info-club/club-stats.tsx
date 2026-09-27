import { TrendingUp, Users } from "lucide-react"

import { CardContent } from "@/components/ui/card"
import GlassCard from "@/components/ui/glass-card"

type ClubStatsProps = {
    consultations: number
    newMembersThisMonth: number
    color: string
}

export default function ClubStats({ consultations, newMembersThisMonth, color }: ClubStatsProps) {
    return (
        <div className="grid grid-cols-2 gap-4">
            <GlassCard
                className="shadow-sm hover:shadow-md transition-all duration-300"
                color={color}
                style={{ borderColor: `${color}40` }}
            >
                <CardContent className="pt-4 pb-4 text-center">
                    <div className="flex items-center justify-center mb-1">
                        <TrendingUp size={20} style={{ color }} />
                    </div>
                    <h3 className="text-xl font-bold" style={{ color }}>
                        {consultations}
                    </h3>
                    <p className="text-xs text-muted-foreground">Consultas realizadas</p>
                </CardContent>
            </GlassCard>

            <GlassCard
                className="shadow-sm hover:shadow-md transition-all duration-300"
                color={color}
                style={{ borderColor: `${color}40` }}
            >
                <CardContent className="pt-4 pb-4 text-center">
                    <div className="flex items-center justify-center mb-1">
                        <Users size={20} style={{ color }} />
                    </div>
                    <h3 className="text-xl font-bold" style={{ color }}>
                        {newMembersThisMonth}
                    </h3>
                    <p className="text-xs text-muted-foreground">Miembros nuevos este mes</p>
                </CardContent>
            </GlassCard>
        </div>
    )
}
