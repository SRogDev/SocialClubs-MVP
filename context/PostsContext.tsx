"use client"

/**
 * PostsContext - Temporary context bridge for posts management
 * 
 * This is a temporary solution to prevent build errors.
 * Will be migrated to Zustand store later.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Post } from '@/types/post'

interface PostsContextValue {
    posts: Post[]
    addPost: (post: Post) => void
    updatePost: (postId: string, updates: Partial<Post>) => void
    deletePost: (postId: string) => void
    setPosts: (posts: Post[]) => void
}

const PostsContext = createContext<PostsContextValue | undefined>(undefined)

export function PostsProvider({ children }: { children: ReactNode }) {
    const [posts, setPosts] = useState<Post[]>([])

    const addPost = useCallback((post: Post) => {
        setPosts(prev => [post, ...prev])
    }, [])

    const updatePost = useCallback((postId: string, updates: Partial<Post>) => {
        setPosts(prev =>
            prev.map(post =>
                post.id === postId ? { ...post, ...updates } : post
            )
        )
    }, [])

    const deletePost = useCallback((postId: string) => {
        setPosts(prev => prev.filter(post => post.id !== postId))
    }, [])

    return (
        <PostsContext.Provider value={{ posts, addPost, updatePost, deletePost, setPosts }}>
            {children}
        </PostsContext.Provider>
    )
}

export function usePosts() {
    const context = useContext(PostsContext)

    if (context === undefined) {
        throw new Error('usePosts must be used within a PostsProvider')
    }

    return context
}
