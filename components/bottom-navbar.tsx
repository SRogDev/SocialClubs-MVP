"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Search, Home, User } from "lucide-react"

export default function BottomNavbar() {
  const pathname = usePathname()

  const navItems = [
    {
      href: "/clubs",
      icon: Home,
      isActive: pathname === "/clubs",
    },
    {
      href: "/search",
      icon: Search,
      isActive: pathname === "/search",
    },
    {
      href: "/profile",
      icon: User,
      isActive: pathname === "/profile",
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="flex justify-around items-center py-3">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-all duration-200 ${
                item.isActive
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon size={24} />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
