'use client'

/**
 * Error Boundaries — catch React render errors gracefully.
 * RootErrorBoundary wraps the whole app in layout.tsx so nothing hard-crashes.
 * Use <SectionErrorBoundary> for isolated feature sections.
 */

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryState {
    hasError: boolean
    error?: Error
}

interface ErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ReactNode
    onError?: (error: Error, info: React.ErrorInfo) => void
}

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info)
        this.props.onError?.(error, info)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback
            return (
                <div className="flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[200px]">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                    <div>
                        <p className="font-semibold text-sm">Algo salió mal</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {this.state.error?.message || 'Error inesperado'}
                        </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={this.handleReset}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Reintentar
                    </Button>
                </div>
            )
        }
        return this.props.children
    }
}

/** Root-level boundary — minimal UI, just prevents white screen */
export function RootErrorBoundary({ children }: { children: React.ReactNode }) {
    return (
        <ErrorBoundaryClass
            fallback={
                <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
                    <AlertTriangle className="h-10 w-10 text-destructive" />
                    <h2 className="text-lg font-semibold">Error de aplicación</h2>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                        Algo salió mal. Recarga la página para continuar.
                    </p>
                    <Button onClick={() => window.location.reload()}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Recargar página
                    </Button>
                </div>
            }
        >
            {children}
        </ErrorBoundaryClass>
    )
}

/** Section-level boundary — shows inline fallback, rest of page still works */
export function SectionErrorBoundary({
    children,
    fallback,
}: {
    children: React.ReactNode
    fallback?: React.ReactNode
}) {
    return (
        <ErrorBoundaryClass fallback={fallback}>
            {children}
        </ErrorBoundaryClass>
    )
}

export default ErrorBoundaryClass
