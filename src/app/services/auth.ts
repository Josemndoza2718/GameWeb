import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../env/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;

  // Estado reactivo del usuario usando Angular Signals
  currentUser = signal<User | null>(null);

  // Promesa de resolución de sesión inicial para evitar falsos negativos en Guards
  private initialSessionPromise: Promise<User | null>;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    // Inicializar sesión actual y almacenar la promesa
    this.initialSessionPromise = this.supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user ?? null;
      this.currentUser.set(user);
      return user;
    });

    // Escuchar cambios de estado en la autenticación (Login, Logout, etc.)
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUser.set(session?.user ?? null);
    });
  }

  /**
   * Indica si el usuario recién completó o tiene pendiente su onboarding
   */
  hasCompletedOnboarding(userId?: string): boolean {
    if (typeof window === 'undefined') return true;
    const id = userId || this.currentUser()?.id;
    if (!id) return false;
    return localStorage.getItem(`questlog_onboarded_${id}`) === 'true';
  }

  setOnboardingCompleted(userId?: string): void {
    if (typeof window === 'undefined') return;
    const id = userId || this.currentUser()?.id;
    if (id) {
      localStorage.setItem(`questlog_onboarded_${id}`, 'true');
    }
  }

  /**
   * Garantiza que la sesión se haya evaluado antes de responder (evita redirecciones erróneas en recargas)
   */
  async ensureAuthenticated(): Promise<boolean> {
    if (this.currentUser()) {
      return true;
    }
    const user = await this.initialSessionPromise;
    return !!user;
  }

  // Registro con Correo, Contraseña y Nombre de usuario
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username } // Se envía a la tabla profiles mediante el Trigger SQL
      }
    });
    if (error) throw error;
    return data;
  }

  // Iniciar Sesión con Correo y Contraseña
  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  // Iniciar Sesión con Proveedores Sociales (p. ej. Google o Discord)
  async signInWithProvider(provider: 'google' | 'discord') {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  }

  // Cerrar Sesión
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
    this.currentUser.set(null);
  }

  // Obtener el cliente de Supabase para consultas directas a la BD
  get client(): SupabaseClient {
    return this.supabase;
  }
}