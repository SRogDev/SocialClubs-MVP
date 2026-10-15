import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { phaseLabel, type EventPhase } from '@/types/event';

const phaseBadgeVariants = cva('inline-flex items-center gap-1.5', {
    variants: {
        phase: {
            PRE_EVENT: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
            LIVE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            POST_EVENT: 'bg-muted text-muted-foreground border-border',
            EXPIRED: 'bg-muted text-muted-foreground border-border',
        } satisfies Record<EventPhase, string>,
    },
});

type PhaseBadgeProps = VariantProps<typeof phaseBadgeVariants> & {
    phase: EventPhase;
    className?: string;
};

export function PhaseBadge({ phase, className }: PhaseBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1',
                phaseBadgeVariants({ phase }),
                className,
            )}
        >
            {phase === 'LIVE' && (
                <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
            )}
            {phaseLabel(phase)}
        </span>
    );
}
