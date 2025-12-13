"use client"
import { PostsProvider } from "@/context/PostsContext";
import React from "react";

function ClubLayout({ children }: { children: React.ReactNode }) {
  return <PostsProvider>{children}</PostsProvider>;
}

export default ClubLayout;
