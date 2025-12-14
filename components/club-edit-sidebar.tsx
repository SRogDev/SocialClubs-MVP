"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HelpCircle, Plus, Trash2, BarChart2, Clock, Settings, Award, Calendar, Share2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import ColorPicker from "@/components/color-picker"
import AgendaSection from "@/components/club-edit-sections/agenda-section"
import MarketingSection from "@/components/club-edit-sections/marketing-section"
import AnaliticasSection from "@/components/club-edit-sections/analiticas-section" // Importar AnaliticasSection

interface ClubEditSidebarProps {
  club: {
    id: string
    name: string
    imageUrl: string
    description: string
  }
}

export default function ClubEditSidebar({ club }: ClubEditSidebarProps) {
  const [activeTab, setActiveTab] = useState("general")
  const [clubName, setClubName] = useState(club.name)
  const [clubDescription, setClubDescription] = useState(club.description)
  const [clubImage, setClubImage] = useState(club.imageUrl)
  const [clubColor, setClubColor] = useState("#f97316")
  const [channels, setChannels] = useState([
    { id: "1", name: "General", price: 0, type: "escalonado" },
    { id: "2", name: "Proyectos", price: 5, type: "escalonado" },
    { id: "3", name: "Recursos", price: 10, type: "escalonado" },
    { id: "4", name: "Mentoría", price: 15, type: "extra" },
  ])

  // Estado para la sección de automatización
  const [scheduledMessage, setScheduledMessage] = useState("")
  const [selectedChannel, setSelectedChannel] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [moderationEnabled, setModerationEnabled] = useState(true)

  // Estado para la sección de gamificación
  const [pointRules, setPointRules] = useState([
    { id: "1", action: "Publicar contenido", points: 10 },
    { id: "2", action: "Comentar en publicaciones", points: 5 },
    { id: "3", action: "Recibir likes", points: 2 },
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

  const handleAddPointRule = () => {
    if (pointRules.length < 5) {
      setPointRules([...pointRules, { id: Date.now().toString(), action: "", points: 0 }])
    }
  }

  const handleRemovePointRule = (id: string) => {
    setPointRules(pointRules.filter((rule) => rule.id !== id))
  }

  const handlePointRuleChange = (id: string, field: "action" | "points", value: string | number) => {
    setPointRules(pointRules.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule)))
  }

  const handleSaveChanges = () => {
    console.log("Guardando cambios:", {
      name: clubName,
      description: clubDescription,
      image: clubImage,
      color: clubColor,
      channels,
    })
    // Aquí iría la lógica para guardar los cambios
  }

  const handleScheduleMessage = () => {
    console.log("Mensaje programado:", {
      message: scheduledMessage,
      channel: selectedChannel,
      time: scheduledTime,
    })
    // Aquí iría la lógica para programar el mensaje
    setScheduledMessage("")
    setSelectedChannel("")
    setScheduledTime("")
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold">Editar Club</h2>
        <p className="text-sm text-muted-foreground">Administra y personaliza tu club</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-3 mx-6 mt-2">
          {" "}
          {/* Changed to grid-cols-3 */}
          <TabsTrigger value="general" className="flex flex-col items-center py-2 px-1">
            <Settings size={16} className="mb-1" />
            <span className="text-xs">General</span>
          </TabsTrigger>
          <TabsTrigger value="automatizar" className="flex flex-col items-center py-2 px-1">
            <Clock size={16} className="mb-1" />
            <span className="text-xs">Automatizar</span>
          </TabsTrigger>
          <TabsTrigger value="agenda" className="flex flex-col items-center py-2 px-1">
            <Calendar size={16} className="mb-1" />
            <span className="text-xs">Agenda</span>
          </TabsTrigger>
          <TabsTrigger value="gamificacion" className="flex flex-col items-center py-2 px-1">
            <Award size={16} className="mb-1" />
            <span className="text-xs">Gamificación</span>
          </TabsTrigger>
          <TabsTrigger value="analiticas" className="flex flex-col items-center py-2 px-1">
            <BarChart2 size={16} className="mb-1" />
            <span className="text-xs">Analíticas</span>
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex flex-col items-center py-2 px-1">
            <Share2 size={16} className="mb-1" />
            <span className="text-xs">Marketing</span>
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="general" className="p-6 mt-0">
            <div className="space-y-6">
              <div className="flex flex-col items-center">
                <Avatar className="h-24 w-24 mb-2">
                  <AvatarImage src={clubImage || "/placeholder.svg"} alt={clubName} />
                  <AvatarFallback>{clubName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" type="button" className="mt-2 bg-transparent">
                  Cambiar imagen
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clubName">Nombre del club</Label>
                <Input
                  id="clubName"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="Nombre de tu comunidad"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clubDescription">Descripción</Label>
                <Textarea
                  id="clubDescription"
                  value={clubDescription}
                  onChange={(e) => setClubDescription(e.target.value)}
                  placeholder="Describe tu comunidad"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Color del club</Label>
                <ColorPicker color={clubColor} onChange={setClubColor} />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Canales</h3>
                  {channels.length < 5 && (
                    <Button variant="outline" size="sm" onClick={handleAddChannel}>
                      <Plus size={16} className="mr-1" />
                      Añadir canal
                    </Button>
                  )}
                </div>

                {channels.map((channel, index) => (
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
                          disabled={index === 0} // Disable price input for the first channel
                        />
                        {index === 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">Canal gratuito</p>
                        )}
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

              <Button className="w-full" onClick={handleSaveChanges}>
                Guardar cambios
              </Button>

              <div className="mt-8 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-300">En construcción</span>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-400">
                  Próximamente: Personalización avanzada de canales, roles automáticos y configuración de permisos
                  granulares.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="automatizar" className="p-6 mt-0">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-4">Programar mensajes</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledMessage">Mensaje</Label>
                    <Textarea
                      id="scheduledMessage"
                      value={scheduledMessage}
                      onChange={(e) => setScheduledMessage(e.target.value)}
                      placeholder="Escribe tu mensaje programado"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="channelSelect">Canal</Label>
                    <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                      <SelectTrigger id="channelSelect">
                        <SelectValue placeholder="Selecciona un canal" />
                      </SelectTrigger>
                      <SelectContent>
                        {channels.map((channel) => (
                          <SelectItem key={channel.id} value={channel.id}>
                            {channel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduledTime">Hora programada</Label>
                    <Input
                      id="scheduledTime"
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleScheduleMessage}
                    disabled={!scheduledMessage || !selectedChannel || !scheduledTime}
                  >
                    Programar mensaje
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium">Moderación inteligente</h3>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <HelpCircle size={16} />
                              <span className="sr-only">Más información</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              La moderación inteligente utiliza IA para detectar y filtrar contenido inapropiado, spam y
                              mensajes ofensivos automáticamente.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xs text-muted-foreground">Filtra automáticamente contenido inapropiado</p>
                  </div>
                  <Switch checked={moderationEnabled} onCheckedChange={setModerationEnabled} />
                </div>
              </div>

              <div className="mt-8 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-300">En construcción</span>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-400">
                  Próximamente: Bots personalizados, respuestas automáticas, moderación por palabras clave y integración
                  con webhooks.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="agenda" className="mt-0">
            <AgendaSection />
          </TabsContent>

          <TabsContent value="gamificacion" className="p-6 mt-0">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Sistema de puntos</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Define cómo los miembros pueden ganar puntos en tu club (mínimo 3, máximo 5 reglas)
                </p>

                <div className="space-y-4">
                  {pointRules.map((rule, index) => (
                    <div key={rule.id} className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`action-${index}`} className="mb-2 block">
                          Acción
                        </Label>
                        <Input
                          id={`action-${index}`}
                          value={rule.action}
                          onChange={(e) => handlePointRuleChange(rule.id, "action", e.target.value)}
                          placeholder="Ej: Publicar contenido"
                        />
                      </div>
                      <div className="w-24">
                        <Label htmlFor={`points-${index}`} className="mb-2 block">
                          Puntos
                        </Label>
                        <Input
                          id={`points-${index}`}
                          type="number"
                          min="1"
                          value={rule.points}
                          onChange={(e) => handlePointRuleChange(rule.id, "points", Number.parseInt(e.target.value))}
                        />
                      </div>
                      {pointRules.length > 3 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePointRule(rule.id)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      )}
                    </div>
                  ))}

                  {pointRules.length < 5 && (
                    <Button variant="outline" size="sm" onClick={handleAddPointRule} className="w-full bg-transparent">
                      <Plus size={16} className="mr-1" />
                      Añadir regla
                    </Button>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-2">Beneficios por puntos</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Define qué pueden hacer los miembros con sus puntos
                </p>

                <Textarea
                  placeholder="Ej: Desbloquear contenido exclusivo, obtener descuentos en canales premium, etc."
                  rows={4}
                />
              </div>

              <Button className="w-full">Guardar sistema de puntos</Button>

              <div className="mt-8 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-300">En construcción</span>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-400">
                  Próximamente: Logros personalizados, tablas de clasificación, recompensas automáticas y sistema de
                  insignias.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analiticas" className="p-6 mt-0">
            <AnaliticasSection />
          </TabsContent>

          <TabsContent value="marketing" className="mt-0">
            <MarketingSection />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
