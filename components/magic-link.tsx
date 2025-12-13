"use client"

import { Link2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface MagicLinkProps {
  title: string
  url: string
}

export default function MagicLink({ title, url }: MagicLinkProps) {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center mb-3">
          <Link2 size={18} className="mr-2 text-primary" />
          <h3 className="font-medium">{title}</h3>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full">
          <Button className="w-full group">
            <span className="mr-2">Visitar enlace</span>
            <ExternalLink
              size={16}
              className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
            />
          </Button>
        </a>
      </CardContent>
    </Card>
  )
}
