"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useTheme } from "next-themes"

export default function ThemeToggleSection() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center justify-between">
      <Label htmlFor="dark-mode" className="text-base">
        Modo oscuro
      </Label>
      <Switch
        id="dark-mode"
        checked={theme === "dark"}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      />
    </div>
  )
}
