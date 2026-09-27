"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SalesButtonProps {
    onClick?: () => void;
    className?: string;
}

export function SalesButton({ onClick, className = "" }: SalesButtonProps) {
    return (
        <Button
            onClick={onClick}
            className={`
        relative 
        overflow-hidden 
        bg-primary 
        text-primary-foreground 
        hover:bg-primary/90 
        font-semibold 
        px-6 
        py-3 
        rounded-lg 
        transition-all 
        duration-300 
        group
        ${className}
      `}
        >
            {/* Shimmer effect */}
            <span
                className="
          absolute 
          inset-0 
          -translate-x-full 
          animate-shimmer 
          bg-gradient-to-r 
          from-transparent 
          via-white/30 
          to-transparent 
          group-hover:translate-x-full
        "
                style={{
                    transition: "transform 1.5s ease-in-out",
                }}
            />

            {/* Button content */}
            <span className="relative flex items-center gap-2">
                Contact to Sales
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
        </Button>
    );
}
