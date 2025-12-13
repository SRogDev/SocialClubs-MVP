import { Button } from "@/components/ui/button"

export function FeaturesSection() {
  return (
    <section id="features" className="py-12 md:py-20">
      <div className="container mx-auto px-4 space-y-12 md:space-y-20">
        {/* Feature 1 */}
        <div className="text-center space-y-4 md:space-y-6">
          <h3 className="text-2xl md:text-3xl font-bold">El espacio único que tu comunidad merece</h3>
          <div className="max-w-3xl mx-auto">
            <div className="h-24 md:h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm md:text-base">
             No  necesitas crear un sitio web ni usar múltiples herramientas. Nuestra interfaz es más simple e intuitiva que cualquier alternativa. Sé el arquitecto de algo más grande que tú.
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="text-center space-y-4 md:space-y-6">
          <h3 className="text-2xl md:text-3xl font-bold">Más Poder ,más Engagement </h3>
          <div className="max-w-3xl mx-auto">
            <div className="h-24 md:h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm md:text-base">
            Crea Canales de Contenido,  gamifica con puntos  tu comunidad , conserva tu Branding y impulsa con IA tu engagement.
            </div>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="text-center space-y-4 md:space-y-6">
          <h3 className="text-2xl md:text-3xl font-bold">Conecta de forma Auténtica</h3>
          <div className="max-w-3xl mx-auto">
            <div className="h-24 md:h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm md:text-base">
            Desbloquea nuevas formas de interactuar en comunidades con el Superlike , los widgets , chats exclusivos, videollamadas y más .
            </div>
          </div>
        </div>

        {/* Feature 4 */}
        <div className="text-center space-y-4 md:space-y-6">
          <h3 className="text-2xl md:text-3xl font-bold">Donde Crear es un juego</h3>
          <div className="max-w-3xl mx-auto">
            <div className="h-24 md:h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm md:text-base">
            Sistema de rangos para los clubes , reconocimiento para los creadores , recompensas y futuras competiciones.
            </div>
          </div>
        </div>

        {/* Feature 5 */}
        <div className="text-center space-y-4 md:space-y-6">
          <h3 className="text-2xl md:text-3xl font-bold">Cero fricción Comunidad-monetización</h3>
          <div className="max-w-3xl mx-auto">
            <div className="h-24 md:h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm md:text-base">
             Monetiza mediante suscripciones  propinas  o consultas pagas en tu Club con varios metodos de pago tanto fiat como criptomoneda, con comisiones bajas y transacciones sencillas.
            </div>
          </div>
        </div>

        {/* CTA final */}
        <div className="text-center">
          <Button
            size="lg"
            className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6 bg-primary hover:bg-primary/90 text-white font-semibold"
          >
            Crea tu Club Ahora
          </Button>
        </div>
      </div>
    </section>
  )
}
