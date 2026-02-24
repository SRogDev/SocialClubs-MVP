"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { TemplateSelection } from "./template-selection"
import { BasicInfoStep } from "./basic-info-step"
import { ChannelsStep } from "./channels-step"
import { GamificationStep } from "./gamification-step"
import { AgentStep } from "./agent-step"
import { useClubCreate } from "@/hooks/use-club-actions"
import { createClient } from "@/lib/supabase/client"
import { compressImage } from "@/app/utils/compressImage"
import { Snackbar } from "@/components/ui/snackbar"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface Channel {
    id: string
    name: string
    price: number
    type: "escalonado" | "extra"
}

interface Template {
    id: string
    name: string
    description: string
    color: string
    isPrivate: boolean
    welcomeMessage: string
    channels: Channel[]
    gamification: {
        pointsForPost: number
        pointsForReferral: number
    }
    agent: {
        personality: {
            role: string
            tone: string
            temperature: number
        }
        context: {
            baseKnowledge?: string
            boundaryRules: string[]
        }
        skills: {
            name: string
            action: string
            accessSubscriptionId?: string
        }[]
    }
}

interface FormData {
    name: string
    description: string
    color: string
    isPrivate: boolean
    welcomeMessage: string
    channels: Channel[]
    gamification: {
        pointsForPost: number
        pointsForReferral: number
    }
    agent: Template['agent']
}

const steps = [
    { title: "Seleccionar Plantilla", description: "Elige una plantilla o crea personalizado" },
    { title: "Información Básica", description: "Nombre, descripción y configuración básica" },
    { title: "Canales", description: "Configura los canales y precios" },
    { title: "Gamificación", description: "Sistema de puntos y recompensas" },
    { title: "Asistente IA", description: "Configura el agente inteligente" }
]

export function ClubCreationWizard() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(0)
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
    const [formData, setFormData] = useState<FormData>({
        name: "",
        description: "",
        color: "#f97316",
        isPrivate: false,
        welcomeMessage: "",
        channels: [{ id: "1", name: "General", price: 0, type: "escalonado" }],
        gamification: {
            pointsForPost: 10,
            pointsForReferral: 50
        },
        agent: {
            personality: {
                role: "",
                tone: "didactico",
                temperature: 0.7
            },
            context: {
                baseKnowledge: "",
                boundaryRules: []
            },
            skills: []
        }
    })

    const [clubImage, setClubImage] = useState("hola.png")
    const [isLoading, setIsLoading] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [newClubId, setNewClubId] = useState("1")
    const [file, setFile] = useState<File | undefined>(undefined)
    const { createClub, loading, error } = useClubCreate()

    //SnackBar
    const [snackBarOpen, setSnackBarOpen] = useState(false)
    const [snackBarErrorMsg, setSnackBarErrorMsg] = useState("")

    const handleCloseSnackBar = () => {
        setSnackBarOpen(false)
        setSnackBarErrorMsg("")
    }

    const handleTemplateSelect = (template: Template | null) => {
        setSelectedTemplate(template)
        if (template) {
            setFormData({
                name: template.name,
                description: template.description,
                color: template.color,
                isPrivate: template.isPrivate,
                welcomeMessage: template.welcomeMessage,
                channels: template.channels.map(ch => ({ ...ch, id: Date.now().toString() + Math.random() })),
                gamification: template.gamification,
                agent: template.agent
            })
        } else {
            // Custom: reset to empty
            setFormData({
                name: "",
                description: "",
                color: "#f97316",
                isPrivate: false,
                welcomeMessage: "",
                channels: [{ id: "1", name: "General", price: 0, type: "escalonado" }],
                gamification: {
                    pointsForPost: 10,
                    pointsForReferral: 50
                },
                agent: {
                    personality: {
                        role: "",
                        tone: "didactico",
                        temperature: 0.7
                    },
                    context: {
                        baseKnowledge: "",
                        boundaryRules: []
                    },
                    skills: []
                }
            })
        }
        setCurrentStep(1)
    }

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleFormDataChange = (field: keyof FormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleGamificationChange = (field: keyof FormData['gamification'], value: number) => {
        setFormData(prev => ({
            ...prev,
            gamification: { ...prev.gamification, [field]: value }
        }))
    }

    const handleAgentChange = (agent: FormData['agent']) => {
        setFormData(prev => ({ ...prev, agent }))
    }

    useEffect(() => {
        if (error) {
            setSnackBarErrorMsg(`Ocurrió un error: ${error}`)
            setSnackBarOpen(true)
        }
    }, [error])

    // Upload logo helper
    async function uploadLogo(file: File, path: string): Promise<{ url: string | null, error: Error | null }> {
        try {
            const supabase = createClient()
            const { data, error } = await supabase.storage
                .from('clubs')
                .upload(path, file, { upsert: true })

            if (error) {
                return { url: null, error }
            }

            const { data: { publicUrl } } = supabase.storage
                .from('clubs')
                .getPublicUrl(path)

            return { url: publicUrl, error: null }
        } catch (err) {
            return { url: null, error: err instanceof Error ? err : new Error('Upload failed') }
        }
    }

    const handleAddChannel = () => {
        if (formData.channels.length < 5) {
            setFormData(prev => ({
                ...prev,
                channels: [
                    ...prev.channels,
                    {
                        id: Date.now().toString(),
                        name: "",
                        price: 0,
                        type: "escalonado",
                    },
                ],
            }))
        }
    }

    const handleRemoveChannel = (id: string) => {
        setFormData(prev => ({
            ...prev,
            channels: prev.channels.filter((channel) => channel.id !== id)
        }))
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

    const progress = ((currentStep + 1) / steps.length) * 100

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 0:
                return <TemplateSelection onTemplateSelect={handleTemplateSelect} />
            case 1:
                return (
                    <BasicInfoStep
                        formData={{
                            name: formData.name,
                            description: formData.description,
                            color: formData.color,
                            isPrivate: formData.isPrivate,
                            welcomeMessage: formData.welcomeMessage
                        }}
                        onFormDataChange={handleFormDataChange}
                        previewUrl={previewUrl}
                        onImageChange={handleImageChange}
                    />
                )
            case 2:
                return (
                    <ChannelsStep
                        channels={formData.channels}
                        onAddChannel={handleAddChannel}
                        onRemoveChannel={handleRemoveChannel}
                        onChannelChange={handleChannelChange}
                    />
                )
            case 3:
                return (
                    <GamificationStep
                        gamification={formData.gamification}
                        onGamificationChange={handleGamificationChange}
                    />
                )
            case 4:
                return (
                    <AgentStep
                        agent={formData.agent}
                        onAgentChange={handleAgentChange}
                    />
                )
            default:
                return null
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-3xl font-bold">Crear Club</h1>
                        <span className="text-sm text-muted-foreground">
                            Paso {currentStep + 1} de {steps.length}
                        </span>
                    </div>
                    <Progress value={progress} className="w-full" />
                    <div className="flex justify-between mt-2">
                        {steps.map((step, index) => (
                            <div
                                key={index}
                                className={`text-xs ${index <= currentStep ? 'text-primary font-medium' : 'text-muted-foreground'
                                    }`}
                            >
                                {step.title}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step Content */}
                <Card className="max-w-4xl mx-auto">
                    <CardContent className="p-6">
                        {renderCurrentStep()}
                    </CardContent>

                    {/* Navigation */}
                    {currentStep > 0 && (
                        <CardFooter className="flex justify-between">
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                disabled={isLoading}
                            >
                                <ArrowLeft size={16} className="mr-2" />
                                Anterior
                            </Button>

                            {currentStep < steps.length - 1 ? (
                                <Button onClick={handleNext} disabled={isLoading}>
                                    Siguiente
                                    <ArrowRight size={16} className="ml-2" />
                                </Button>
                            ) : (
                                <Button onClick={handleSubmit} disabled={isLoading || !formData.name.trim()}>
                                    {isLoading ? "Creando..." : "Crear Club"}
                                    <Check size={16} className="ml-2" />
                                </Button>
                            )}
                        </CardFooter>
                    )}
                </Card>

                {/* Success Dialog */}
                <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>¡Club creado exitosamente!</DialogTitle>
                            <DialogDescription>
                                Tu club ha sido creado correctamente. Ahora puedes configurar los canales, gamificación y agente desde el panel de administración.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button onClick={() => router.push(`/clubs/${newClubId}`)}>
                                Ir al Club
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Error Snackbar */}
                <Snackbar
                    open={snackBarOpen}
                    onClose={handleCloseSnackBar}
                    message={snackBarErrorMsg}
                    severity="error"
                />
            </div>
        </div>
    )
}