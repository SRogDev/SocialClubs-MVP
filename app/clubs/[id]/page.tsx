"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
const WelcomeClubMessage = dynamic(() => import("@/components/club/welcome-club-message"), { ssr: false });
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, ChevronUp, Eye } from "lucide-react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import PostCard from "@/components/post/post-card";
import MediaSelectionModal from "@/components/post/media-selection-modal";
import type { MediaType } from "@/components/post/media-selection-modal";
import AllWidget from "@/components/widgets/all-widget";
import ContentCreationBar from "@/components/club/content-creation-bar";
import { motion, AnimatePresence } from "framer-motion";
import ChatContentCreationBar from "@/components/chats/chat-content-creation-bar";
import { usePostStore } from "@/stores/post";
import FloatingJoinButton from "@/components/club/floating-join-button";
// import { joinClubAction } from "@/actions/clubActions"; // TODO: Implementar
import { useToast } from "@/hooks/use-toast";
// import { triggerVibration } from "@/utils/pwa"; // TODO: Implementar

// Datos de ejemplo para el club
const mockClub = {
  id: "1",
  name: "Programación",
  imageUrl: "/placeholder.svg?height=80&width=80",
  color: "#f97316",
  isCreator: true, // Para mostrar la funcionalidad de creación de contenido
  channels: [
    {
      id: "general",
      name: "General",
      price: 0,
      type: "escalonado",
      order: 1,
    },
    {
      id: "proyectos",
      name: "Proyectos",
      price: 5,
      type: "escalonado",
      benefits:
        "Accede a proyectos exclusivos y colabora con otros miembros. Incluye los beneficios del canal General.",
      order: 2,
    },
    {
      id: "recursos",
      name: "Recursos",
      price: 10,
      type: "escalonado",
      benefits:
        "Accede a recursos premium, tutoriales exclusivos y código fuente de proyectos completos. Incluye los beneficios de los canales General y Proyectos.",
      order: 3,
    },
    {
      id: "mentoria",
      name: "Mentoría",
      price: 15,
      type: "extra",
      benefits: "Sesiones de mentoría personalizadas y revisión de código.",
      order: 4,
    },
    {
      id: "eventos",
      name: "Eventos",
      price: 20,
      type: "extra",
      benefits: "Acceso a eventos exclusivos y workshops en vivo.",
      order: 5,
    },
  ],
};

// Ordenar canales: primero escalonados de menor a mayor, luego extras
const sortedChannels = [...mockClub.channels].sort((a, b) => {
  // Si ambos son del mismo tipo, ordenar por precio
  if (a.type === b.type) {
    return a.price - b.price;
  }
  // Si a es escalonado y b no, a va primero
  if (a.type === "escalonado" && b.type !== "escalonado") {
    return -1;
  }
  // Si b es escalonado y a no, b va primero
  return 1;
});

// Simular estado de membresía - TODO: Reemplazar con hook real useIsMember
const isVisitor = true; // Cambiar a false para simular miembro
const isMember = !isVisitor;

// Filtrar canales para visitantes: solo mostrar el primer canal (general, que es free)
const availableChannels = isVisitor
  ? sortedChannels.filter((channel) => channel.order === 1) // Solo el primer canal
  : sortedChannels;

const posts = usePostStore((s) => s.posts);
const { toast } = useToast();
const [activeTab, setActiveTab] = useState("general");
const [message, setMessage] = useState("");
const [showWidgetModal, setShowWidgetModal] = useState(false);
const [showMediaModal, setShowMediaModal] = useState(false);
const [currentMediaType, setCurrentMediaType] = useState<MediaType>("image");
const [pollOptions, setPollOptions] = useState(["", "", ""]);
const [availableSuperlikes, setAvailableSuperlikes] = useState(10);
const [showJoinAnimation, setShowJoinAnimation] = useState(false);
const [hasJoined, setHasJoined] = useState(false);
const [showUI, setShowUI] = useState(true);
const [showBottomNavbar, setShowBottomNavbar] = useState(true);
const [lastScrollY, setLastScrollY] = useState(0);

const widgetButtonRef = useRef<HTMLButtonElement>(null);
const contentRef = useRef<HTMLDivElement>(null);

// Para visitantes, forzar el tab activo al primer canal
const effectiveActiveTab = isVisitor ? availableChannels[0]?.id || "general" : activeTab;

// Ocultar la barra de navegación inferior cuando estamos dentro de un club
useEffect(() => {
  // Ocultar la barra inferior al entrar al club
  const bottomNavbar = document.querySelector(
    '[class*="fixed bottom-0"]'
  ) as HTMLElement;
  if (bottomNavbar) {
    bottomNavbar.style.display = "none";
  }

  // Restaurar la barra inferior al salir del club
  return () => {
    if (bottomNavbar) {
      bottomNavbar.style.display = "block";
    }
  };
}, []);

// Controlar el scroll para mostrar/ocultar UI dentro del club
useEffect(() => {
  const handleScroll = () => {
    if (contentRef.current) {
      const currentScrollY = contentRef.current.scrollTop;
      if (currentScrollY > lastScrollY + 10) {
        setShowUI(false);
      } else if (currentScrollY < lastScrollY - 10) {
        setShowUI(true);
      }
      setLastScrollY(currentScrollY);
    }
  };

  const currentContentRef = contentRef.current;
  if (currentContentRef) {
    currentContentRef.addEventListener("scroll", handleScroll);
  }

  return () => {
    if (currentContentRef) {
      currentContentRef.removeEventListener("scroll", handleScroll);
    }
  };
}, [lastScrollY]);

const handleAddPollOption = () => {
  setPollOptions([...pollOptions, ""]);
};

const handleMediaSelect = (source: string, file?: File) => {
  console.log(`Media selected from ${source}:`, file);
  // Aquí iría la lógica para procesar el archivo seleccionado
};

const handleJoinClub = async () => {
  try {
    // TODO: Trigger vibration feedback
    // triggerVibration("medium");

    setShowJoinAnimation(true);

    // TODO: Usar el ID real del club desde params
    // const result = await joinClubAction(mockClub.id);

    // Simular éxito por ahora
    await new Promise(resolve => setTimeout(resolve, 1500));

    setHasJoined(true);
    toast({
      title: "¡Te has unido al club!",
      description: `Bienvenido a ${mockClub.name}`,
    });
  } catch (error) {
    toast({
      title: "Error al unirse",
      description: "Ha ocurrido un error inesperado",
      variant: "destructive",
    });
  } finally {
    setShowJoinAnimation(false);
  }
};

const activeChannel = mockClub.channels.find(
  (channel) => channel.id === activeTab
);
// Para visitantes: solo acceso al primer canal (free)
// Para miembros: acceso basado en suscripción
const hasSubscription = isVisitor
  ? activeChannel?.order === 1 // Solo primer canal para visitantes
  : activeChannel?.price === 0; // Lógica existente para miembros

const handleSuperlakesPurchase = () => {
  console.log("Comprando 30 superlikes por $4.99");
  // Aquí iría la lógica para integrar con el sistema de pagos
  // Una vez completada la compra, actualizamos el contador
  setAvailableSuperlikes(30);
};

// Mostrar el icono de mejora solo si hay 10+ caracteres
const showImproveIcon = message.length >= 10;

return (
  <>
    <WelcomeClubMessage
      clubId={mockClub.id}
      clubName={mockClub.name}
      clubColor={mockClub.color}
      clubIconUrl={mockClub.imageUrl}
      welcomeMessage={mockClub.welcome || "¡Bienvenido a la comunidad!"}
    />
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header fijo del club - Solo el nombre siempre visible */}
      <div className="border-b bg-background z-50 sticky top-0">
        <div className="container py-3">
          <div className="flex items-center justify-center">
            <Link
              href={`/clubs/${params.id}/info`}
              className="flex items-center gap-2"
            >
              <Avatar className="h-8 w-8 transition-transform hover:scale-105">
                <AvatarImage
                  src={mockClub.imageUrl || "/placeholder.svg"}
                  alt={mockClub.name}
                />
                <AvatarFallback>
                  {mockClub.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-lg font-bold">{mockClub.name}</h1>
            </Link>
          </div>
        </div>

        {/* Tabs de canales - Se ocultan con el scroll */}
        <AnimatePresence>
          {showUI && (
            <motion.div
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -100 }}
              transition={{ duration: 0.3 }}
              className="border-t bg-background"
            >
              <Tabs
                defaultValue="general"
                value={effectiveActiveTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <ScrollArea className="w-full">
                  <TabsList className="w-full flex justify-start px-0 h-10 bg-transparent">
                    {availableChannels.map((channel) => (
                      <TabsTrigger
                        key={channel.id}
                        value={channel.id}
                        className="flex-1 items-center whitespace-nowrap transition-colors data-[state=active]:bg-muted"
                      >
                        {channel.name}
                        {channel.price > 0 && (
                          <span className="ml-1 text-xs">
                            {channel.type === "escalonado" ? "🔢" : "💎"}
                          </span>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollArea>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Contenido principal con scroll */}
      <div className="flex-1 overflow-hidden">
        <div ref={contentRef} className="h-full overflow-y-auto pb-32">
          <Tabs
            defaultValue="general"
            value={effectiveActiveTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            {availableChannels.map((channel) => (
              <TabsContent
                key={channel.id}
                value={channel.id}
                className="mt-0 p-0"
              >
                {channel.price > 0 && !hasSubscription ? (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-muted/30">
                    <div className="max-w-md mx-auto">
                      <h3 className="text-2xl font-bold mb-4">
                        Canal{" "}
                        {channel.type === "escalonado" ? "Escalonado" : "Extra"}
                      </h3>
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        {channel.benefits}
                      </p>
                      <div className="bg-background rounded-lg p-6 shadow-sm border">
                        <p className="text-3xl font-bold text-primary mb-4">
                          ${channel.price}/mes
                        </p>
                        <Button
                          size="lg"
                          className="w-full bg-primary hover:bg-primary/90 transition-colors"
                        >
                          Suscribirse ahora
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full">
                    {channel.id === "general" ? (
                      <div className="w-full" data-channel="general">
                        {/* TODO: Render posts here */}
                        <div className="p-4 text-center text-muted-foreground">
                          Contenido del canal {channel.name}
                        </div>
                      </div>
                    ) : (
                      <div className="container py-8">
                        <div className="flex items-center justify-center h-40 text-muted-foreground">
                          No hay mensajes en este canal todavía
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
      {/* Botón para mostrar UI cuando está oculta */}
      <AnimatePresence>
        {!showUI && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 z-50 bg-primary text-white rounded-full p-2 shadow-lg"
            onClick={() => setShowUI(true)}
          >
            <ChevronUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Barra de creación de contenido - Solo para miembros */}
      <AnimatePresence>
        {showUI && mockClub.isCreator && hasSubscription && isMember && (
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-12 left-0 right-0 z-20"
          >
            <ContentCreationBar clubColor={mockClub.color} />
            <ChatContentCreationBar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón flotante para unirse - Solo para visitantes */}
      {isVisitor && !hasJoined && (
        <FloatingJoinButton
          clubName={mockClub.name}
          clubIconUrl={mockClub.imageUrl}
          clubColor={mockClub.color}
          onJoin={handleJoinClub}
          isJoining={showJoinAnimation}
        />
      )}

      <AllWidget
        open={showWidgetModal}
        onOpenChange={setShowWidgetModal}
        triggerRef={widgetButtonRef}
      />

      <MediaSelectionModal
        open={showMediaModal}
        onOpenChange={setShowMediaModal}
        type={currentMediaType}
        onSelect={handleMediaSelect}
        clubId={mockClub.id}
      />
    </div>
  </>
)
