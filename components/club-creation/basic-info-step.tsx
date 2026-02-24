"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { LockIcon, Globe } from "lucide-react"
import ColorPicker from "@/components/shared/color-picker"

interface FormData {
    name: string
    description: string
    color: string
    isPrivate: boolean
    welcomeMessage: string
}

interface BasicInfoStepProps {
    formData: FormData
    onFormDataChange: (field: keyof FormData, value: any) => void
    previewUrl: string | null
    onImageChange: (e: Event) => void
}

export function BasicInfoStep({
    formData,
    onFormDataChange,
    previewUrl,
    onImageChange
}: BasicInfoStepProps) {
    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Información Básica</h2>
                <p className="text-muted-foreground">Configura los detalles principales de tu club</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="name">Nombre del Club *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => onFormDataChange('name', e.target.value)}
                            placeholder="Ingresa el nombre de tu club"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => onFormDataChange('description', e.target.value)}
                            placeholder="Describe brevemente tu club"
                            rows={3}
                        />
                    </div>

                    <div>
                        <Label>Color del Club</Label>
                        <ColorPicker
                            value={formData.color}
                            onChange={(color) => onFormDataChange('color', color)}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label>Logo del Club</Label>
                        <div className="flex items-center gap-4">
                            <Avatar className="w-20 h-20">
                                <AvatarImage src={previewUrl || formData.name} alt={formData.name} />
                                <AvatarFallback style={{ backgroundColor: formData.color }}>
                                    {formData.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={onImageChange}
                                    className="hidden"
                                    id="logo-upload"
                                />
                                <Label
                                    htmlFor="logo-upload"
                                    className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                                >
                                    Subir Logo
                                </Label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label>Privacidad</Label>
                        <RadioGroup
                            value={formData.isPrivate ? "private" : "public"}
                            onValueChange={(value) => onFormDataChange('isPrivate', value === "private")}
                            className="flex gap-6 mt-2"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="public" id="public" />
                                <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                                    <Globe size={16} />
                                    Público
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="private" id="private" />
                                <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer">
                                    <LockIcon size={16} />
                                    Privado
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div>
                        <Label htmlFor="welcomeMessage">Mensaje de Bienvenida</Label>
                        <Textarea
                            id="welcomeMessage"
                            value={formData.welcomeMessage}
                            onChange={(e) => onFormDataChange('welcomeMessage', e.target.value)}
                            placeholder="Mensaje que verán los nuevos miembros"
                            rows={3}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}