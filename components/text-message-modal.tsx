import { SendIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import { RiGeminiLine } from "react-icons/ri";
import { Spinner } from "./ui/spinner";
import { Dialog, DialogContent } from "./ui/dialog";
import { Textarea } from "./ui/textarea";

export default function TextMessageModal({
  showContentModal,
  setShowContentModal,
}: {
  showContentModal: boolean;
  setShowContentModal: (value: boolean) => void;
}) {
  const [isLoading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
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
  return (
    <Dialog open={showContentModal} onOpenChange={setShowContentModal}>
      <DialogContent className="w-full md:max-w-[80%] fixed top-[80%]">
        <div className="w-full flex px-4 my-2 relative justify-center items-center">
          <Button className="absolute left-7 rounded-full bg-blue-950">
            <RiGeminiLine className="text-purple-600 size-3 md:size-5"></RiGeminiLine>
          </Button>
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mensaje a enviar..."
            rows={1}
            className="w-full resize-none overflow-hidden py-7 px-20"
          />
          <Button
            className="absolute right-7 rounded-full"
            onClick={handleClick}
          >
            {isLoading ? (
              <Spinner className="text-black"></Spinner>
            ) : (
              <SendIcon className="size-3 md:size-5"></SendIcon>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
