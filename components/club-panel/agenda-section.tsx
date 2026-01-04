'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { CalendarPlus, Clock, DollarSign, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AppointmentSlot {
    id: number;
    day_of_week: number;
    start_time: string;
    duration: number;
    price: number;
    is_active: boolean;
}

const DAYS_OF_WEEK = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
];

/**
 * Agenda section component - manages club appointment slots
 * Creators configure their availability here
 */
export default function AgendaSection({ clubId }: { clubId: string }) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form state
    const [dayOfWeek, setDayOfWeek] = useState<string>('1');
    const [startTime, setStartTime] = useState('09:00');
    const [duration, setDuration] = useState('60');
    const [price, setPrice] = useState('2000'); // $20 in cents

    const handleCreateSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    club_id: clubId,
                    day_of_week: parseInt(dayOfWeek),
                    start_time: startTime,
                    duration: parseInt(duration),
                    price: parseInt(price),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // User's timezone
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error creando horario');
            }

            toast({
                title: '✅ Horario creado',
                description: 'El horario de disponibilidad fue creado exitosamente',
            });

            setIsDialogOpen(false);
            // Reset form
            setDayOfWeek('1');
            setStartTime('09:00');
            setDuration('60');
            setPrice('2000');
        } catch (error: any) {
            toast({
                title: '❌ Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Agenda de Videollamadas</h1>
                    <p className="text-sm text-muted-foreground">
                        Configura tu disponibilidad para consultas 1-a-1
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <CalendarPlus size={18} className="mr-2" />
                            Nuevo horario
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Crear horario de disponibilidad</DialogTitle>
                            <DialogDescription>
                                Define cuándo estás disponible para videollamadas con tus miembros
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreateSlot} className="space-y-4">
                            {/* Day of week */}
                            <div className="space-y-2">
                                <Label htmlFor="day">Día de la semana</Label>
                                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                                    <SelectTrigger id="day">
                                        <SelectValue placeholder="Selecciona un día" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DAYS_OF_WEEK.map((day) => (
                                            <SelectItem key={day.value} value={day.value.toString()}>
                                                {day.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Start time */}
                            <div className="space-y-2">
                                <Label htmlFor="time">Hora de inicio</Label>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="time"
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Duration */}
                            <div className="space-y-2">
                                <Label htmlFor="duration">Duración (minutos)</Label>
                                <Select value={duration} onValueChange={setDuration}>
                                    <SelectTrigger id="duration">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="30">30 minutos</SelectItem>
                                        <SelectItem value="60">60 minutos</SelectItem>
                                        <SelectItem value="90">90 minutos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Price */}
                            <div className="space-y-2">
                                <Label htmlFor="price">Precio (USD)</Label>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="price"
                                        type="number"
                                        min="0"
                                        step="100"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder="2000"
                                        required
                                    />
                                    <span className="text-sm text-muted-foreground">centavos</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    ${(parseInt(price) / 100).toFixed(2)} USD
                                </p>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? 'Creando...' : 'Crear horario'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Slots list */}
            <Card>
                <CardHeader>
                    <CardTitle>Horarios de disponibilidad</CardTitle>
                    <CardDescription>
                        Lista de horarios donde los miembros pueden agendar videollamadas contigo
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Tus horarios configurados aparecerán aquí. Por ahora, usa el botón "Nuevo horario" para
                        crear tu primer slot de disponibilidad.
                    </p>
                    {/* TODO: Fetch and display appointment slots with SWR */}
                </CardContent>
            </Card>

            {/* Bookings list */}
            <Card>
                <CardHeader>
                    <CardTitle>Reservas confirmadas</CardTitle>
                    <CardDescription>
                        Videollamadas agendadas por tus miembros
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Las reservas confirmadas aparecerán aquí cuando los miembros agenden videollamadas
                        contigo.
                    </p>
                    {/* TODO: Fetch and display confirmed bookings with SWR */}
                </CardContent>
            </Card>
        </div>
    );
}

