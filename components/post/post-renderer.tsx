import PostText from "./post-text"
import PostImage from "./post-image"
import PostVideo from "./post-video"
import PostAudio from "./post-audio"
import PostPoll from "./post-poll"
import type { Post } from "@/types/post"

interface PostRendererProps {
  post: Post
  availableSuperlikes: number
  onSuperlikePurchase: () => void
  onComment: () => void
  clubColor?: string
}

export default function PostRenderer({
  post,
  availableSuperlikes,
  onSuperlikePurchase,
  onComment,
  clubColor,
}: PostRendererProps) {
  const commonProps = {
    post,
    availableSuperlikes,
    onSuperlikePurchase,
    onComment,
    clubColor,
  }

  switch (post.type) {
    case "text":
      return <PostText {...commonProps} />
    case "image":
      return <PostImage {...commonProps} />
    case "video":
      return <PostVideo {...commonProps} />
    case "audio":
      return <PostAudio {...commonProps} />
    case "poll":
      return <PostPoll {...commonProps} />
    default:
      return <PostText {...commonProps} />
  }
}
