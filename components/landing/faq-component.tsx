import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    question: "¿Cómo monetizo en la plataforma?",
    answer:
      "Mediante suscripciones de tus usuarios, videollamadas pagas y propinas",
  },
  {
    question: "¿Cómo garantizan la privacidad y seguridad de los usuarios?",
    answer:
      "Cumplimos con GDPR , no recolectamos datos personales usuario , solo de clubs y a diferencia de otras redes puedes eliminar tu cuenta y asi borrar todo rastro de ti en la plataforma ",
  },
  {
    question: "¿Hay algún costo para crear un Club?",
    answer:
      "NO, crear un club es completamente gratis",
  },
  {
    question: "¿Hay límite en el número de miembros?",
    answer:
      "No, SocialClubs está diseñado para escalar desde pequeñas comunidades hasta grandes organizaciones con miles de miembros.",
  },
  {
    question: "¿Como funciona el sistema de gamificacion?",
    answer:
      "Tú decides como se ganan puntos en tu club y para qué sirven",
  },
   {
    question: "¿Qué gana mi club al subir de nivel?",
    answer:
      "Al subir de nivel ganas más reconocimiento , más herramientas sin pagar extra y acceso beta a nuevas funcionalidades",
  },
   {
    question: "¿Qué es un widget?",
    answer:
      "Un elemento interactivo flexible para aumentar la interaccion en tu club más allá de fotos , audio y video",
  },
  {
    question: "¿Es fácil migrar mi comunidad existente?",
    answer:
      "Sí, proporcionamos herramientas y soporte para facilitar la migración desde otras plataformas de manera sencilla y rápida.",
  },

  {
    question: "¿Qué soporte técnico ofrecen?",
    answer:
      "Ofrecemos soporte técnico 24/7, documentación completa, tutoriales y un equipo dedicado para ayudarte en todo momento.",
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
