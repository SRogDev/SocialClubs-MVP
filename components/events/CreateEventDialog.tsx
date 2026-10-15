'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/** Owner/admin-only event creation dialog. Spanish-first, minimal v0. */
export function CreateEventDialog({ clubId }: { clubId: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const form = new FormData(e.currentTarget);
        const title = String(form.get('title') ?? '').trim();
        const description = String(form.get('description') ?? '').trim();
        const startsLocal = String(form.get('starts_at') ?? '');
        const endsLocal = String(form.get('ends_at') ?? '');
        const timezone = String(form.get('timezone') ?? '').trim() || 'UTC';
        const capacityRaw = String(form.get('capacity') ?? '').trim();

        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    club_id: clubId,
                    title,
                    description: description || null,
                    starts_at: new Date(startsLocal).toISOString(),
                    ends_at: new Date(endsLocal).toISOString(),
                    timezone,
                    capacity: capacityRaw ? Number(capacityRaw) : null,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                const details = Array.isArray(json.details) ? `: ${json.details.join(', ')}` : '';
                throw new Error(`${json.error ?? 'Error creando el evento'}${details}`);
            }
            setOpen(false);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error creando el evento');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus size={16} className="mr-1.5" />
                    Crear evento
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Crear evento</DialogTitle>
                    <DialogDescription>
                        Se guardará como borrador. El Director de Experiencias preparará el
                        anuncio automáticamente.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="ev-title">Título</Label>
                        <Input id="ev-title" name="title" required maxLength={200} placeholder="Taller de salsa" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ev-desc">Descripción</Label>
                        <Textarea
                            id="ev-desc"
                            name="description"
                            rows={3}
                            maxLength={5000}
                            placeholder="¿De qué trata el evento?"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="ev-start">Inicio</Label>
                            <Input id="ev-start" name="starts_at" type="datetime-local" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ev-end">Fin</Label>
                            <Input id="ev-end" name="ends_at" type="datetime-local" required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="ev-tz">Zona horaria</Label>
                            <Input
                                id="ev-tz"
                                name="timezone"
                                defaultValue="America/Havana"
                                placeholder="America/Havana"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ev-cap">Cupo (opcional)</Label>
                            <Input
                                id="ev-cap"
                                name="capacity"
                                type="number"
                                min={1}
                                placeholder="Sin límite"
                            />
                        </div>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creando…' : 'Crear evento'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
