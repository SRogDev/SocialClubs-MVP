import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { BarChart2, Image, PuzzleIcon, SendIcon, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ImAttachment } from "react-icons/im";
import { RiGeminiLine } from "react-icons/ri";

import { Spinner } from "@/components/ui/spinner";
import WidgetSelector from "@/components/widgets/widget-selector";
import useOptions from "@/hooks/use-options";

import PollForm from "../post/poll-form";
import PreviewImage from "../post/preview-image";
import { Button } from "../ui/button";


import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";



import { Textarea } from "../ui/textarea";

interface ChatContentCreationBarProps {
  clubId: string;
  userId: string | null;
}

function ChatContentCreationBar({ clubId, userId }: ChatContentCreationBarProps) {
  const [isLoading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prueba = useOptions();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        `${textareaRef.current.scrollHeight  }px`;
    }
  }, [message]);

  function handleClick() {
    if (isLoading) {
      setLoading(false);
    } else {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setMessage("");
      }, 2000);
    }
  }

  const listOptions = [
    {
      value: "video",
      label: "video",
      type: "video",
      icon: <Video className="size-3" />,
    },
    {
      value: "encuesta",
      label: "encuesta",
      type: "poll",
      icon: <BarChart2 className="size-3" />,
    },
    {
      value: "widget",
      label: "widget",
      type: "widget",
      icon: <PuzzleIcon className="size-3" />,
    },
  ];

  function handleOptionClick(type: string) {
    if (type === "widget") {
      setShowWidgetSelector(true);
    } else {
      prueba.handleContentClick(type);
    }
  }

  return (
    <>
      <div className="w-full flex my-2 relative justify-center items-center rounded-none">
        <div className="absolute flex gap-2 left-6">
          <Button className="rounded-xl hover:bg-blue-950 bg-slate-900">
            <RiGeminiLine className="text-purple-600 size-3 " />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-xl hover:bg-blue-950 bg-slate-900">
                <ImAttachment className="text-purple-600 size-3"></ImAttachment>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <Button
                type="button"
                className="w-full text-white flex bg-transparent justify-start hover:rounded-lg hover:bg-slate-800 rounded-lg gap-2"
                onClick={prueba.handleButtonClick}
              >
                <Image size={16} className="text-sm capitalize" />
                Imagen
              </Button>
              {/* Hidden file input */}
              <input
                type="file"
                accept="image/*"
                ref={prueba.inputRef}
                className="hidden"
                onChange={prueba.handleFileChange}
              />
              {listOptions.map((option) => (
                <DropdownMenuItem key={option.value}>
                  <Button
                    type="button"
                    className="w-full text-white flex bg-transparent justify-start hover:rounded-lg hover:bg-slate-800 rounded-lg gap-2"
                    onClick={() => handleOptionClick(option.type)}
                  >
                    {option.icon}
                    <span className="capitalize">{option.label}</span>
                  </Button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Mensaje a enviar..."
          rows={1}
          className="w-full resize-none overflow-hidden py-7 px-32 rounded-none"
        />
        <Button className="absolute right-7 rounded-full" onClick={handleClick}>
          {isLoading ? (
            <Spinner className="text-black"></Spinner>
          ) : (
            <SendIcon className="size-3"></SendIcon>
          )}
        </Button>
      </div>

      {/* Poll dialog */}
      {prueba.contentType == "poll" && prueba.showContentModal && (
        <Dialog
          open={prueba.showContentModal}
          onOpenChange={prueba.setShowContentModal}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Encuesta</DialogTitle>
            </DialogHeader>
            <PollForm
              action="add"
              closeDialog={() => prueba.setShowContentModal(false)}
            ></PollForm>
          </DialogContent>
        </Dialog>
      )}

      {/* Image upload dialog */}
      {prueba.preview && prueba.selectedFile && prueba.showContentModal && (
        <Dialog
          open={prueba.showContentModal}
          onOpenChange={prueba.setShowContentModal}
        >
          <DialogContent className="max-w-md md:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Subir imagen</DialogTitle>
            </DialogHeader>
            <PreviewImage
              preview={prueba.preview}
              name={prueba.selectedFile?.name}
              size={prueba.selectedFile?.size}
              action="add"
              closeDialog={() => prueba.setShowContentModal(false)}
            ></PreviewImage>
          </DialogContent>
        </Dialog>
      )}

      {/* Widget selector bottom sheet */}
      <WidgetSelector
        open={showWidgetSelector}
        onOpenChange={setShowWidgetSelector}
        clubId={clubId}
        userId={userId}
      />
    </>
  );
}

export default ChatContentCreationBar;
