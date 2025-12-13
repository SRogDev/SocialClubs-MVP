import { Card } from "@/components/ui/card";
import PostHeader from "./post-header";
import PostActions from "./post-actions";
import type { Post } from "@/types/post";

interface PostImageProps {
  post: Post;
  availableSuperlikes: number;
  onSuperlikePurchase: () => void;
  onComment: () => void;
  clubColor?: string;
}

export default function PostImage({
  post,
  availableSuperlikes,
  onSuperlikePurchase,
  onComment,
  clubColor,
}: PostImageProps) {
  return (
    <Card className="mb-4 overflow-hidden">
      <PostHeader
        user={post.user}
        createdAt={post.createdAt}
        clubColor={clubColor}
        id={post.id}
      />

      <div className="px-4 pb-3">
        <p className="text-sm">{post.content}</p>
      </div>

      {post.imageUrl && (
        <div className="relative">
          <img
            src={post.imageUrl || "/placeholder.svg"}
            alt="Post content"
            className="w-full h-auto object-cover"
          />
        </div>
      )}

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
