import { ImageIcon } from "lucide-react";
import React, { useRef } from "react";

import { Button } from "./ui/button";

interface ImageUploadButtonProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  buttonText?: string;
  iconColor?: string;
  className?: string;
  buttonProps?: React.ComponentProps<typeof Button>;
}

const ImageUploadButton = ({
  onFileChange,
  buttonText = "Seleccionar imagen",
  iconColor = "red",
  className = "",
  buttonProps = {},
}: ImageUploadButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`flex items-center gap-2 h-10 px-2 md:px-4 text-xs md:text-sm font-medium p-0 hover:scale-105 transition-transform ${className}`}
        onClick={handleButtonClick}
        {...buttonProps}
      >
        <ImageIcon size={20} style={{ color: iconColor }} />
        <span>{buttonText}</span>
      </Button>
      <input
        type="file"
        accept="image/*"
        ref={inputRef}
        className="hidden"
        onChange={onFileChange}
      />
    </>
  );
};

export default ImageUploadButton;
