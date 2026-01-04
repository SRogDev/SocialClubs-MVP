"use client";

import { X, Sparkles, TrendingUp, Users, Zap, Award } from "lucide-react";
import { SalesButton } from "./sales-button";

interface SalesCardProps {
    isOpen: boolean;
    onClose: () => void;
}

const FEATURES = [
    {
        icon: Sparkles,
        text: "Estrategias personalizadas de crecimiento para tu comunidad",
    },
    {
        icon: TrendingUp,
        text: "Análisis y optimización de contenido y engagement",
    },
    {
        icon: Users,
        text: "Consultoría exclusiva para gestión de miembros",
    },
    {
        icon: Zap,
        text: "Automatizaciones avanzadas y herramientas premium",
    },
    {
        icon: Award,
        text: "Soporte prioritario y acompañamiento continuo",
    },
];

export function SalesCard({ isOpen, onClose }: SalesCardProps) {
    if (!isOpen) return null;

    const handleContact = () => {
        // TODO: Implementar lógica de contacto (email, formulario, etc.)
        window.open("mailto:sales@socialclubs.com", "_blank");
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="
            relative
            w-full
            max-w-2xl
            bg-primary
            text-primary-foreground
            rounded-2xl
            shadow-2xl
            animate-in
            zoom-in-95
            duration-300
            overflow-hidden
          "
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Decorative gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="
              absolute
              top-4
              right-4
              p-2
              rounded-full
              bg-white/10
              hover:bg-white/20
              transition-colors
              z-10
            "
                        aria-label="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Content */}
                    <div className="relative p-8 md:p-12">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                Servicio Personalizado de SocialClubs
                            </h2>
                            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-xl mx-auto">
                                Contacta con nosotros si quieres que ayudemos a crecer tu
                                carrera como creador
                            </p>
                        </div>

                        {/* Features List */}
                        <div className="space-y-4 mb-8">
                            {FEATURES.map((feature, index) => {
                                const Icon = feature.icon;
                                return (
                                    <div
                                        key={index}
                                        className="
                      flex
                      items-start
                      gap-4
                      p-4
                      rounded-lg
                      bg-white/10
                      backdrop-blur-sm
                      hover:bg-white/15
                      transition-colors
                    "
                                    >
                                        <div className="flex-shrink-0 mt-1">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <p className="text-base md:text-lg leading-relaxed">
                                            {feature.text}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* CTA Button */}
                        <div className="flex justify-center">
                            <SalesButton
                                onClick={handleContact}
                                className="bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
