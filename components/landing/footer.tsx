"use client"

import Link from "next/link"

export function Footer() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <footer className="bg-background border-t py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-2xl mx-auto">
          <div className="space-y-4 text-center md:text-left">
            <h3 className="text-lg font-semibold">SocialClubs</h3>
            <nav className="space-y-2">
              <button
                onClick={() => scrollToSection("about")}
                className="block text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Qué es
              </button>
              <button
                onClick={() => scrollToSection("features")}
                className="block text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Características
              </button>
              <button
                onClick={() => scrollToSection("roadmap")}
                className="block text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Roadmap
              </button>
            </nav>
          </div>

          <div className="space-y-4 text-center md:text-left">
            <h4 className="font-semibold">Legal</h4>
            <nav className="space-y-2">
              <Link
                href="/terms-of-use"
                className="block text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Términos de uso
              </Link>
              <Link
                href="/privacy-policy"
                className="block text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Política de privacidad
              </Link>
            </nav>
          </div>
        </div>

        <div className="border-t mt-6 md:mt-8 pt-6 md:pt-8 text-center text-xs md:text-sm text-muted-foreground">
          <p>&copy; 2026 SocialClubs. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
