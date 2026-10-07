import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    question: "¿Cómo gano dinero con mi club?",
    answer:
      "Tus miembros pagan una suscripción mensual por acceder a tu club. También puedes cobrar por videollamadas privadas. Los pagos se procesan con Stripe y llegan a tu cuenta.",
  },
  {
    question: "¿Cuánto cuesta crear un club?",
    answer:
      "Crear tu club es gratis. Solo pagas una comisión sobre lo que ganes cuando tus miembros se suscriben.",
  },
  {
    question: "¿Necesito tener muchos seguidores para empezar?",
    answer:
      "No. Los clubes funcionan mejor con comunidades pequeñas y leales: 50 miembros pagando una suscripción valen más que 10.000 seguidores que no compran nada.",
  },
  {
    question: "¿Qué tipo de contenido puedo ofrecer?",
    answer:
      "Publicaciones exclusivas, fotos y videos solo para miembros, videollamadas en vivo, eventos y conversaciones directas con tu comunidad más cercana.",
  },
  {
    question: "¿Mis seguidores necesitan instalar algo?",
    answer:
      "No. Todo funciona en el navegador y la app es instalable como PWA en el teléfono.",
  },
  {
    question: "¿Cómo reciben mis miembros el acceso?",
    answer:
      "Al suscribirse, entran automáticamente a tu club privado. Si cancelan, pierden el acceso al contenido exclusivo.",
  },
  {
    question: "¿Puedo migrar mi comunidad de otra plataforma?",
    answer:
      "Sí. Puedes invitar a tus seguidores con un enlace directo a tu club y empezar a construir tu base de miembros desde el día uno.",
  },
]

export function FAQComponent() {
  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8">Preguntas Frecuentes</h2>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-sm md:text-base">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm md:text-base">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
