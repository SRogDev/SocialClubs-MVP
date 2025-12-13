"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

type NotificationsToggleProps = {
    enabled: boolean
    onChange: (enabled: boolean) => void
    color: string
}

export default function NotificationsToggle({ enabled, onChange, color }: NotificationsToggleProps) {
    return (
        <div
            className="flex items-center justify-between p-4 border rounded-xl transition-colors"
            style={{
                borderColor: enabled ? `${color}40` : "transparent",
                backgroundColor: enabled ? `${color}05` : "transparent",
            }}
        >
            <div className="flex items-center space-x-2">
                <Label htmlFor="notifications" className="text-sm font-medium">
                    Notificaciones
                </Label>
                <Switch
                    id="notifications"
                    checked={enabled}
                    onCheckedChange={onChange}
                    style={
                        {
                            "--switch-thumb": enabled ? color : undefined,
                            "--switch-track": enabled ? `${color}40` : undefined,
                        } as React.CSSProperties
                    }
                />
            </div>
        </div>
    )
}
