/**
 * Timezone-aware event date formatting (Spanish-first).
 *
 * Instants are stored in UTC; display always happens in the event's IANA
 * timezone (e.g. "America/Havana").
 */
export function formatEventDate(iso: string, timezone: string): string {
    return new Intl.DateTimeFormat('es-ES', {
        timeZone: timezone || 'UTC',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(iso));
}

export function formatEventRange(startIso: string, endIso: string, timezone: string): string {
    const start = new Intl.DateTimeFormat('es-ES', {
        timeZone: timezone || 'UTC',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(startIso));
    const end = new Intl.DateTimeFormat('es-ES', {
        timeZone: timezone || 'UTC',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(endIso));
    return `${start} – ${end}`;
}
