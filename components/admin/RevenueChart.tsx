'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

interface RevenueChartProps {
    data: Array<{
        date: string
        revenue: number
    }>
}

export function RevenueChart({ data }: RevenueChartProps) {
    const chartConfig = {
        revenue: {
            label: 'Revenue',
            color: 'hsl(var(--primary))',
        },
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Ingresos de los últimos 30 días</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="date"
                                className="text-xs"
                                tickMargin={8}
                            />
                            <YAxis
                                className="text-xs"
                                tickMargin={8}
                                tickFormatter={(value: number) => `$${value}`}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="var(--color-revenue)"
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
