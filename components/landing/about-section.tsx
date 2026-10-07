export function AboutSection() {
  return (
    <section id="about" className="py-12 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12">¿Qué es SocialClubs?</h2>

        <div className="max-w-3xl mx-auto space-y-6 text-center">
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Tus redes sociales te dan alcance. <span className="text-foreground font-semibold">SocialClubs te da ingresos.</span>
          </p>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Es tu club privado de membresía: un espacio solo para tus fans más leales,
            donde pagan una suscripción mensual por contenido exclusivo, videollamadas
            en vivo y eventos que no existen en ningún otro lugar.
          </p>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Sin depender del algoritmo. Sin regalar tu mejor contenido.
            Tú pones el precio, tú te quedas con la comunidad.
          </p>
        </div>
      </div>
    </section>
  )
}
