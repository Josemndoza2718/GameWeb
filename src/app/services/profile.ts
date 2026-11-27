import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { AuthService } from './auth';
import { UserGame } from '../models/user-game.model';

export interface LinkedAccountEntry {
  handle: string;
  connected: boolean;
  updatedAt?: string;
}

export interface UserPreferences {
  profileVisibility: 'public' | 'accredited' | 'private';
  acceptTierChallenges: boolean;
  boxartMode: 'retro_hd' | 'original_1to1';
  interfaceLanguage: string;
  showAdultContent: boolean;
  linkedAccounts?: Record<string, LinkedAccountEntry>;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  profileVisibility: 'public',
  acceptTierChallenges: true,
  boxartMode: 'retro_hd',
  interfaceLanguage: 'es_es',
  showAdultContent: false
};

export interface UserProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  onboarding_completed_at?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
  pronouns?: string | null;
  timezone?: string | null;
  featured_badge?: boolean;
  preferences?: UserPreferences | null;
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

  /** Perfil del usuario autenticado (compartido entre Mi Perfil y Mi Biblioteca) */
  currentUserProfile = signal<UserProfileData | null>(null);

  /** Preferencias reactivas del usuario activo (inicializadas desde localStorage) */
  preferences = signal<UserPreferences>(this.readPreferencesFromStorage());
  showAdultContent = computed(() => this.preferences().showAdultContent);
  boxartMode = computed(() => this.preferences().boxartMode);
  interfaceLanguage = computed(() => this.preferences().interfaceLanguage);
  profileVisibility = computed(() => this.preferences().profileVisibility);
  acceptTierChallenges = computed(() => this.preferences().acceptTierChallenges);

  statusLabels = computed<Record<string, string>>(() => {
    const lang = this.interfaceLanguage();
    if (lang === 'en_us') {
      return {
        playing: 'Playing',
        completed: 'Completed',
        plan_to_play: 'Backlog',
        on_hold: 'On Hold',
        dropped: 'Dropped'
      };
    }
    if (lang === 'ja_jp') {
      return {
        playing: 'プレイ中',
        completed: 'クリア済み',
        plan_to_play: '積みゲー',
        on_hold: '保留中',
        dropped: '中断'
      };
    }
    if (lang === 'es_latam') {
      return {
        playing: 'Jugando',
        completed: 'Completado',
        plan_to_play: 'Pendiente',
        on_hold: 'En Pausa',
        dropped: 'Abandonado'
      };
    }
    return {
      playing: 'Jugando',
      completed: 'Completado',
      plan_to_play: 'Backlog',
      on_hold: 'En Espera',
      dropped: 'Abandonado'
    };
  });

  private lastLoadedUserId: string | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (!user) {
        this.lastLoadedUserId = null;
        this.currentUserProfile.set(null);
        this.preferences.set({ ...DEFAULT_USER_PREFERENCES });
        return;
      }
      if (this.lastLoadedUserId === user.id) return;
      this.lastLoadedUserId = user.id;

      // Hidratación inmediata desde localStorage y sincronización desde Supabase
      const localPrefs = this.readPreferencesFromStorage(user.id);
      this.preferences.set(localPrefs);
      void this.hydrateUserProfileFromCloud(user.id, localPrefs);
    });
  }

  private async hydrateUserProfileFromCloud(userId: string, localPrefs: UserPreferences): Promise<void> {
    try {
      const profile = await this.getProfileById(userId);
      const localPersonal = this.readPersonalFallback(userId);
      if (profile) {
        const resolvedAvatar = profile.avatar_url || localPersonal.avatar_url || null;
        this.currentUserProfile.set({ ...profile, avatar_url: resolvedAvatar });
        if (profile.preferences) {
          const merged = { ...DEFAULT_USER_PREFERENCES, ...localPrefs, ...profile.preferences };
          this.syncLocalPreferences(merged, userId);
        }
      }
    } catch {
      // Silencioso: se mantiene localStorage si falla la red
    }
  }

  /**
   * Fórmula única de XP, Nivel y Rango compartida entre Mi Biblioteca y Mi Perfil
   */
  computeProgression(games: UserGame[], statsFallback?: UserProfileStats | null): {
    totalXp: number;
    level: number;
    xpInLevel: number;
    xpMax: number;
    xpPercent: number;
    rankTitle: string;
    nextRankTitle: string;
  } {
    let xp = 0;
    if (games.length > 0) {
      for (const g of games) {
        xp += 100;
        if (g.status === 'completed') xp += 400;
        if (g.status === 'playing') xp += 150;
        if (g.user_rating) xp += 50;
      }
    } else if (statsFallback && statsFallback.totalGames > 0) {
      xp = statsFallback.totalGames * 100 + statsFallback.completedGames * 400;
    }

    const xpMax = 1000;
    const level = Math.floor(xp / xpMax) + 1;
    const xpInLevel = xp % xpMax;
    const xpPercent = Math.min(100, Math.round((xpInLevel / xpMax) * 100));

    const getRank = (lvl: number): string => {
      if (lvl <= 5) return 'Novice Collector';
      if (lvl <= 15) return 'Archive Seeker';
      if (lvl <= 30) return 'Retro Vanguard';
      if (lvl <= 50) return 'Chrono Archivist';
      return 'Archivist Prime';
    };

    return {
      totalXp: xp,
      level,
      xpInLevel,
      xpMax,
      xpPercent,
      rankTitle: getRank(level),
      nextRankTitle: getRank(level + 1)
    };
  }

  private get supabase() {
    return this.authService.client;
  }

  private prefsStorageKey(userId?: string): string {
    const id = userId || this.authService.currentUser()?.id || 'guest';
    return `questlog_prefs_${id}`;
  }

  private personalStorageKey(userId: string): string {
    return `questlog_personal_${userId}`;
  }

  readPreferencesFromStorage(userId?: string): UserPreferences {
    if (typeof window === 'undefined') return { ...DEFAULT_USER_PREFERENCES };
    try {
      const raw = localStorage.getItem(this.prefsStorageKey(userId));
      if (!raw) return { ...DEFAULT_USER_PREFERENCES };
      return { ...DEFAULT_USER_PREFERENCES, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_USER_PREFERENCES };
    }
  }

  syncLocalPreferences(prefs: UserPreferences, userId?: string): void {
    const merged = { ...DEFAULT_USER_PREFERENCES, ...prefs };
    this.preferences.set(merged);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.prefsStorageKey(userId), JSON.stringify(merged));
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }

  readPersonalFallback(userId: string): Partial<UserProfileData> {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(this.personalStorageKey(userId));
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private writePersonalFallback(userId: string, data: Partial<UserProfileData>): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.personalStorageKey(userId), JSON.stringify(data));
    } catch {
      // Ignorar
    }
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

    // Verificar que el bucket sea público y accesible; si devuelve 400/403/404, lanzar error para usar respaldo
    try {
      const check = await fetch(data.publicUrl, { method: 'HEAD' });
      if (!check.ok) {
        throw new Error(`El bucket "avatars" no es público (HTTP ${check.status}).`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('bucket')) throw err;
    }

    return data.publicUrl;
  }

  /**
   * Actualiza los datos del perfil en la tabla profiles (con fallback local si faltan columnas extendidas)
   */
  async updateProfile(userId: string, updates: Partial<UserProfileData>): Promise<{ extendedSynced: boolean }> {
    const existingLocal = this.readPersonalFallback(userId);
    this.writePersonalFallback(userId, { ...existingLocal, ...updates });

    const currentCached = this.currentUserProfile();
    if (currentCached && currentCached.id === userId) {
      this.currentUserProfile.set({ ...currentCached, ...updates });
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('id')
      .maybeSingle();

    if (!error) {
      if (!data) {
        throw new Error('No se encontró tu fila en "profiles" o las políticas RLS impidieron actualizarla.');
      }
      return { extendedSynced: true };
    }

    // Si falla por columna inexistente en Supabase (42703 / PGRST204), guardar al menos bio y avatar_url
    const errCode = (error as { code?: string }).code;
    if (errCode === '42703' || errCode === 'PGRST204') {
      const baseUpdates: Partial<UserProfileData> = {};
      if ('bio' in updates) baseUpdates.bio = updates.bio;
      if ('avatar_url' in updates) baseUpdates.avatar_url = updates.avatar_url;

      if (Object.keys(baseUpdates).length > 0) {
        const { data: baseData, error: baseErr } = await this.supabase
          .from('profiles')
          .update(baseUpdates)
          .eq('id', userId)
          .select('id')
          .maybeSingle();
        if (baseErr) throw baseErr;
        if (!baseData) {
          throw new Error('No se encontró tu fila en "profiles" o las políticas RLS impidieron actualizarla.');
        }
      }
      return { extendedSynced: false };
    }

    throw error;
  }

  /**
   * Guarda las preferencias del usuario en localStorage y en Supabase (`profiles.preferences`)
   */
  async savePreferences(userId: string, prefs: UserPreferences): Promise<{ syncedToCloud: boolean }> {
    this.syncLocalPreferences(prefs, userId);

    const { error } = await this.supabase
      .from('profiles')
      .update({ preferences: prefs })
      .eq('id', userId);

    if (!error) return { syncedToCloud: true };

    const errCode = (error as { code?: string }).code;
    if (errCode === '42703' || errCode === 'PGRST204') {
      return { syncedToCloud: false };
    }

    throw error;
  }
}