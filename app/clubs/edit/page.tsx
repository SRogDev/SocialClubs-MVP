"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface Channel {
  id: string
  name: string
  price: number
  type: "escalonado" | "extra"
}

export default function EditClubPage() {
  const [clubName, setClubName] = useState("")
  const [clubImage, setClubImage] = useState("/placeholder.svg?height=100&width=100")
  const [channels, setChannels] = useState<Channel[]>([
    { id: "1", name: "General", price: 0, type: "escalonado" },
    { id: "2", name: "Anuncios", price: 0, type: "escalonado" },
    { id: "3", name: "Recursos", price: 0, type: "escalonado" },
  ])

  const handleAddChannel = () => {
    if (channels.length < 5) {
      setChannels([...channels, { id: Date.now().toString(), name: "", price: 0, type: "escalonado" }])
    }
  }

  const handleRemoveChannel = (id: string) => {
    setChannels(channels.filter((channel) => channel.id !== id))
  }

  const handleChannelChange = (id: string, field: "name" | "price" | "type", value: string | number) => {
    setChannels(channels.map((channel) => (channel.id === id ? { ...channel, [field]: value } : channel)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Club data:", { name: clubName, image: clubImage, channels })
    // Aquí iría la lógica para guardar el club
  }

  // Ordenar canales: primero escalonados de menor a mayor, luego extras
  const sortedChannels = [...channels].sort((a, b) => {
    // Si ambos son del mismo tipo, ordenar por precio
    if (a.type === b.type) {
      return a.price - b.price
    }
    // Si a es escalonado y b no, a va primero
    if (a.type === "escalonado" && b.type !== "escalonado") {
      return -1
    }
    // Si b es escalonado y a no, b va primero
    return 1
  })

  return (
    <div className="container py-6">
      <div className="mb-4">
        <Link href="/clubs" className="flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} className="mr-1" />
          <span>Volver</span>
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Crear Club</h1>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col items-center mb-6">
          <Avatar className="h-24 w-24 mb-2">
            <AvatarImage src={clubImage || "/placeholder.svg"} alt="Club image" />
            <AvatarFallback>CL</AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm" type="button" className="mt-2">
            Cambiar imagen
          </Button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="clubName">Nombre del club</Label>
            <Input
              id="clubName"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Nombre de tu comunidad"
              required
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Canales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sortedChannels.map((channel, index) => (
                  <div key={channel.id} className="space-y-4 pb-4 border-b last:border-0">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`channel-${index}`} className="mb-2 block">
                          Nombre del canal
                        </Label>
                        <Input
                          id={`channel-${index}`}
                          value={channel.name}
                          onChange={(e) => handleChannelChange(channel.id, "name", e.target.value)}
                          placeholder={`Canal ${index + 1}`}
                          required
                        />
                      </div>
                      <div className="w-24">
                        <Label htmlFor={`price-${index}`} className="mb-2 block">
                          Precio ($)
                        </Label>
                        <Input
                          id={`price-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={channel.price}
                          onChange={(e) => handleChannelChange(channel.id, "price", Number.parseFloat(e.target.value))}
                        />
                      </div>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveChannel(channel.id)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      )}
                    </div>

                    {channel.price > 0 && (
                      <div>
                        <Label className="mb-2 block">Tipo de suscripción</Label>
                        <RadioGroup
                          defaultValue={channel.type}
                          className="flex space-x-4"
                          onValueChange={(value) => handleChannelChange(channel.id, "type", value)}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="escalonado" id={`escalonado-${index}`} />
                            <Label htmlFor={`escalonado-${index}`} className="cursor-pointer">
                              Escalonado
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="extra" id={`extra-${index}`} />
                            <Label htmlFor={`extra-${index}`} className="cursor-pointer">
                              Extra
                            </Label>
                          </div>
                        </RadioGroup>
                        {channel.type === "escalonado" && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Los canales escalonados incluyen acceso a todos los canales de menor precio.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              {channels.length < 5 && (
                <Button type="button" variant="outline" className="w-full" onClick={handleAddChannel}>
                  <Plus size={18} className="mr-2" />
                  Añadir canal
                </Button>
              )}
            </CardFooter>
          </Card>

          <Button type="submit" className="w-full">
            Guardar club
          </Button>
        </div>
      </form>
    </div>
  )
}
