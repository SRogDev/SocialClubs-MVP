"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  ImageIcon,
  Video,
  FileAudio,
  BarChart2,
  PuzzleIcon,
  Zap,
  LinkIcon,
  Target,
  Grid3X3,
} from "lucide-react";
import TextMessageModal from "./text-message-modal";
import useOptions from "@/hooks/use-options";
import PreviewImage from "./preview-image";
import PollFormModal from "./poll-form-modal";
import ImageUploadButton from "./image-upload-button";

interface ContentCreationBarProps {
  clubColor?: string;
}

export default function ContentCreationBar({
  clubColor = "#f97316",
}: ContentCreationBarProps) {
  const options = useOptions();
  const [showWidgetModal, setShowWidgetModal] = useState(false);

  /*Listado de iconos y su respectiva funcion */
  const iconList = [
    {
      value: "text",
      icon: MessageSquare,
      handleContentClick: () => options.handleContentClick("text"),
    },
    {
      value: "image",
      icon: ImageIcon,
      handleContentClick: () => options.handleButtonClick(),
    },
    {
      value: "video",
      icon: Video,
      handleContentClick: () => options.handleContentClick("video"),
    },
    {
      value: "audio",
      icon: FileAudio,
      handleContentClick: () => options.handleContentClick("audio"),
    },
    {
      value: "poll",
      icon: BarChart2,
      handleContentClick: () => options.handleContentClick("poll"),
    },
    {
      value: "widget",
      icon: PuzzleIcon,
      handleContentClick: () => options.handleContentClick("widget"),
    },
  ];
  const widgets = [
    {
      id: "rueda",
      name: "Rueda",
      icon: Target,
      description: "Ruleta interactiva",
    },
    {
      id: "magic-link",
      name: "Magic Link",
      icon: LinkIcon,
      description: "Enlaces mágicos",
    },
    { id: "meta", name: "Meta", icon: Zap, description: "Contenido meta" },
    {
      id: "mural",
      name: "Mural",
      icon: Grid3X3,
      description: "Mural colaborativo",
    },
  ];

  const handleWidgetClick = (widgetId: string) => {
    options.setContentType(`widget-${widgetId}`);
    setShowWidgetModal(false);
    options.setShowContentModal(true);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="flex justify-center gap-2">
          {iconList.map((item) => (
            <>
              {item.value == "image" ? (
                <ImageUploadButton
                  onFileChange={options.handleFileChange}
                  buttonText=""
                  iconColor={clubColor}
                ></ImageUploadButton>
              ) : (
                <Button
                  variant="ghost"
                  key={item.value}
                  size="sm"
                  className="h-10 w-10 p-0 hover:scale-110 transition-transform"
                  onClick={item.handleContentClick}
                >
                  <item.icon size={20} style={{ color: clubColor }}></item.icon>
                </Button>
              )}
            </>
          ))}
        </div>
      </div>
      {/* Modal de widgets */}
      <Dialog open={showWidgetModal} onOpenChange={setShowWidgetModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar Widget</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {widgets.map((widget) => (
              <Button
                key={widget.id}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform bg-transparent"
                onClick={() => handleWidgetClick(widget.id)}
                style={{ borderColor: `${clubColor}40` }}
              >
                <widget.icon size={24} style={{ color: clubColor }} />
                <span className="text-sm font-medium">{widget.name}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {options.contentType == "text" && (
        <TextMessageModal
          showContentModal={options.showContentModal}
          setShowContentModal={options.setShowContentModal}
        ></TextMessageModal>
      )}
      {options.contentType == "poll" && options.showContentModal && (
        <PollFormModal
          showContentModal={options.showContentModal}
          setShowContentModal={options.setShowContentModal}
          action="add"
        ></PollFormModal>
      )}
      {options.contentType == "image" &&
        options.showContentModal &&
        options.preview && (
          <Dialog
            open={options.showContentModal}
            onOpenChange={options.setShowContentModal}
          >
            <DialogContent className="max-w-md md:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Subir imagen</DialogTitle>
              </DialogHeader>
              <PreviewImage
                closeDialog={() => options.setShowContentModal(false)}
                preview={options.preview}
                name={options.selectedFile?.name}
                size={options.selectedFile?.size}
                action="add"
              ></PreviewImage>
            </DialogContent>
          </Dialog>
        )}
      {options.contentType != "text" &&
        options.contentType != "poll" &&
        options.contentType != "image" &&
        options.showContentModal && (
          <Dialog
            open={options.showContentModal}
            onOpenChange={options.setShowContentModal}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Contenido</DialogTitle>
              </DialogHeader>
              <div className="py-8 text-center">
                <div className="mb-4">
                  <div
                    className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                    style={{ backgroundColor: `${clubColor}20` }}
                  >
                    <div
                      className="w-8 h-8 rounded-full animate-spin border-2 border-transparent"
                      style={{ borderTopColor: clubColor }}
                    />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Cargando contenido...
                </h3>
                <p className="text-sm text-muted-foreground">
                  Preparando el editor para{" "}
                  {options.contentType.replace("-", " ")}
                </p>
              </div>
            </DialogContent>
          </Dialog>
        )}
      {/* Modal de contenido */}
    </>
  );
}
