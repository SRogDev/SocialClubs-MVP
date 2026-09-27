"use client";

import { Play, Pause, Volume2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Post } from "@/types/post";

import PostActions from "./post-actions";
import PostHeader from "./post-header";

interface PostAudioProps {
  post: Post;
  availableSuperlikes: number;
  onSuperlikePurchase: () => void;
  onComment: () => void;
  clubColor?: string;
}

export default function PostAudio({
  post,
  availableSuperlikes,
  onSuperlikePurchase,
  onComment,
  clubColor,
}: PostAudioProps) {
  const [isPlaying, setIsPlaying] = useState(false);

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

      <div className="mx-4 mb-4 p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-12 w-12 rounded-full bg-white/50 hover:bg-white/70"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <Pause size={20} />
            ) : (
              <Play size={20} className="ml-1" />
            )}
          </Button>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">Podcast Audio</span>
            </div>
            <div className="w-full bg-white/50 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full w-1/3" />
            </div>
          </div>
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
