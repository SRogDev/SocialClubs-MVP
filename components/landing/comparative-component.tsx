"use client"

import { motion } from "framer-motion"
import { Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const platforms = [
  {
    name: "SocialClubs",
    highlight: true,
    features: {
      "Total Control y Personalización": true,
      "Monetización Fácil": true,
      "Alta Interacción y Gamificación": true,
      "Privacidad y Protección de Datos": true,
      "Organización Avanzada": true,
    },
  },
  {
    name: "Instagram",
    features: {
      "Total Control y Personalización": false,
      "Monetización Fácil": true,
      "Alta Interacción y Gamificación": false,
      "Privacidad y Protección de Datos": false,
      "Organización Avanzada": true,
    },
  },
  {
    name: "YouTube",
    features: {
      "Total Control y Personalización": false,
      "Monetización Fácil": true,
      "Alta Interacción y Gamificación": false,
      "Privacidad y Protección de Datos": false,
      "Organización Avanzada": true,
    },
  },
  {
    name: "Telegram",
    features: {
      "Total Control y Personalización": true,
      "Monetización Fácil": false,
      "Alta Interacción y Gamificación": false,
      "Privacidad y Protección de Datos": true,
      "Organización Avanzada": false,
    },
  },
  {
    name: "Discord",
    features: {
      "Total Control y Personalización": true,
      "Monetización Fácil": false,
      "Alta Interacción y Gamificación": true,
      "Privacidad y Protección de Datos": false,
      "Organización Avanzada": false,
    },
  },
]

const featureNames = Object.keys(platforms[0].features)

export function ComparativeComponent() {
  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4 space-y-6 md:space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <Card className="overflow-hidden bg-gradient-to-br from-card via-card to-primary/5 border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardTitle className="text-xl md:text-2xl text-center text-foreground">
                ¿Por qué elegir SocialClubs?
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 md:p-6 font-semibold text-sm md:text-base text-foreground bg-muted/30">
                        Características
                      </th>
                      {platforms.map((platform) => (
                        <th
                          key={platform.name}
                          className={`text-center p-4 md:p-6 font-semibold text-sm md:text-base ${
                            platform.highlight
                              ? "bg-gradient-to-b from-primary/20 to-primary/10 text-primary"
                              : "bg-muted/10 text-foreground"
                          }`}
                        >
                          {platform.name}
                          {platform.highlight && <div className="text-xs mt-1 font-normal opacity-80">Recomendado</div>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {featureNames.map((feature, index) => (
                      <motion.tr
                        key={feature}
                        className="border-b border-border hover:bg-muted/20 transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <td className="p-4 md:p-6 font-medium text-xs md:text-sm text-foreground bg-muted/10">
                          {feature}
                        </td>
                        {platforms.map((platform) => (
                          <td
                            key={platform.name}
                            className={`text-center p-4 md:p-6 ${
                              platform.highlight ? "bg-primary/5" : "bg-transparent"
                            }`}
                          >
                            {platform.features[feature as keyof typeof platform.features] ? (
                              <div
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                                  platform.highlight ? "bg-primary/20" : "bg-green-100 dark:bg-green-900/30"
                                }`}
                              >
                                <Check
                                  className={`h-4 w-4 md:h-5 md:w-5 ${
                                    platform.highlight ? "text-primary" : "text-green-600 dark:text-green-400"
                                  }`}
                                />
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30">
                                <X className="h-4 w-4 md:h-5 md:w-5 text-red-600 dark:text-red-400" />
                              </div>
                            )}
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Nota destacada */}
        <motion.div
          className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-l-4 border-primary p-4 md:p-6 rounded-r-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <p className="text-base md:text-lg font-semibold text-primary mb-2">💡 Nota Importante</p>
          <p className="text-sm md:text-base text-muted-foreground">
          SocialClubs no compite con las grandes redes, sino que las complementa. Mientras ellas te ayudan a ser descubierto, aquí construyes, haces crecer y monetizas tu comunidad con herramientas integradas y control total
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <Button
            size="lg"
            className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6 bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Experimenta la Diferencia
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
