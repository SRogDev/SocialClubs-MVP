import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CardContent } from "@/components/ui/card"
import GlassCard from "@/components/ui/glass-card"

type Highlight = {
    id: string
    title: string
    imageUrl: string
}

type ClubHighlightsProps = {
    highlights: Highlight[]
    color: string
}

export default function ClubHighlights({ highlights, color }: ClubHighlightsProps) {
    return (
        <GlassCard
            className="shadow-sm hover:shadow-md transition-all duration-300"
            color={color}
            style={{ borderColor: `${color}40` }}
        >
            <CardContent className="pt-6">
                <h2 className="text-lg font-serif font-semibold mb-4 text-center" style={{ color }}>
                    Highlights
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-2 justify-center">
                    {highlights.map((highlight) => (
                        <div key={highlight.id} className="flex flex-col items-center flex-shrink-0">
                            <div
                                className="w-16 h-16 rounded-full p-1 mb-2 cursor-pointer hover:scale-105 transition-transform"
                                style={{ background: `linear-gradient(45deg, ${color}, ${color}80)` }}
                            >
                                <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                                    <Avatar className="w-12 h-12">
                                        <AvatarImage src={highlight.imageUrl || "/placeholder.svg"} alt={highlight.title} />
                                        <AvatarFallback className="text-xs">{highlight.title.substring(0, 2)}</AvatarFallback>
                                    </Avatar>
                                </div>
                            </div>
                            <span className="text-xs text-center font-medium">{highlight.title}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </GlassCard>
    )
}
