"use client";

import { useState } from "react";

import ProgressAnimated from "@/components/progress-animated";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Post } from "@/types/post";

import PostActions from "./post-actions";
import PostHeader from "./post-header";

interface PostPollProps {
  post: Post;
  availableSuperlikes: number;
  onSuperlikePurchase: () => void;
  onComment: () => void;
  clubColor?: string;
}

export default function PostPoll({
  post,
  availableSuperlikes,
  onSuperlikePurchase,
  onComment,
  clubColor,
}: PostPollProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [newPercentage, setNewPercentage] = useState(0);
  const handleVote = (optionId: string) => {
    if (!hasVoted) {
      const findOption = post.poll?.options.filter(
        (option) => option.id == optionId
      )[0];
      if (post.poll?.totalVotes === 0) {
        setNewPercentage(100);
      } else {
        setNewPercentage(
          ((findOption.votes + 1) * 100) / post.poll?.totalVotes
        );
      }
      setSelectedOption(optionId);
      setHasVoted(true);
    }
  };

  return (
    <Card className="mb-4 overflow-hidden">
      <PostHeader
        user={post.user}
        createdAt={post.createdAt}
        clubColor={clubColor}
        id={post.id}
      />

      <div className="px-4 pb-3">
        <p className="text-xl mb-4">{post.content}</p>

        {post.poll && (
          <div className="space-y-2">
            {post.poll.options.map((option) => {
              const percentage = post.poll
                ? (option.votes / post.poll.totalVotes) * 100
                : 0;
              const isSelected = selectedOption === option.id;

              return (
                <>
                  {!hasVoted && (
                    <Button
                      key={option.id}
                      variant="outline"
                      className={`w-full justify-start relative overflow-hidden h-auto p-3 ${
                        isSelected ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => handleVote(option.id)}
                      disabled={hasVoted}
                    >
                      <div className="relative z-10 flex justify-between items-center w-full">
                        <span className="text-sm">{option.text}</span>
                      </div>
                    </Button>
                  )}
                  {hasVoted && (
                    <>
                      {isSelected ? (
                        <ProgressAnimated
                          percentage={newPercentage}
                          votes={option.votes + 1}
                          key={option.id}
                          text={option.text}
                        ></ProgressAnimated>
                      ) : (
                        <ProgressAnimated
                          percentage={percentage ? percentage : 0}
                          votes={option.votes}
                          key={option.id}
                          text={option.text}
                        ></ProgressAnimated>
                      )}
                    </>
                  )}
                </>
              );
            })}

            <p className="text-xs text-muted-foreground mt-3">
              {hasVoted ? post.poll.totalVotes + 1 : post.poll.totalVotes} votos
              totales
            </p>
          </div>
        )}
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
