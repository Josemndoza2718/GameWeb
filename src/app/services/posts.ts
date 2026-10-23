import { Injectable, inject } from '@angular/core';

import { Post, PostType } from '../models/post.model';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class PostsService {
  private authService = inject(AuthService);

  private get supabase() {
    return this.authService.client;
  }

  /**
   * Obtiene el feed de la comunidad con opción de filtrar por tipo de post o juego específico
   */
  async getPosts(filterType?: PostType | 'all', gameId?: number): Promise<Post[]> {
    let query = this.supabase
      .from('posts')
      .select('*, profiles:user_id (username, avatar_url)')
      .order('created_at', { ascending: false });

    if (filterType && filterType !== 'all') {
      query = query.eq('post_type', filterType);
    }

    if (gameId) {
      query = query.eq('game_id', gameId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Post[];
  }

  /**
   * Crea una nueva publicación vinculada al usuario autenticado
   */
  async createPost(postData: Omit<Post, 'id' | 'user_id' | 'created_at' | 'profiles'>): Promise<Post> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('Debes iniciar sesión para publicar');

    const payload = {
      user_id: user.id,
      game_id: postData.game_id,
      game_title: postData.game_title,
      game_cover: postData.game_cover,
      post_type: postData.post_type,
      title: postData.title,
      content: postData.content,
      score: postData.post_type === 'review' ? postData.score : null
    };

    const { data, error } = await this.supabase
      .from('posts')
      .insert(payload)
      .select('*, profiles:user_id (username, avatar_url)')
      .single();

    if (error) throw error;
    return data as Post;
  }

  /**
   * Elimina una publicación si el usuario es el propietario (validado por RLS)
   */
  async deletePost(postId: string): Promise<void> {
    const { error } = await this.supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
  }
}