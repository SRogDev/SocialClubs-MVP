import { create } from 'zustand';
import type { Post } from '@/types/post';

interface PostStore {
    posts: Post[];
    setPosts: (posts: Post[]) => void;
    addPost: (post: Post) => void;
    updatePost: (postId: string, updates: Partial<Post>) => void;
    deletePost: (postId: string) => void;
    getPost: (postId: string) => Post | undefined;
}

export const usePostStore = create<PostStore>((set, get) => ({
    posts: [],
    setPosts: (posts) => set({ posts }),
    addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
    updatePost: (postId, updates) =>
        set((state) => ({
            posts: state.posts.map((post) =>
                post.id === postId ? { ...post, ...updates } : post
            ),
        })),
    deletePost: (postId) =>
        set((state) => ({ posts: state.posts.filter((post) => post.id !== postId) })),
    getPost: (postId) => get().posts.find((post) => post.id === postId),
}));
