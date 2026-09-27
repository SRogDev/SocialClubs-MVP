/**
 * Unit tests for Post Store (TDD)
 */
import { renderHook, act } from '@testing-library/react'

import type { Post, PostInteraction } from '@/types/post'

import { usePostStore } from '@/stores/postStore'

describe('usePostStore', () => {
    beforeEach(() => {
        // Reset store before each test
        const { result } = renderHook(() => usePostStore())
        act(() => {
            result.current.clearPosts()
        })
    })

    describe('Posts Management', () => {
        it('should initialize with empty posts', () => {
            // GIVEN: Fresh store instance
            const { result } = renderHook(() => usePostStore())

            // WHEN: Store is accessed
            const posts = result.current.posts

            // THEN: Posts array should be empty
            expect(posts).toEqual([])
        })

        it('should add a single post', () => {
            // GIVEN: A new post
            const { result } = renderHook(() => usePostStore())
            const newPost: Post = {
                id: '1',
                club_id: 'club-1',
                content: { text: 'Test post' },
                type: 'text',
                created_at: new Date().toISOString(),
            }

            // WHEN: Post is added
            act(() => {
                result.current.addPost(newPost)
            })

            // THEN: Post should be in the store
            expect(result.current.posts).toHaveLength(1)
            expect(result.current.posts[0]).toEqual(newPost)
        })

        it('should add multiple posts', () => {
            // GIVEN: Multiple posts
            const { result } = renderHook(() => usePostStore())
            const posts: Post[] = [
                {
                    id: '1',
                    club_id: 'club-1',
                    content: { text: 'Post 1' },
                    type: 'text',
                    created_at: new Date().toISOString(),
                },
                {
                    id: '2',
                    club_id: 'club-1',
                    content: { text: 'Post 2' },
                    type: 'text',
                    created_at: new Date().toISOString(),
                },
            ]

            // WHEN: Posts are added in batch
            act(() => {
                result.current.setPosts(posts)
            })

            // THEN: All posts should be in the store
            expect(result.current.posts).toHaveLength(2)
            expect(result.current.posts).toEqual(posts)
        })

        it('should remove a post by id', () => {
            // GIVEN: Store with posts
            const { result } = renderHook(() => usePostStore())
            const posts: Post[] = [
                {
                    id: '1',
                    club_id: 'club-1',
                    content: { text: 'Post 1' },
                    type: 'text',
                    created_at: new Date().toISOString(),
                },
                {
                    id: '2',
                    club_id: 'club-1',
                    content: { text: 'Post 2' },
                    type: 'text',
                    created_at: new Date().toISOString(),
                },
            ]

            act(() => {
                result.current.setPosts(posts)
            })

            // WHEN: A post is removed
            act(() => {
                result.current.removePost('1')
            })

            // THEN: Post should be removed from store
            expect(result.current.posts).toHaveLength(1)
            expect(result.current.posts[0].id).toBe('2')
        })

        it('should update a post', () => {
            // GIVEN: Store with a post
            const { result } = renderHook(() => usePostStore())
            const post: Post = {
                id: '1',
                club_id: 'club-1',
                content: { text: 'Original content' },
                type: 'text',
                created_at: new Date().toISOString(),
            }

            act(() => {
                result.current.addPost(post)
            })

            // WHEN: Post is updated
            const updatedContent = { text: 'Updated content' }
            act(() => {
                result.current.updatePost('1', { content: updatedContent })
            })

            // THEN: Post should be updated in store
            expect(result.current.posts[0].content).toEqual(updatedContent)
        })

        it('should get a post by id', () => {
            // GIVEN: Store with posts
            const { result } = renderHook(() => usePostStore())
            const post: Post = {
                id: '1',
                club_id: 'club-1',
                content: { text: 'Test post' },
                type: 'text',
                created_at: new Date().toISOString(),
            }

            act(() => {
                result.current.addPost(post)
            })

            // WHEN: Getting post by id
            const foundPost = result.current.getPostById('1')

            // THEN: Should return the correct post
            expect(foundPost).toEqual(post)
        })

        it('should return undefined for non-existent post id', () => {
            // GIVEN: Store with posts
            const { result } = renderHook(() => usePostStore())

            // WHEN: Getting non-existent post
            const foundPost = result.current.getPostById('non-existent')

            // THEN: Should return undefined
            expect(foundPost).toBeUndefined()
        })
    })

    describe('Posts Filtering', () => {
        it('should get posts by club id', () => {
            // GIVEN: Posts from different clubs
            const { result } = renderHook(() => usePostStore())
            const posts: Post[] = [
                {
                    id: '1',
                    club_id: 'club-1',
                    content: { text: 'Post 1' },
                    type: 'text',
                    created_at: new Date().toISOString(),
                },
                {
                    id: '2',
                    club_id: 'club-2',
                    content: { text: 'Post 2' },
                    type: 'text',
                    created_at: new Date().toISOString(),
                },
                {
                    id: '3',
                    club_id: 'club-1',
                    content: { text: 'Post 3' },
                    type: 'text',
                    created_at: new Date().toISOString(),
                },
            ]

            act(() => {
                result.current.setPosts(posts)
            })

            // WHEN: Filtering posts by club id
            const clubPosts = result.current.getPostsByClubId('club-1')

            // THEN: Should return only posts from that club
            expect(clubPosts).toHaveLength(2)
            expect(clubPosts.every((p) => p.club_id === 'club-1')).toBe(true)
        })
    })

    describe('Optimistic Updates', () => {
        it('should mark post as optimistic', () => {
            // GIVEN: Store with a post
            const { result } = renderHook(() => usePostStore())
            const post: Post = {
                id: 'temp-1',
                club_id: 'club-1',
                content: { text: 'Optimistic post' },
                type: 'text',
                created_at: new Date().toISOString(),
            }

            // WHEN: Post is added optimistically
            act(() => {
                result.current.addOptimisticPost(post)
            })

            // THEN: Post should be marked as optimistic
            expect(result.current.optimisticPostIds).toContain('temp-1')
            expect(result.current.posts).toHaveLength(1)
        })

        it('should remove optimistic flag after confirmation', () => {
            // GIVEN: Store with optimistic post
            const { result } = renderHook(() => usePostStore())
            const tempPost: Post = {
                id: 'temp-1',
                club_id: 'club-1',
                content: { text: 'Optimistic post' },
                type: 'text',
                created_at: new Date().toISOString(),
            }

            act(() => {
                result.current.addOptimisticPost(tempPost)
            })

            // WHEN: Post is confirmed with real id
            const realPost: Post = { ...tempPost, id: 'real-1' }
            act(() => {
                result.current.confirmOptimisticPost('temp-1', realPost)
            })

            // THEN: Optimistic flag should be removed and post updated
            expect(result.current.optimisticPostIds).not.toContain('temp-1')
            expect(result.current.optimisticPostIds).not.toContain('real-1')
            expect(result.current.getPostById('real-1')).toEqual(realPost)
            expect(result.current.getPostById('temp-1')).toBeUndefined()
        })
    })

    describe('Loading State', () => {
        it('should manage loading state', () => {
            // GIVEN: Store initialized
            const { result } = renderHook(() => usePostStore())

            // WHEN: Loading state is set
            act(() => {
                result.current.setLoading(true)
            })

            // THEN: Loading should be true
            expect(result.current.isLoading).toBe(true)

            // WHEN: Loading state is cleared
            act(() => {
                result.current.setLoading(false)
            })

            // THEN: Loading should be false
            expect(result.current.isLoading).toBe(false)
        })
    })
})
