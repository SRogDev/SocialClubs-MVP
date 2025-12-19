'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'

interface TopClubsChartProps {
    data: Array<{
        name: string
        engagement: number
    }>
}

export function TopClubsChart({ data }: TopClubsChartProps) {
    const chartConfig = {
        engagement: {
            label: 'Engagement',
            color: 'hsl(var(--primary))',
        },
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Clubs</CardTitle>
                <CardDescription>Clubs con mayor engagement</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                type="number"
                                className="text-xs"
                                tickMargin={8}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                className="text-xs"
                                tickMargin={8}
                                width={100}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar
                                dataKey="engagement"
                                fill="var(--color-engagement)"
                                radius={[0, 4, 4, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
