'use client'

import { UseFormReturn } from 'react-hook-form'
import { Plus, X } from 'lucide-react'
import { AgentConfig, toneOptions } from '@/schemas/agentSchema'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { ConfigLine } from './ConfigLine'

interface ConfigOptionsProps {
    form: UseFormReturn<AgentConfig>
}

export function ConfigOptions({ form }: ConfigOptionsProps) {
    const { register, watch, setValue, formState: { errors } } = form

    const boundaryRules = watch('context.boundaryRules') || []
    const skills = watch('skills') || []
    const temperature = watch('personality.temperature')

    const addBoundaryRule = () => {
        if (boundaryRules.length < 5) {
            setValue('context.boundaryRules', [...boundaryRules, ''])
        }
    }

    const removeBoundaryRule = (index: number) => {
        setValue('context.boundaryRules', boundaryRules.filter((_, i) => i !== index))
    }

    const updateBoundaryRule = (index: number, value: string) => {
        const updated = [...boundaryRules]
        updated[index] = value
        setValue('context.boundaryRules', updated)
    }

    const addSkill = () => {
        if (skills.length < 4) {
            setValue('skills', [...skills, { name: '', action: '', accessSubscriptionId: '' }])
        }
    }

    const removeSkill = (index: number) => {
        setValue('skills', skills.filter((_, i) => i !== index))
    }

    return (
        <div className="space-y-8">
            {/* Personality Section */}
            <div>
                <ConfigLine title="Personalidad" />
                <div className="space-y-4">
                    {/* Role */}
                    <div>
                        <Label htmlFor="role">Rol del Agente</Label>
                        <Input
                            id="role"
                            {...register('personality.role')}
                            placeholder="Ej: Asistente experto en programación que ayuda a los miembros del club"
                            className="mt-1"
                        />
                        {errors.personality?.role && (
                            <p className="text-sm text-destructive mt-1">{errors.personality.role.message}</p>
                        )}
                    </div>

                    {/* Tone */}
                    <div>
                        <Label htmlFor="tone">Tono</Label>
                        <Select
                            value={watch('personality.tone')}
                            onValueChange={(value) => setValue('personality.tone', value as any)}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Selecciona un tono" />
                            </SelectTrigger>
                            <SelectContent>
                                {toneOptions.map((tone) => (
                                    <SelectItem key={tone} value={tone}>
                                        {tone.charAt(0).toUpperCase() + tone.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.personality?.tone && (
                            <p className="text-sm text-destructive mt-1">{errors.personality.tone.message}</p>
                        )}
                    </div>

                    {/* Temperature */}
                    <div>
                        <Label htmlFor="temperature">
                            Temperatura: {temperature?.toFixed(2) || 0.7}
                        </Label>
                        <Slider
                            id="temperature"
                            min={0}
                            max={1}
                            step={0.01}
                            value={[temperature || 0.7]}
                            onValueChange={(value) => setValue('personality.temperature', value[0])}
                            className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            0 = Más preciso y determinista | 1 = Más creativo y aleatorio
                        </p>
                        {errors.personality?.temperature && (
                            <p className="text-sm text-destructive mt-1">{errors.personality.temperature.message}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Context Section */}
            <div>
                <ConfigLine title="Contexto" />
                <div className="space-y-4">
                    {/* Base Knowledge */}
                    <div>
                        <Label htmlFor="baseKnowledge">Conocimiento Base</Label>
                        <Textarea
                            id="baseKnowledge"
                            {...register('context.baseKnowledge')}
                            placeholder="Describe qué más sabe tu agente y para qué sirve. Ej: Este agente conoce las mejores prácticas de React, puede responder preguntas sobre Next.js, y ayuda con debugging de código JavaScript."
                            rows={4}
                            className="mt-1"
                        />
                        {errors.context?.baseKnowledge && (
                            <p className="text-sm text-destructive mt-1">{errors.context.baseKnowledge.message}</p>
                        )}
                    </div>

                    {/* Boundary Rules */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Reglas de Límites (máx. 5)</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addBoundaryRule}
                                disabled={boundaryRules.length >= 5}
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Agregar regla
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {boundaryRules.map((rule, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        value={rule}
                                        onChange={(e) => updateBoundaryRule(index, e.target.value)}
                                        placeholder="Ej: No proporcionar información médica"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeBoundaryRule(index)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        {errors.context?.boundaryRules && (
                            <p className="text-sm text-destructive mt-1">{errors.context.boundaryRules.message}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Services Section */}
            <div>
                <ConfigLine title="Servicios" />
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Máximo 4 servicios</p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addSkill}
                            disabled={skills.length >= 4}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar servicio
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {skills.map((skill, index) => (
                            <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm">Servicio {index + 1}</h4>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeSkill(index)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <Label htmlFor={`skill-name-${index}`}>Nombre</Label>
                                        <Input
                                            id={`skill-name-${index}`}
                                            {...register(`skills.${index}.name` as const)}
                                            placeholder="Ej: Búsqueda de BD"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor={`skill-action-${index}`}>Acción</Label>
                                        <Input
                                            id={`skill-action-${index}`}
                                            {...register(`skills.${index}.action` as const)}
                                            placeholder="Ej: Buscar en la base de datos"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor={`skill-access-${index}`}>Acceso</Label>
                                        <Input
                                            id={`skill-access-${index}`}
                                            {...register(`skills.${index}.accessSubscriptionId` as const)}
                                            placeholder="ID de suscripción (opcional)"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {errors.skills && (
                        <p className="text-sm text-destructive mt-1">{errors.skills.message}</p>
                    )}
                </div>
            </div>
        </div>
    )
}
