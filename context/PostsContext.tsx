"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"

export type PostItem = {
  id: string | number
  [key: string]: unknown
}

type PostsContextValue = {
  posts: PostItem[]
  addPost: (post: PostItem) => void
  editPost: (id: string | number, post: Partial<PostItem>) => void
  deletePost: (id: string | number) => void
  getPost: (id: string | number) => PostItem | undefined
}

const PostsContext = createContext<PostsContextValue | null>(null)

export function PostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<PostItem[]>([])

  const addPost = useCallback((post: PostItem) => {
    setPosts((prev) => [...prev, post])
  }, [])

  const editPost = useCallback((id: string | number, post: Partial<PostItem>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...post } : p)))
  }, [])

  const deletePost = useCallback((id: string | number) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const getPost = useCallback(
    (id: string | number) => posts.find((p) => p.id === id),
    [posts]
  )

  const value = useMemo(
    () => ({ posts, addPost, editPost, deletePost, getPost }),
    [posts, addPost, editPost, deletePost, getPost]
  )

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>
}

export function usePosts(): PostsContextValue {
  const ctx = useContext(PostsContext)
  if (!ctx) {
    throw new Error("usePosts must be used within a PostsProvider")
  }
  return ctx
}
