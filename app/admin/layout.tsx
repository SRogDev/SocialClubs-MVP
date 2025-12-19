import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Verificar autenticación y rol de admin
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Verificar si es admin
    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (userData?.role !== 'admin') {
        redirect('/home-clubs')
    }

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full overflow-hidden">
                <AdminSidebar />
                <SidebarInset className="flex-1 overflow-auto">
                    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
                        <SidebarTrigger />
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold">Panel de Administración</h1>
                        </div>
                    </header>
                    <main className="flex-1 p-6">{children}</main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    )
}
