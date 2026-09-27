import { useRef, useState } from "react";

import type { PostTypes } from "@/types/post";

function useOptions() {
  const [showContentModal, setShowContentModal] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [contentType, setContentType] = useState<PostTypes|''>("");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleContentClick = (type: PostTypes) => {
    setContentType(type);

    setTimeout(() => {
      setShowContentModal(true);
    }, 150); // Usa 150ms o más
  };

  const handleWidgetClick = (widgetId: string) => {
    setContentType(`widget-${widgetId}`);
    setShowWidgetModal(false);
    setShowContentModal(true);
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      setPreview(null);
      setSelectedFile(null);
      return;
    }

    // Validar que sea una imagen
    if (!selected.type.startsWith("image/")) {
      alert("Por favor selecciona un archivo de imagen válido");
      return;
    }

    /* Validar tamaño del archivo
    const fileSizeInMB = selected.size / (1024 * 1024);
    if (fileSizeInMB > maxSizeInMB) {
      alert(
        `El archivo es demasiado grande. Máximo ${maxSizeInMB}MB permitido.`
      );
      return;
    }*/
    const url = URL.createObjectURL(selected);
    setPreview(url);
    setSelectedFile(selected);
    handleContentClick("image");
    // Limpia el input para permitir seleccionar la misma imagen de nuevo
    e.target.value = "";
  };
  return {
    handleFileChange,
    handleContentClick,
    handleButtonClick,
    inputRef,
    showContentModal,
    setShowContentModal,
    preview,
    selectedFile,
    contentType,
  };
}
export default useOptions;
