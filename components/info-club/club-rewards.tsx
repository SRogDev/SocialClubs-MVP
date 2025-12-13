import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Reward = {
    id: string
    title: string
    points: number
    icon: string
}

type ClubRewardsProps = {
    rewards: Reward[]
    color: string
}

export default function ClubRewards({ rewards, color }: ClubRewardsProps) {
    return (
        <GlassCard
            className="shadow-sm hover:shadow-md transition-all duration-300"
            color={color}
            style={{ borderColor: `${color}40` }}
        >
            <CardContent className="pt-6">
                <h2 className="text-lg font-serif font-semibold mb-4 text-center" style={{ color }}>
                    Recompensas disponibles
                </h2>
                <div className="space-y-3">
                    {rewards.map((reward) => (
                        <div
                            key={reward.id}
                            className="flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm"
                            style={{ borderColor: `${color}30`, backgroundColor: `${color}05` }}
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
                                    backgroundColor: color,
                                    color: "white",
                                }}
                            >
                                {reward.points} Pts
                            </Badge>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
