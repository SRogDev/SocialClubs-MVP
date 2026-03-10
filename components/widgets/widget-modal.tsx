'use client'

/**
 * WidgetModal — generic creation form for any widget type.
 *
 * Driven entirely by `template.schema.modal_template.fields`.
 * Shows a live preview using <WidgetPost previewData={...} />.
 * On submit, calls publishWidgetAction and closes.
 */

import { useState } from 'react'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Textarea }  from '@/components/ui/textarea'
import { Label }     from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast }  from '@/hooks/use-toast'
import { publishWidgetAction } from '@/app/actions/widgetActions'
import WidgetPost from '@/components/widgets/widget-post'
import type { WidgetRegistryEntry } from '@/lib/widget-templates'
import type { ResolvedWidgetData } from '@/types/widget'

interface WidgetModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    template: WidgetRegistryEntry
    clubId: string
    userId: string | null
}

export default function WidgetModal({
    open,
    onOpenChange,
    template,
    clubId,
    userId,
}: WidgetModalProps) {
    const [formData, setFormData]       = useState<Record<string, string>>({})
    const [isSubmitting, setSubmitting] = useState(false)
    const { toast } = useToast()

    const fields = template.schema.modal_template.fields

    function set(id: string, value: string) {
        setFormData((p) => ({ ...p, [id]: value }))
    }

    function buildPreview(): ResolvedWidgetData {
        return {
            widget: {
                id: 'preview',
                name: template.slug,
                schema: template.schema,
                status: 'active',
                creator_user_id: null,
                version: '1.0.0',
                icon_svg: null,
                created_at: '',
                updated_at: '',
            },
            clubWidget: {
                id: 'preview',
                club_id: clubId,
                widget_id: 'preview',
                cache_data: {},
                created_at: '',
                updated_at: '',
            },
            dataMap: formData,
        }
    }

    const hasRequiredFields = fields
        .filter((f) => f.required)
        .every((f) => !!formData[f.id]?.trim())

    async function handleSubmit() {
        setSubmitting(true)
        const result = await publishWidgetAction({
            clubId,
            widgetSlug: template.slug as any,
            formData,
        })
        setSubmitting(false)

        if (!result.success) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' })
            return
        }

        toast({ title: `${template.name} published!` })
        setFormData({})
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{template.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {fields.map((field) => (
                        <div key={field.id} className="space-y-1.5">
                            <Label htmlFor={field.id}>
                                {field.label}
                                {field.required && (
                                    <span className="text-destructive ml-0.5">*</span>
                                )}
                            </Label>
                            {field.type === 'textarea' ? (
                                <Textarea
                                    id={field.id}
                                    placeholder={field.placeholder}
                                    value={formData[field.id] ?? ''}
                                    onChange={(e) => set(field.id, e.target.value)}
                                    rows={3}
                                    className="resize-none"
                                />
                            ) : (
                                <Input
                                    id={field.id}
                                    type={field.type}
                                    placeholder={field.placeholder}
                                    value={formData[field.id] ?? ''}
                                    onChange={(e) => set(field.id, e.target.value)}
                                />
                            )}
                        </div>
                    ))}

                    {hasRequiredFields && (
                        <>
                            <Separator />
                            <div>
                                <p className="text-xs text-muted-foreground mb-2">Preview</p>
                                <WidgetPost previewData={buildPreview()} userId={userId} />
                            </div>
                        </>
                    )}
                </div>

                <div className="flex gap-2 pt-2">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="flex-1"
                        disabled={!hasRequiredFields || isSubmitting}
                        onClick={handleSubmit}
                    >
                        {isSubmitting ? 'Publishing…' : template.schema.modal_template.submit_label}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
