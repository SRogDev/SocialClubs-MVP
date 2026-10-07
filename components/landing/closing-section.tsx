import Link from "next/link"

import { Button } from "@/components/ui/button"

export function ClosingSection() {
  return (
    <section className="py-12 md:py-20 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
      <div className="container mx-auto px-4 text-center">
        <p className="text-lg md:text-2xl font-semibold text-primary mb-6 md:mb-8 max-w-2xl mx-auto px-4">
          Tus seguidores ya están ahí. Tus ingresos recurrentes también pueden estarlo.
          Abre tu club privado hoy y empieza a monetizar tu comunidad.
        </p>

        <Link href="/auth/sign-up">
          <Button
            size="lg"
            className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6 bg-primary hover:bg-primary/90 text-white font-semibold"
          >
            Crear mi club gratis
          </Button>
        </Link>
      </div>
    </section>
  )
}
