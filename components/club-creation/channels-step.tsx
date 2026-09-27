"use client"

import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Channel {
    id: string
    name: string
    price: number
    type: "escalonado" | "extra"
}

interface ChannelsStepProps {
    channels: Channel[]
    onAddChannel: () => void
    onRemoveChannel: (id: string) => void
    onChannelChange: (id: string, field: "name" | "price" | "type", value: string | number) => void
}

export function ChannelsStep({
    channels,
    onAddChannel,
    onRemoveChannel,
    onChannelChange
}: ChannelsStepProps) {
    const sortedChannels = [...channels].sort((a, b) => {
        if (a.type === b.type) {
            return a.price - b.price
        }
        if (a.type === "escalonado" && b.type !== "escalonado") {
            return -1
        }
        return 1
    })

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Canales</h2>
                <p className="text-muted-foreground">Configura los canales y sus precios de acceso</p>
            </div>

            <div className="space-y-4">
                {sortedChannels.map((channel, index) => (
                    <Card key={channel.id}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Canal {index + 1}</CardTitle>
                                {channels.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRemoveChannel(channel.id)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor={`channel-name-${channel.id}`}>Nombre del Canal</Label>
                                    <Input
                                        id={`channel-name-${channel.id}`}
                                        value={channel.name}
                                        onChange={(e) => onChannelChange(channel.id, 'name', e.target.value)}
                                        placeholder="Ej: Canal Premium"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`channel-price-${channel.id}`}>
                                        Precio/mes ($) <span className="text-muted-foreground font-normal">— 0 = gratuito</span>
                                    </Label>
                                    <Input
                                        id={`channel-price-${channel.id}`}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={channel.price}
                                        onChange={(e) => onChannelChange(channel.id, 'price', parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                        className={channel.price > 0 && channel.price < 5 ? 'border-destructive' : ''}
                                    />
                                    {channel.price > 0 && channel.price < 5 && (
                                        <p className="text-xs text-destructive mt-1">
                                            Mínimo $5/mes para canales de pago
                                        </p>
                                    )}
                                    {channel.price >= 5 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Anual: ${(channel.price * 10).toFixed(0)}/año (2 meses gratis)
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <Label htmlFor={`channel-type-${channel.id}`}>Tipo de Canal</Label>
                                <Select
                                    value={channel.type}
                                    onValueChange={(value) => onChannelChange(channel.id, 'type', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="escalonado">Escalonado (acceso progresivo)</SelectItem>
                                        <SelectItem value="extra">Extra (contenido adicional)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {channels.length < 5 && (
                    <Button
                        onClick={onAddChannel}
                        variant="outline"
                        className="w-full"
                    >
                        <Plus size={16} className="mr-2" />
                        Agregar Canal
                    </Button>
                )}
            </div>

            <div className="text-sm text-muted-foreground">
                <p><strong>Escalonado:</strong> Canales que se desbloquean progresivamente según el nivel de membresía.</p>
                <p><strong>Extra:</strong> Contenido adicional opcional con precio independiente.</p>
            </div>
        </div>
    )
}