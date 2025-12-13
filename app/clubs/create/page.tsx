"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Plus, Trash2, Check, LockIcon, Globe } from "lucide-react"
import Link from "next/link"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import ColorPicker from "@/components/color-picker"
import { useCreateClub, supabase, uploadLogo } from "@/lib/supabase"
import { channel } from "diagnostics_channel"
import { compressImage } from "@/app/utils/compressImage"
import { Snackbar } from "@/components/ui/snackbar"


interface Channel {
  id: string
  name: string
  price: number
  type: "escalonado" | "extra"
}

type Privacy = "Privado" | "Público";


export default function CreateClubPage() {
  const router = useRouter()
  const [clubName, setClubName] = useState("")
  const [clubDescription, setClubDescription] = useState("")


  const [clubImage, setClubImage] = useState("hola.png")


  const [clubColor, setClubColor] = useState("#f97316")
  const [channels, setChannels] = useState<Channel[]>([{ id: "1", name: "General", price: 0, type: "escalonado" }])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [newClubId, setNewClubId] = useState("1")
  const [clubPrivacy, setClubPrivacy] = useState<Privacy>("Privado");
  const [file, setFile] = useState<File | undefined>(undefined);
  const { callCreateClub, loading, error, data } = useCreateClub();


  //SnackBar
  const [snackBarOpen, setSnackBarOpen] = useState(false);
  const [snackBarErrorMsg, setSnackBarErrorMsg] = useState("");

  const handleCloseSnackBar = () => {
    setSnackBarOpen(false);
    setSnackBarErrorMsg("");
  };
  

  useEffect(() => {
    if (error) {
      alert(`Ocurrió un error: ${error}`);
    }
  }, [error]);

  function useCurrentUser() {
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
      // Obtener la sesión actual
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
      })

      // Escuchar cambios en la autenticación
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })

      return () => subscription.unsubscribe()
    }, [])

    return user
  }


  const handleAddChannel = () => {
    if (channels.length < 5) {
      setChannels([
        ...channels,
        {
          id: Date.now().toString(),
          name: "",
          price: 0,
          type: "escalonado",
        },
      ])
    }
  }

  const handleRemoveChannel = (id: string) => {
    setChannels(channels.filter((channel) => channel.id !== id))
  }

  const handleChannelChange = (id: string, field: "name" | "price" | "type", value: string | number) => {
    setChannels(channels.map((channel) => (channel.id === id ? { ...channel, [field]: value } : channel)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()



    try {
      setIsLoading(true);

      const compressedFile = await compressImage(file as File, 0.7, 800)  as File;
      
      const {url, error} = await uploadLogo(compressedFile, `clubs/${clubName.replace(/\s+/g, '-').toLowerCase()}`)

      if(error){
        throw new Error(`Error al subir la imagen: ${error instanceof Error ? error.message : error} `);
      }

      setClubImage(url || "hola.png");
     


      const result = await callCreateClub({
        club: {
          name: clubName,
          logo: clubImage,
          creator: (await supabase.auth.getUser()).data.user?.id || null,
          tags: null,
          size: null,
          color: clubColor,
          level: null,
          bio: clubDescription,
          privacidad: clubPrivacy.toLowerCase(),
        },
        memberships: [],
        channels: [],
        createAnalytics: false,
        createBadge: false,
      });
      console.log('Operación exitosa:', result);
      if (result.success) {
        setNewClubId(result.data.clubId);
        setShowSuccess(true);
        setIsLoading(false);
      } else {
        throw new Error("Error al crear el club: " + result.message);
        

      }

    } catch (error) {

      console.error('Error en la operación:', error)
      setIsLoading(false);
      setSnackBarErrorMsg(error instanceof Error ? error.message : "Ocurrió un error al crear el club");
      setSnackBarOpen(true);
    }



    setNewClubId("1")


  }



  // Efecto para limpiar la URL cuando el componente se desmonte o la imagen cambie
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);


  const handleImageChange = (e: Event) => {
    const selectedFile = (e.target as HTMLInputElement).files?.[0];

    if (selectedFile) {
      setFile(selectedFile);
      const imageUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(imageUrl);
    }
  };


  const sortedChannels = [...channels].sort((a, b) => {
    if (a.type === b.type) {
      return a.price - b.price
    }
    if (a.type === "escalonado" && b.type !== "escalonado") {
      return -1
    }
    return 1
  })

  return (
    <div className="container py-6">
      <div className="mb-4">
        <Link href="/clubs" className="flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} className="mr-1" />
          <span>Volver</span>
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Crear Club</h1>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col items-center mb-6">
          <Avatar className="h-24 w-24 mb-2 ring-4" style={{ ringColor: `${clubColor}40` }}>
            <AvatarImage src={previewUrl || "/placeholder.svg"} alt="Club image" />
            <AvatarFallback style={{ backgroundColor: `${clubColor}20`, color: clubColor }}>
              {clubName ? clubName.substring(0, 2).toUpperCase() : "CL"}
            </AvatarFallback>
          </Avatar>
          <Button onClick={() => {
            const input = document.createElement("input");
            input.hidden = true;
            input.type = "file";
            input.accept = "image/*";
            input.onchange = (e) => handleImageChange(e);


            document.body.appendChild(input);
            // Disparamos el click programáticamente
            input.click();
          }} variant="outline" size="sm" type="button" className="mt-2 bg-transparent">
            Cambiar imagen
          </Button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="clubName">Nombre del club</Label>
            <Input
              id="clubName"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Nombre de tu comunidad"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clubDescription">Descripción</Label>
            <Textarea
              id="clubDescription"
              value={clubDescription}
              onChange={(e) => setClubDescription(e.target.value)}
              placeholder="Describe tu comunidad"
              rows={4}
            />
          </div>


          <div className="space-y-2 flex flex-col">
            <Label>Privacidad del club</Label>
            <Button type="button" variant="outline" className=" bg-transparent"
              onClick={
                () => {
                  clubPrivacy == "Público" ? setClubPrivacy("Privado") : setClubPrivacy("Público");
                }

              }>

              {clubPrivacy == "Público" ? <Globe size={18} className="mr-2" /> : <LockIcon size={18} className="mr-2" />}

              {clubPrivacy.toString()}
            </Button>
          </div>



          <ColorPicker color={clubColor} onChange={setClubColor} />

          <Card>
            <CardHeader>
              <CardTitle>Canales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sortedChannels.map((channel, index) => (
                  <div key={channel.id} className="space-y-4 pb-4 border-b last:border-0">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`channel-${index}`} className="mb-2 block">
                          Nombre del canal
                        </Label>
                        <Input
                          id={`channel-${index}`}
                          value={channel.name}
                          onChange={(e) => handleChannelChange(channel.id, "name", e.target.value)}
                          placeholder={`Canal ${index + 1}`}
                          required
                        />
                      </div>
                      <div className="w-24 relative">
                        <Label htmlFor={`price-${index}`} className="mb-2 block">
                          Precio ($)
                        </Label>
                        <Input
                          id={`price-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={channel.price}
                          onChange={(e) =>
                            handleChannelChange(channel.id, "price", Number.parseFloat(e.target.value) || 0)
                          }
                          className={channel.price === 0 ? "text-green-500 font-medium" : "text-orange-500 font-medium"}
                        />
                        {channel.price === 0 && (
                          <Badge className="absolute -top-1 -right-1 bg-green-500 text-xs">FREE</Badge>
                        )}
                      </div>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveChannel(channel.id)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      )}
                    </div>

                    {channel.price > 0 && (
                      <div>
                        <Label className="mb-2 block">Tipo de suscripción</Label>
                        <RadioGroup
                          value={channel.type}
                          className="flex space-x-4"
                          onValueChange={(value) => handleChannelChange(channel.id, "type", value)}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="escalonado" id={`escalonado-${index}`} />
                            <Label htmlFor={`escalonado-${index}`} className="cursor-pointer">
                              Escalonado
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="extra" id={`extra-${index}`} />
                            <Label htmlFor={`extra-${index}`} className="cursor-pointer">
                              Extra
                            </Label>
                          </div>
                        </RadioGroup>
                        {channel.type === "escalonado" && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Los canales escalonados incluyen acceso a todos los canales de menor precio.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              {channels.length < 5 && (
                <Button type="button" variant="outline" className="mx-auto bg-transparent" onClick={handleAddChannel}>
                  <Plus size={18} className="mr-2" />
                  Añadir canal
                </Button>
              )}
            </CardFooter>
          </Card>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            disabled={isLoading}


          >
            {isLoading ? "Creando..." : "Crear club"}
          </Button>
        </div>
      </form>

       <Snackbar
                message={snackBarErrorMsg}
                type="error"
                open={snackBarOpen}
                onClose={handleCloseSnackBar}
                duration={5000}
            />

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Check className="h-6 w-6 text-green-500 mr-2" />
              ¡Club creado con éxito!
            </DialogTitle>
            <DialogDescription>
              Tu club ha sido creado correctamente. Ahora puedes comenzar a desarrollar tu comunidad.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Avatar className="h-24 w-24 ring-4" style={{ ringColor: `${clubColor}40` }}>
              <AvatarImage src={clubImage || "/placeholder.svg"} alt={clubName} />
              <AvatarFallback style={{ backgroundColor: `${clubColor}20`, color: clubColor }}>
                {clubName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => router.push(`/clubs/${newClubId}`)}>
              Ir a tu club
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
