import { Card } from "@/components/ui/card"
import type { Post } from "@/types/post"

import PostActions from "./post-actions"
import PostHeader from "./post-header"

interface PostTextProps {
  post: Post
  availableSuperlikes: number
  onSuperlikePurchase: () => void
  onComment: () => void
  clubColor?: string
}

export default function PostText({
  post,
  availableSuperlikes,
  onSuperlikePurchase,
  onComment,
  clubColor,
}: PostTextProps) {
  return (
    <Card className="mb-4 overflow-hidden">
      <PostHeader id={post.id} user={post.user} createdAt={post.createdAt} clubColor={clubColor} />

      <div className="px-4 pb-4">
        <p className="text-sm leading-relaxed">{post.content}</p>
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
  )
}
