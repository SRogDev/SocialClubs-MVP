"use client";

import { useState } from "react";

import { SalesButton } from "./sales-button";
import { SalesCard } from "./sales-card";

/**
 * Ejemplo de uso de los componentes Sales
 * 
 * Este componente muestra cómo integrar el SalesButton y SalesCard
 * en cualquier parte de tu aplicación.
 */
export function SalesExample() {
    const [isCardOpen, setIsCardOpen] = useState(false);

    return (
        <div>
            {/* El botón puede ir en cualquier parte de tu layout */}
            <SalesButton onClick={() => setIsCardOpen(true)} />

            {/* El modal se muestra cuando isCardOpen es true */}
            <SalesCard
                isOpen={isCardOpen}
                onClose={() => setIsCardOpen(false)}
            />
        </div>
    );
}

/**
 * EJEMPLO DE INTEGRACIÓN EN SIDEBAR:
 * 
 * En tu sidebar del club panel, puedes agregarlo así:
 * 
 * ```tsx
 * import { SalesButton } from "@/components/club-panel/sales-button";
 * import { SalesCard } from "@/components/club-panel/sales-card";
 * 
 * export function ClubPanelSidebar() {
 *   const [isCardOpen, setIsCardOpen] = useState(false);
 *   
 *   return (
 *     <aside className="...">
 *       {/* ... otros elementos del sidebar ... *\/}
 *       
 *       <div className="mt-auto p-4">
 *         <SalesButton onClick={() => setIsCardOpen(true)} />
 *       </div>
 *       
 *       <SalesCard 
 *         isOpen={isCardOpen} 
 *         onClose={() => setIsCardOpen(false)} 
 *       />
 *     </aside>
 *   );
 * }
 * ```
 */
