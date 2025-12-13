import { generateJsonLd } from "@/lib/seo-config"

interface SeoProps {
  type: "Organization" | "WebSite" | "WebPage" | "Article" | "Person" | "Club"
  data: Record<string, any>
}

export default function Seo({ type, data }: SeoProps) {
  const jsonLd = generateJsonLd({ type, data })

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}
