import { Injectable, inject } from '@angular/core';

import { UserGame, GameStatus } from '../models/user-game.model';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class UserGamesService {
  private authService = inject(AuthService);

  private get supabase() {
    return this.authService.client;
  }

  /**
   * Obtiene la biblioteca de juegos de un usuario (o del usuario autenticado si no se especifica ID)
   */
  async getUserLibrary(userId?: string): Promise<UserGame[]> {
    const targetUserId = userId || this.authService.currentUser()?.id;
    if (!targetUserId) throw new Error('Usuario no autenticado');

    const { data, error } = await this.supabase
      .from('user_games')
      .select('*')
      .eq('user_id', targetUserId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data as UserGame[];
  }

  /**
   * Consulta si un videojuego específico ya está en la biblioteca del usuario actual
   */
  async getGameStatusForUser(gameId: number): Promise<UserGame | null> {
    const user = this.authService.currentUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('user_games')
      .select('*')
      .eq('user_id', user.id)
      .eq('game_id', gameId)
      .maybeSingle();

    if (error) throw error;
    return data as UserGame | null;
  }

  /**
   * Agrega o actualiza un videojuego en la biblioteca del usuario (Upsert por user_id + game_id)
   */
  async addOrUpdateGame(gameData: Omit<UserGame, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<UserGame> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('Debes iniciar sesión para realizar esta acción');

    const payload = {
      user_id: user.id,
      game_id: gameData.game_id,
      game_title: gameData.game_title,
      game_cover: gameData.game_cover,
      status: gameData.status,
      user_rating: gameData.user_rating ?? null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('user_games')
      .upsert(payload, { onConflict: 'user_id,game_id' })
      .select()
      .single();

    if (error) throw error;
    return data as UserGame;
  }

  /**
   * Modifica únicamente el estado del juego (ej: pasar de 'plan_to_play' a 'playing')
   */
  async updateStatus(gameId: number, status: GameStatus): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await this.supabase
      .from('user_games')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('game_id', gameId);

    if (error) throw error;
  }

  /**
   * Modifica la puntuación personal asignada al juego (1 al 10)
   */
  async updateRating(gameId: number, rating: number | null): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await this.supabase
      .from('user_games')
      .update({ user_rating: rating, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('game_id', gameId);

    if (error) throw error;
  }

  /**
   * Elimina un juego de la biblioteca del usuario
   */
  async removeGame(gameId: number): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await this.supabase
      .from('user_games')
      .delete()
      .eq('user_id', user.id)
      .eq('game_id', gameId);

    if (error) throw error;
  }
}