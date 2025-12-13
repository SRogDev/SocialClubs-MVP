import { Card } from "@/components/ui/card";
import { Play } from "lucide-react";
import PostHeader from "./post-header";
import PostActions from "./post-actions";
import type { Post } from "@/types/post";

interface PostVideoProps {
  post: Post;
  availableSuperlikes: number;
  onSuperlikePurchase: () => void;
  onComment: () => void;
  clubColor?: string;
}

export default function PostVideo({
  post,
  availableSuperlikes,
  onSuperlikePurchase,
  onComment,
  clubColor,
}: PostVideoProps) {
  return (
    <Card className="mb-4 overflow-hidden">
      <PostHeader
        id={post.id}
        user={post.user}
        createdAt={post.createdAt}
        clubColor={clubColor}
      />

      <div className="px-4 pb-3">
        <p className="text-sm">{post.content}</p>
      </div>

      <div className="relative bg-black aspect-video flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700" />
        <div className="relative z-10 flex flex-col items-center text-white">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <Play size={24} className="ml-1" />
          </div>
          <p className="text-sm opacity-80">Video Tutorial</p>
        </div>
      </div>

      <PostActions
        postId={post.id}
        likesCount={post.likesCount}
        commentsCount={post.commentsCount}
        viewsCount={post.viewsCount}
        superlikesCount={post.superlikesCount}
        isLiked={post.isLiked}
        isSuperliked={post.isSuperliked}
        availableSuperlikes={availableSuperlikes}
        onSuperlikePurchase={onSuperlikePurchase}
        onComment={onComment}
      />
    </Card>
  );
}
