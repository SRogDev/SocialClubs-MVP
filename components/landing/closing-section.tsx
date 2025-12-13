import { Button } from "@/components/ui/button"

export function ClosingSection() {
  return (
    <section className="py-12 md:py-20 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
      <div className="container mx-auto px-4 text-center">
        <p className="text-lg md:text-2xl font-semibold text-primary mb-6 md:mb-8 max-w-2xl mx-auto px-4">
         Esto no es solo una plataforma. Es tu escenario para construir, innovar y dejar un legado duradero. Si tienes un propósito ardiente que va más allá de la existencia, si buscas impactar, crear y trascender, entonces estás en el lugar correcto."
        </p>

        <Button
          size="lg"
          className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6 bg-primary hover:bg-primary/90 text-white font-semibold"
        >
          Transforma tu Futuro
        </Button>
      </div>
    </section>
  )
}
