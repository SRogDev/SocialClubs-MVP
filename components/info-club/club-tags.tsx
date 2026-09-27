import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import GlassCard from "@/components/ui/glass-card"

type ClubTagsProps = {
    tags: string[]
    color: string
}

export default function ClubTags({ tags, color }: ClubTagsProps) {
    return (
        <GlassCard
            className="shadow-sm hover:shadow-md transition-all duration-300"
            color={color}
            style={{ borderColor: `${color}40` }}
        >
            <CardContent className="pt-6">
                <h2 className="text-lg font-serif font-semibold mb-4 text-center" style={{ color }}>
                    Etiquetas
                </h2>
                <div className="flex flex-wrap justify-center gap-2">
                    {tags.map((tag, index) => (
                        <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="rounded-full transition-all hover:scale-105 bg-transparent"
                            style={{
                                borderColor: color,
                                color,
                                backgroundColor: `${color}10`,
                            }}
                        >
                            {tag}
                        </Button>
                    ))}
                </div>
            </CardContent>
        </GlassCard>
    )
}
