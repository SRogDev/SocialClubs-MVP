"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface SearchInputProps {
    onSearch?: (query: string) => void
    placeholder?: string
    defaultValue?: string
}

export default function SearchInput({
    onSearch,
    placeholder = "Buscar clubs, posts, usuarios...",
    defaultValue = ""
}: SearchInputProps) {
    const [query, setQuery] = useState(defaultValue)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setQuery(value)
        onSearch?.(value)
    }

    return (
        <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="search"
                placeholder={placeholder}
                value={query}
                onChange={handleChange}
                className="pl-10"
            />
        </div>
    )
}
