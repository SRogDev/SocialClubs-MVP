export function AboutSection() {
  return (
    <section id="about" className="py-12 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-16">¿Qué es SocialClubs?</h2>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start max-w-6xl mx-auto">
          {/* Texto */}
          <div className="flex-1 space-y-6">
            <div className="h-32 md:h-40 lg:h-64 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm md:text-base">
              SocialClubs surge de el deseo de un joven de hacer un llamado al mundo sobre vivir con propósito y por ello una red para creadores con propósito , para todos aquello que no se conforman con una vida ¨normal¨. Para demostrar si independientemente de las circunstancias puede uno ser quien quiere ser.
            </div>
          </div>

          {/* Foto vertical */}
          <div className="w-full lg:w-64 flex justify-center lg:justify-end">
            <div className="w-48 h-60 md:w-56 md:h-72 lg:w-64 lg:h-80 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
              [Tu foto vertical aquí]
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
