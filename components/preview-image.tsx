import { ImageIcon, Image as Imagen, SendIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import Image from "next/image";
import useActions from "@/hooks/use-actions";
import { Spinner } from "./ui/spinner";
import useOptions from "@/hooks/use-options";
import { Textarea } from "./ui/textarea";
import ImageUploadButton from "./image-upload-button";

interface PreviewImageProps {
  name?: string;
  preview: string;
  size?: number;
  message?: string;
  id?: string;
  closeDialog: () => void;
  action: "add" | "edit";
}

interface Properties {
  message: string;
  image: string;
  name: string | undefined;
  size: number | undefined;
}

function PreviewImage({
  name: n,
  size: s,
  preview,
  closeDialog,
  message: ms,
  action,
  id,
}: PreviewImageProps) {
  const actions = useActions();
  const [caption, setCaption] = useState(ms ? ms : "");
  const options = useOptions();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Properties>({
    message: ms ? ms : "",
    image: preview,
    name: n,
    size: s,
  });
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [caption]);

  const handleClick = () => {
    if (action === "add") {
      actions.addNewImage(properties.image, caption);
    } else {
      //@ts-ignore
      actions.editImage(id, properties.image, caption);
    }
    closeDialog();
  };
  function handleNewFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setLoading(true);

    // Procesa el archivo directamente, sin depender de selectedFile del estado
    const url = URL.createObjectURL(selected);
    const newFile: Properties = {
      ...properties,
      image: url,
      name: selected.name,
      size: selected.size,
    };
    setProperties(newFile);

    setTimeout(() => {
      setLoading(false);
    }, 3000);
  }
  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden border">
      {/* Header del preview */}
      {properties.name && properties.size ? (
        <div className="flex items-center justify-between p-3 bg-muted border-b">
          <div className="flex items-center gap-2">
            <Imagen size={16} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground truncate max-w-48">
                {properties.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(properties.size)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-10  p-0 hover:scale-110 transition-transform"
            onClick={() => options.handleButtonClick()}
          >
            <ImageIcon size={20} style={{ color: "red" }} />
            <span className="text-sm">Cambiar imagen</span>
          </Button>
          <input
            type="file"
            accept="image/*"
            ref={options.inputRef}
            className="hidden"
            onChange={handleNewFile}
          />
        </div>
      ) : (
        <ImageUploadButton
          onFileChange={handleNewFile}
          buttonText="Cambiar imagen"
          iconColor="red"
          className="my-2"
        />
      )}

      {/* Imagen */}
      <div className="p-3">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" className="text-orange-500"></Spinner>
          </div>
        ) : (
          <Image
            src={properties.image}
            alt="Preview"
            width={100}
            height={64}
            className="w-full max-h-64 object-contain rounded border"
          />
        )}
      </div>

      {/* Caption input */}
      <div className="p-3 border-t bg-muted/50">
        <div className="flex items-end gap-4">
          <Textarea
            ref={textareaRef}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Añade una descripción..."
            rows={1}
            className="w-full resize-none overflow-hidden py-2 px-2"
          />
          <Button
            onClick={handleClick}
            className="bg-green-500 hover:bg-green-600 text-white"
            size="icon"
          >
            {actions.isLoading ? (
              <Spinner className="text-black"></Spinner>
            ) : (
              <SendIcon className="size-3 md:size-5"></SendIcon>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PreviewImage;
