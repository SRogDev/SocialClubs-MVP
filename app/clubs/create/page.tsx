import { Suspense } from "react"
import { ClubCreationWizard } from "@/components/club-creation"

export default function CreateClubPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <ClubCreationWizard />
    </Suspense>
  )
}
const handleChannelChange = (id: string, field: "name" | "price" | "type", value: string | number) => {
  setFormData(prev => ({
    ...prev,
    channels: prev.channels.map((channel) => (channel.id === id ? { ...channel, [field]: value } : channel))
  }))
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  try {
    setIsLoading(true)

    let logoUrl = clubImage

    // Upload logo if file is provided
    if (file) {
      const compressedFile = await compressImage(file as File, 0.7, 800) as File
      const { url, error } = await uploadLogo(compressedFile, `${formData.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`)

      if (error) {
        throw new Error(`Error al subir la imagen: ${error.message}`)
      }

      logoUrl = url || clubImage
      setClubImage(logoUrl)
    }

    // Create club using API route with PostHog tracking
    const club = await createClub({
      name: formData.name,
      logo: { url: logoUrl },
      bio: formData.description,
      color: formData.color,
      privacity: formData.isPrivate ? 'private' : 'public',
      tags: null,
      welcomeMessage: formData.welcomeMessage,
    })

    console.log('Club created successfully:', club)
    setNewClubId(club.id)
    setShowSuccess(true)

  } catch (error) {
    console.error('Error creating club:', error)
    setSnackBarErrorMsg(error instanceof Error ? error.message : "Ocurrió un error al crear el club")
    setSnackBarOpen(true)
  } finally {
    setIsLoading(false)
  }
}



// Efecto para limpiar la URL cuando el componente se desmonte o la imagen cambie
const [previewUrl, setPreviewUrl] = useState<string | null>(null)
useEffect(() => {
  return () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }
}, [previewUrl])

const handleImageChange = (e: Event) => {
  const selectedFile = (e.target as HTMLInputElement).files?.[0]

  if (selectedFile) {
    setFile(selectedFile)
    const imageUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(imageUrl)
  }
}

const sortedChannels = [...formData.channels].sort((a, b) => {
  if (a.type === b.type) {
    return a.price - b.price
  }
  if (a.type === "escalonado" && b.type !== "escalonado") {
    return -1
  }
  return 1
})

const renderTemplateSelection = () => (
  <div className="space-y-8">
    <div className="text-center">
      <h2 className="text-3xl font-bold mb-4">Elige una Plantilla</h2>
      <p className="text-muted-foreground">Selecciona una plantilla para comenzar rápidamente o crea tu club personalizado</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
      <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary" onClick={() => handleTemplateSelect(null)}>
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus size={32} className="text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Custom</h3>
          <p className="text-sm text-muted-foreground">Crea tu club desde cero con configuración personalizada</p>
        </CardContent>
      </Card>

      {clubTemplates.map((template: Template) => (
        <Card key={template.id} className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary" onClick={() => handleTemplateSelect(template)}>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${template.color}20` }}>
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: template.color }} />
            </div>
            <h3 className="text-xl font-semibold mb-2">{template.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
            <div className="flex justify-center gap-2">
              {template.isPrivate ? <LockIcon size={16} /> : <Globe size={16} />}
              <span className="text-xs">{template.isPrivate ? 'Privado' : 'Público'}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)

const renderBasicInfo = () => (
  <div className="space-y-6">
    <div className="flex flex-col items-center mb-6">
      <Avatar className="h-24 w-24 mb-2 ring-4" style={{ ringColor: `${formData.color}40` }}>
        <AvatarImage src={previewUrl || "/placeholder.svg"} alt="Club image" />
        <AvatarFallback style={{ backgroundColor: `${formData.color}20`, color: formData.color }}>
          {formData.name ? formData.name.substring(0, 2).toUpperCase() : "CL"}
        </AvatarFallback>
      </Avatar>
      <Button onClick={() => {
        const input = document.createElement("input")
        input.hidden = true
        input.type = "file"
        input.accept = "image/*"
        input.onchange = (e) => handleImageChange(e)
        document.body.appendChild(input)
        input.click()
      }} variant="outline" size="sm" type="button" className="mt-2 bg-transparent">
        Cambiar imagen
      </Button>
    </div>

    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="clubName">Nombre del club</Label>
        <Input
          id="clubName"
          value={formData.name}
          onChange={(e) => handleFormDataChange('name', e.target.value)}
          placeholder="Nombre de tu comunidad"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clubDescription">Descripción</Label>
        <Textarea
          id="clubDescription"
          value={formData.description}
          onChange={(e) => handleFormDataChange('description', e.target.value)}
          placeholder="Describe tu comunidad"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="welcomeMessage">Mensaje de bienvenida</Label>
        <Textarea
          id="welcomeMessage"
          value={formData.welcomeMessage}
          onChange={(e) => handleFormDataChange('welcomeMessage', e.target.value)}
          placeholder="Mensaje que verán los nuevos miembros"
          rows={3}
        />
      </div>

      <div className="space-y-2 flex flex-col">
        <Label>Privacidad del club</Label>
        <Button type="button" variant="outline" className="bg-transparent"
          onClick={() => handleFormDataChange('isPrivate', !formData.isPrivate)}>
          {formData.isPrivate ? <LockIcon size={18} className="mr-2" /> : <Globe size={18} className="mr-2" />}
          {formData.isPrivate ? "Privado" : "Público"}
        </Button>
      </div>

      <ColorPicker color={formData.color} onChange={(color) => handleFormDataChange('color', color)} />
    </div>
  </div>
)

const renderChannels = () => (
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
              <div className="w-24 relative">
                <Label htmlFor={`price-${index}`} className="mb-2 block">
                  Precio ($)
                </Label>
                <Input
                  id={`price-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={channel.price}
                  onChange={(e) =>
                    handleChannelChange(channel.id, "price", Number.parseFloat(e.target.value) || 0)
                  }
                  className={channel.price === 0 ? "text-green-500 font-medium" : "text-orange-500 font-medium"}
                />
                {channel.price === 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-green-500 text-xs">FREE</Badge>
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
                  value={channel.type}
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
    <CardFooter className="flex justify-center">
      {formData.channels.length < 5 && (
        <Button type="button" variant="outline" className="mx-auto bg-transparent" onClick={handleAddChannel}>
          <Plus size={18} className="mr-2" />
          Añadir canal
        </Button>
      )}
    </CardFooter>
  </Card>
)

const renderGamification = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-2">
      <Trophy size={28} className="text-amber-500" />
      <h2 className="text-2xl font-bold">Gamificación</h2>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Sistema de recompensas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pointsForPost">Puntos por publicación</Label>
          <Input
            id="pointsForPost"
            type="number"
            min="0"
            value={formData.gamification.pointsForPost}
            onChange={(e) => handleFormDataChange('gamification', {
              ...formData.gamification,
              pointsForPost: Number.parseInt(e.target.value) || 0
            })}
            placeholder="Puntos que gana un usuario por hacer una publicación"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pointsForReferral">Puntos por referir</Label>
          <Input
            id="pointsForReferral"
            type="number"
            min="0"
            value={formData.gamification.pointsForReferral}
            onChange={(e) => handleFormDataChange('gamification', {
              ...formData.gamification,
              pointsForReferral: Number.parseInt(e.target.value) || 0
            })}
            placeholder="Puntos que gana un usuario por referir a otro"
          />
        </div>
      </CardContent>
    </Card>
  </div>
)

const renderAgent = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-2">
      <Bot size={28} className="text-blue-500" />
      <h2 className="text-2xl font-bold">Asistente IA</h2>
    </div>

    {/* Reuse agent form component - for now basic implementation */}
    <Card>
      <CardHeader>
        <CardTitle>Configuración del Agente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agentRole">Rol del agente</Label>
          <Input
            id="agentRole"
            value={formData.agent.personality.role}
            onChange={(e) => handleFormDataChange('agent', {
              ...formData.agent,
              personality: {
                ...formData.agent.personality,
                role: e.target.value
              }
            })}
            placeholder="Describe el rol del asistente IA"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agentTone">Tono</Label>
          <select
            id="agentTone"
            value={formData.agent.personality.tone}
            onChange={(e) => handleFormDataChange('agent', {
              ...formData.agent,
              personality: {
                ...formData.agent.personality,
                tone: e.target.value
              }
            })}
            className="w-full p-2 border rounded"
          >
            <option value="didactico">Didáctico</option>
            <option value="entusiasta">Entusiasta</option>
            <option value="reflexivo">Reflexivo</option>
            <option value="sarcastico">Sarcástico</option>
            <option value="alegre">Alegre</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agentKnowledge">Conocimiento base</Label>
          <Textarea
            id="agentKnowledge"
            value={formData.agent.context.baseKnowledge || ''}
            onChange={(e) => handleFormDataChange('agent', {
              ...formData.agent,
              context: {
                ...formData.agent.context,
                baseKnowledge: e.target.value
              }
            })}
            placeholder="Conocimiento específico del dominio"
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  </div>
)

return (
  <div className="container py-6 max-w-4xl">
    <div className="mb-4">
      {currentStep > 0 && (
        <Button variant="ghost" onClick={handleBack} className="flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} className="mr-1" />
          <span>Atrás</span>
        </Button>
      )}
    </div>

    <div className="mb-8">
      <Progress value={(currentStep / (steps.length - 1)) * 100} className="w-full" />
      <div className="flex justify-between mt-2">
        {steps.map((step, index) => (
          <div key={index} className={`text-sm ${index <= currentStep ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            {step.title}
          </div>
        ))}
      </div>
    </div>

    <div className="mb-6">
      <h1 className="text-2xl font-bold">{steps[currentStep].title}</h1>
      <p className="text-muted-foreground">{steps[currentStep].description}</p>
    </div>

    {currentStep === 0 && renderTemplateSelection()}
    {currentStep === 1 && renderBasicInfo()}
    {currentStep === 2 && renderChannels()}
    {currentStep === 3 && renderGamification()}
    {currentStep === 4 && renderAgent()}

    {currentStep > 0 && currentStep < steps.length - 1 && (
      <div className="flex justify-end mt-8">
        <Button onClick={handleNext} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
          Siguiente
        </Button>
      </div>
    )}

    {currentStep === steps.length - 1 && (
      <div className="flex justify-end mt-8">
        <Button onClick={handleSubmit} disabled={isLoading} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
          {isLoading ? "Creando..." : "Crear club"}
        </Button>
      </div>
    )}

    <Snackbar
      message={snackBarErrorMsg}
      type="error"
      open={snackBarOpen}
      onClose={handleCloseSnackBar}
      duration={5000}
    />

    <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Check className="h-6 w-6 text-green-500 mr-2" />
            ¡Club creado con éxito!
          </DialogTitle>
          <DialogDescription>
            Tu club ha sido creado correctamente. Ahora puedes comenzar a desarrollar tu comunidad.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <Avatar className="h-24 w-24 ring-4" style={{ ringColor: `${formData.color}40` }}>
            <AvatarImage src={clubImage || "/placeholder.svg"} alt={formData.name} />
            <AvatarFallback style={{ backgroundColor: `${formData.color}20`, color: formData.color }}>
              {formData.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={() => router.push(`/clubs/${newClubId}`)}>
            Ir a tu club
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
)
}
