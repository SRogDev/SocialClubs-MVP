"use client";

import { usePosts } from "@/context/PostsContext";
import { Poll, Post } from "@/types/post";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

function useActions() {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState();
  const { addPost, editPost, deletePost, getPost, posts } = usePosts();
  const [newPost, setNewPost] = useState<Post>({
    id: "",
    user: {
      name: "Ray Rendon Mesa",
      username: "utopicRay",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    content: "",
    imageUrl: "",
    createdAt: "Justo ahora",
    likesCount: 0,
    commentsCount: 0,
    viewsCount: 0,
    superlikesCount: 0,
    type: "image",
  });

  function addNewImage(image: string, message: string) {
    try {
      setLoading(true);
      const nuevoPost: Post = {
        ...newPost,
        id: (posts[posts.length - 1]?.id ?? 0) + 1,
        content: message,
        imageUrl: image,
      };
      setNewPost(nuevoPost);
      addPost(nuevoPost);
      toast({
        title: "Imagen publicada",
        description: "¡Tu imagen se ha publicado correctamente!",
      });
    } catch (e) {
      setError(e.message);
      console.log("Error en:" + e.message);
    } finally {
      setLoading(false);
    }
  }
  function editImage(id: string, image: string, message: string) {
    try {
      setLoading(true);
      const updatePost: Partial<Post> = {
        content: message,
        imageUrl: image,
      };
      editPost(id, updatePost);
      toast({
        title: "Imagen editada",
        description: "¡La imagen se ha editado correctamente!",
      });
    } catch (e) {
      setError(e.message);
      console.log("Error en:" + e.message);
    } finally {
      setLoading(false);
    }
  }

  function addNewPoll(options: Poll) {
    try {
      setLoading(true);
      const nuevoPost: Post = {
        ...newPost,
        id: (posts[posts.length - 1]?.id ?? 0) + 1,
        content: options.question,
        poll: options,
        type: "poll",
      };
      setNewPost(nuevoPost);
      addPost(nuevoPost);
      toast({
        title: "Encuesta publicada",
        description: "¡Tu encuesta se ha publicado correctamente!",
      });
    } catch (e) {
      setError(e.message);
      console.log("Error en:" + e.message);
    } finally {
      setLoading(false);
    }
  }
  function editPoll(id: string, updatePoll: Poll) {
    try {
      setLoading(true);
      const updatePost: Partial<Post> = {
        poll: updatePoll,
      };
      editPost(id, updatePost);
      toast({
        title: "Encuesta editada",
        description: "¡La encuesta se ha editado correctamente!",
      });
    } catch (e) {
      setError(e.message);
      console.log("Error en:" + e.message);
    } finally {
      setLoading(false);
    }
  }
  function DeletePost(id: string) {
    try {
      setLoading(true);
      deletePost(id);
      toast({
        title: "Post eliminado",
        description: "¡El post se ha eliminado correctamente!",
      });
    } catch (e) {
      setError(e.message);
      console.log("Error en:" + e.message);
    } finally {
      setLoading(false);
    }
  }
  return {
    addNewImage,
    isLoading,
    addNewPoll,
    editPoll,
    DeletePost,
    editImage,
  };
}
export default useActions;
