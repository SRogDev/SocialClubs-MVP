import type { Post } from "@/types/post"

import PostAudio from "./post-audio"
import PostImage from "./post-image"
import PostPoll from "./post-poll"
import PostText from "./post-text"
import PostVideo from "./post-video"


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
