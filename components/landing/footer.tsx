"use client"

import { Instagram, Twitter, MessageCircle, Send, Linkedin, MessageSquare } from "lucide-react"

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
                Historia
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
            <h4 className="font-semibold">Síguenos</h4>
            <div className="flex justify-center md:justify-start space-x-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Instagram className="h-5 w-5 md:h-6 md:w-6" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Twitter className="h-5 w-5 md:h-6 md:w-6" />
              </a>
              <a
                href="https://wa.me"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
              </a>
              <a
                href="https://t.me"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Send className="h-5 w-5 md:h-6 md:w-6" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Linkedin className="h-5 w-5 md:h-6 md:w-6" />
              </a>
              <a
                href="https://reddit.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageSquare className="h-5 w-5 md:h-6 md:w-6" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t mt-6 md:mt-8 pt-6 md:pt-8 text-center text-xs md:text-sm text-muted-foreground">
          <p>&copy; 2024 SocialClubs. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
