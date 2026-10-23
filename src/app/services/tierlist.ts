import { Injectable, inject } from '@angular/core';

import { Tierlist } from '../models/tierlist.model';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class TierlistsService {
  private authService = inject(AuthService);

  private get supabase() {
    return this.authService.client;
  }

  /**
   * Guarda una nueva Tierlist en Supabase
   */
  async createTierlist(tierlistData: Omit<Tierlist, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Tierlist> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('Debes iniciar sesión para guardar tu Tierlist');

    const payload = {
      user_id: user.id,
      title: tierlistData.title,
      description: tierlistData.description,
      is_public: tierlistData.is_public,
      rows_data: tierlistData.rows_data
    };

    const { data, error } = await this.supabase
      .from('tierlists')
      .insert(payload)
      .select('*, profiles:user_id (username, avatar_url)')
      .single();

    if (error) throw error;
    return data as Tierlist;
  }

  /**
   * Obtiene una Tierlist por su ID único
   */
  async getTierlistById(id: string): Promise<Tierlist> {
    const { data, error } = await this.supabase
      .from('tierlists')
      .select('*, profiles:user_id (username, avatar_url)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Tierlist;
  }

  /**
   * Actualiza una Tierlist existente
   */
  async updateTierlist(id: string, tierlistData: Partial<Tierlist>): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await this.supabase
      .from('tierlists')
      .update({
        title: tierlistData.title,
        description: tierlistData.description,
        is_public: tierlistData.is_public,
        rows_data: tierlistData.rows_data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Obtiene las Tierlists públicas o del usuario actual
   */
  async getPublicTierlists(): Promise<Tierlist[]> {
    const { data, error } = await this.supabase
      .from('tierlists')
      .select('*, profiles:user_id (username, avatar_url)')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Tierlist[];
  }
}