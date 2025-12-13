/**
 * Post Store - Zustand state management for posts
 * Implements optimistic updates and efficient post management
 */
import { create } from 'zustand'
import type { Post } from '@/types/post'

interface PostStore {
    // State
    posts: Post[]
    optimisticPostIds: Set<string>
    isLoading: boolean

    // Actions - Posts Management
    addPost: (post: Post) => void
    setPosts: (posts: Post[]) => void
    removePost: (postId: string) => void
    updatePost: (postId: string, updates: Partial<Post>) => void
    clearPosts: () => void

    // Selectors
    getPostById: (postId: string) => Post | undefined
    getPostsByClubId: (clubId: string) => Post[]

    // Optimistic Updates
    addOptimisticPost: (post: Post) => void
    confirmOptimisticPost: (tempId: string, realPost: Post) => void
    removeOptimisticPost: (tempId: string) => void

    // Loading State
    setLoading: (loading: boolean) => void
}

export const usePostStore = create<PostStore>((set, get) => ({
    // Initial State
    posts: [],
    optimisticPostIds: new Set<string>(),
    isLoading: false,

    // Actions - Posts Management
    addPost: (post) =>
        set((state) => ({
            posts: [post, ...state.posts],
        })),

    setPosts: (posts) =>
        set(() => ({
            posts,
        })),

    removePost: (postId) =>
        set((state) => ({
            posts: state.posts.filter((p) => p.id !== postId),
            optimisticPostIds: new Set(
                Array.from(state.optimisticPostIds).filter((id) => id !== postId)
            ),
        })),

    updatePost: (postId, updates) =>
        set((state) => ({
            posts: state.posts.map((p) => (p.id === postId ? { ...p, ...updates } : p)),
        })),

    clearPosts: () =>
        set(() => ({
            posts: [],
            optimisticPostIds: new Set<string>(),
        })),

    // Selectors
    getPostById: (postId) => {
        return get().posts.find((p) => p.id === postId)
    },

    getPostsByClubId: (clubId) => {
        return get().posts.filter((p) => p.club_id === clubId)
    },

    // Optimistic Updates
    addOptimisticPost: (post) =>
        set((state) => {
            const newOptimisticIds = new Set(state.optimisticPostIds)
            newOptimisticIds.add(post.id)
            return {
                posts: [post, ...state.posts],
                optimisticPostIds: newOptimisticIds,
            }
        }),

    confirmOptimisticPost: (tempId, realPost) =>
        set((state) => {
            const newOptimisticIds = new Set(state.optimisticPostIds)
            newOptimisticIds.delete(tempId)

            return {
                posts: state.posts.map((p) => (p.id === tempId ? realPost : p)),
                optimisticPostIds: newOptimisticIds,
            }
        }),

    removeOptimisticPost: (tempId) =>
        set((state) => {
            const newOptimisticIds = new Set(state.optimisticPostIds)
            newOptimisticIds.delete(tempId)

            return {
                posts: state.posts.filter((p) => p.id !== tempId),
                optimisticPostIds: newOptimisticIds,
            }
        }),

    // Loading State
    setLoading: (loading) =>
        set(() => ({
            isLoading: loading,
        })),
}))
