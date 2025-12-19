'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Building2,
    Shield,
    TrendingUp,
    Users,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
    SidebarHeader,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

const adminMenuItems = [
    {
        title: 'Dashboard',
        href: '/admin',
        icon: LayoutDashboard,
        description: 'Métricas principales',
    },
    {
        title: 'Club Gestión',
        href: '/admin/club-gestion',
        icon: Building2,
        description: 'Administrar clubs',
    },
    {
        title: 'Moderación',
        href: '/admin/moderation',
        icon: Shield,
        description: 'Reportes y moderación',
    },
    {
        title: 'Marketing',
        href: '/admin/marketing',
        icon: TrendingUp,
        description: 'Herramientas de marketing',
    },
    {
        title: 'Usuarios',
        href: '/admin/users',
        icon: Users,
        description: 'Gestión de usuarios',
    },
]

export function AdminSidebar() {
    const pathname = usePathname()

    return (
        <Sidebar>
            <SidebarHeader className="border-b border-border p-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Shield className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">Admin Panel</span>
                        <span className="text-xs text-muted-foreground">SocialClubs</span>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navegación</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {adminMenuItems.map((item) => {
                                const isActive = pathname === item.href
                                const Icon = item.icon

                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton asChild isActive={isActive}>
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    'flex items-center gap-3 rounded-lg px-3 py-2 transition-all',
                                                    isActive
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'hover:bg-muted'
                                                )}
                                            >
                                                <Icon className="h-4 w-4" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">
                                                        {item.title}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {item.description}
                                                    </span>
                                                </div>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}
