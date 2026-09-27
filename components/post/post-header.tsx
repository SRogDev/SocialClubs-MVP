import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, PencilIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";

import PollFormModal from "@/components/post/poll-form-modal";
import PreviewImage from "@/components/post/preview-image";
import AvatarWithBadge from "@/components/ui/avatar-with-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useActions from "@/hooks/use-actions";
import useOptions from "@/hooks/use-options";
import { usePostStore } from "@/stores/post";

interface PostHeaderProps {
  user: {
    name: string;
    username: string;
    avatar: string;
  };
  id: string;
  createdAt: string;
  clubColor?: string;
}

export default function PostHeader({
  user,
  createdAt,
  id,
  clubColor = "#f97316",
}: PostHeaderProps) {
  const { DeletePost } = useActions();
  const options = useOptions();
  const posts = usePostStore((s) => s.posts);
  const getPost = usePostStore((s) => s.getPost);
  const [post, setPost] = useState(getPost(id));

  useEffect(() => {
    setPost(getPost(id));
  }, [posts, getPost, id]);
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <AvatarWithBadge
          src={user.avatar}
          alt={user.name}
          fallback={user.name.substring(0, 2).toUpperCase()}
          level={8}
          color={clubColor}
          size="md"
        />
        <div>
          <h4 className="font-semibold text-sm">{user.name}</h4>
          <p className="text-xs text-muted-foreground">
            @{user.username} • {createdAt}
          </p>
        </div>
      </div>
      <div className="md:w-24 w-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="z-50 flex gap-2">
            <DropdownMenuItem>
              <Button
                type="button"
                className="w-full text-white flex bg-transparent justify-start hover:rounded-lg hover:bg-slate-800 rounded-lg gap-2"
                onClick={() => options.handleContentClick(post.type)}
              >
                <PencilIcon />
                <span className="capitalize">Editar</span>
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Button
                type="button"
                className="w-full text-white flex bg-transparent justify-start hover:rounded-lg hover:bg-slate-800 rounded-lg gap-2 "
                onClick={() => DeletePost(id)}
              >
                <TrashIcon />
                <span className="capitalize">Eliminar</span>
              </Button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {options.contentType == "image" &&
        options.showContentModal &&
        post.imageUrl && (
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
                preview={post.imageUrl}
                message={post.content}
                action="edit"
                id={post.id}
              ></PreviewImage>
            </DialogContent>
          </Dialog>
        )}
      {options.contentType == "poll" && options.showContentModal && (
        <PollFormModal
          showContentModal={options.showContentModal}
          setShowContentModal={options.setShowContentModal}
          action="edit"
          post={post}
        ></PollFormModal>
      )}
    </div>
  );
}
