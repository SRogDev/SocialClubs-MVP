import WidgetMeta from "./widget-meta"
import WidgetWheel from "./widget-wheel"
import WidgetMagicLink from "./widget-magic-link"
import type { WidgetData } from "@/types/widget"

interface WidgetRendererProps {
  data: WidgetData
  preview?: boolean
}

export default function WidgetRenderer({ data, preview = false }: WidgetRendererProps) {
  switch (data.type) {
    case "meta":
      return <WidgetMeta data={data} preview={preview} />
    case "wheel":
      return <WidgetWheel data={data} preview={preview} />
    case "magic-link":
      return <WidgetMagicLink data={data} preview={preview} />
    default:
      return <div className="p-3 bg-muted/30 rounded-md text-sm">Widget no reconocido</div>
  }
}
