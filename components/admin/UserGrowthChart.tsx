'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'

interface UserGrowthChartProps {
    data: Array<{
        date: string
        users: number
    }>
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
    const chartConfig = {
        users: {
            label: 'Usuarios',
            color: 'hsl(var(--primary))',
        },
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>Crecimiento de usuarios últimos 30 días</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="date"
                                className="text-xs"
                                tickMargin={8}
                            />
                            <YAxis
                                className="text-xs"
                                tickMargin={8}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Area
                                type="monotone"
                                dataKey="users"
                                stroke="var(--color-users)"
                                fill="var(--color-users)"
                                fillOpacity={0.2}
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
