// Configuración central para SEO
export const siteConfig = {
  name: "Red Social de Comunidades",
  description:
    "Una plataforma social orientada a comunidades temáticas donde puedes conectar con personas de intereses similares",
  url: "https://socialclubs.com",
  ogImage: "/images/og-image.jpg",
  links: {
    twitter: "https://twitter.com/socialclubs",
    github: "https://github.com/socialclubs",
  },
  keywords: [
    "comunidades",
    "red social",
    "clubs",
    "networking",
    "plataforma social",
    "comunidades temáticas",
    "conexiones profesionales",
  ],
  creator: "Social Clubs Team",
  themeColor: "#f97316",
  icons: {
    icon: "/icons/icon-512.png",
    shortcut: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
}

// Función para generar metadatos dinámicos
export function generateMetadata({
  title,
  description,
  path = "",
  image = siteConfig.ogImage,
  noIndex = false,
}: {
  title?: string
  description?: string
  path?: string
  image?: string
  noIndex?: boolean
}) {
  const fullTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name
  const fullDescription = description || siteConfig.description
  const url = `${siteConfig.url}${path}`

  return {
    title: fullTitle,
    description: fullDescription,
    keywords: siteConfig.keywords,
    authors: [{ name: siteConfig.creator }],
    creator: siteConfig.creator,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: url,
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
      },
    },
    openGraph: {
      type: "website",
      locale: "es_ES",
      url,
      title: fullTitle,
      description: fullDescription,
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: fullDescription,
      images: [image],
      creator: "@socialclubs",
    },
  }
}

// Función para generar JSON-LD para rich snippets
export function generateJsonLd({
  type,
  data,
}: {
  type: "Organization" | "WebSite" | "WebPage" | "Article" | "Person" | "Club"
  data: Record<string, any>
}) {
  const baseData = {
    "@context": "https://schema.org",
  }

  switch (type) {
    case "Organization":
      return {
        ...baseData,
        "@type": "Organization",
        name: siteConfig.name,
        url: siteConfig.url,
        logo: `${siteConfig.url}/icons/icon-512.png`,
        sameAs: [siteConfig.links.twitter, siteConfig.links.github],
        ...data,
      }
    case "WebSite":
      return {
        ...baseData,
        "@type": "WebSite",
        name: siteConfig.name,
        url: siteConfig.url,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteConfig.url}/explore?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
        ...data,
      }
    case "WebPage":
      return {
        ...baseData,
        "@type": "WebPage",
        name: data.title || siteConfig.name,
        description: data.description || siteConfig.description,
        url: `${siteConfig.url}${data.path || ""}`,
        ...data,
      }
    case "Article":
      return {
        ...baseData,
        "@type": "Article",
        headline: data.title,
        image: data.image || siteConfig.ogImage,
        datePublished: data.datePublished,
        dateModified: data.dateModified || data.datePublished,
        author: {
          "@type": "Person",
          name: data.author?.name || siteConfig.creator,
        },
        publisher: {
          "@type": "Organization",
          name: siteConfig.name,
          logo: {
            "@type": "ImageObject",
            url: `${siteConfig.url}/icons/icon-512.png`,
          },
        },
        ...data,
      }
    case "Person":
      return {
        ...baseData,
        "@type": "Person",
        ...data,
      }
    case "Club":
      // Use the dedicated club JSON-LD generator for better SEO
      // Import and use: import { generateClubJsonLd } from '@/schemas/clubJsonLdSchema'
      // This case is kept for backward compatibility
      return {
        ...baseData,
        "@type": "Organization",
        "@id": `${siteConfig.url}/clubs/${data.id}`,
        name: data.name,
        description: data.description,
        url: `${siteConfig.url}/clubs/${data.id}`,
        logo: data.imageUrl || `${siteConfig.url}/icons/icon-512.png`,
        ...data,
      }
    default:
      return {
        ...baseData,
        "@type": type,
        ...data,
      }
  }
}
