import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth';


export interface UserProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface UserProfileStats {
  totalGames: number;
  completedGames: number;
  totalPosts: number;
  totalTierlists: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private authService = inject(AuthService);

  private get supabase() {
    return this.authService.client;
  }

  /**
   * Obtiene el perfil de un usuario por su nombre de usuario (búsqueda insensible a mayúsculas)
   */
  async getProfileByUsername(username: string): Promise<UserProfileData | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .ilike('username', username.trim())
      .maybeSingle();

    if (error) throw error;
    return data as UserProfileData | null;
  }

  /**
   * Obtiene el perfil de un usuario por su ID de usuario
   */
  async getProfileById(userId: string): Promise<UserProfileData | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as UserProfileData | null;
  }

  /**
   * Crea o asegura el registro de perfil para un usuario autenticado
   */
  async ensureProfile(userId: string, username: string): Promise<UserProfileData> {
    const { data, error } = await this.supabase
      .from('profiles')
      .upsert({ id: userId, username: username.trim() })
      .select('*')
      .single();

    if (error) throw error;
    return data as UserProfileData;
  }

  /**
   * Obtiene las estadísticas públicas del usuario
   */
  async getProfileStats(userId: string): Promise<UserProfileStats> {
    const [gamesRes, completedRes, postsRes, tierlistsRes] = await Promise.all([
      this.supabase.from('user_games').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      this.supabase.from('user_games').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
      this.supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      this.supabase.from('tierlists').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    ]);

    return {
      totalGames: gamesRes.count || 0,
      completedGames: completedRes.count || 0,
      totalPosts: postsRes.count || 0,
      totalTierlists: tierlistsRes.count || 0
    };
  }

  /**
   * Subida de imagen de avatar a Supabase Storage y retorno de URL pública
   */
  async uploadAvatar(file: File, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await this.supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = this.supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  }

  /**
   * Actualiza los datos del perfil en la tabla profiles
   */
  async updateProfile(userId: string, updates: Partial<UserProfileData>): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
  }
}