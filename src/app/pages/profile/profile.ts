import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

// PrimeNG
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

// Servicios y Modelos
import { UserGame } from '../../models/user-game.model';
import { Post } from '../../models/post.model';
import { Tierlist } from '../../models/tierlist.model';
import { UserGamesService } from '../../services/user-games';
import { PostsService } from '../../services/posts';
import { TierlistsService } from '../../services/tierlist';
import { AuthService } from '../../services/auth';
import { ProfileService, UserProfileData, UserProfileStats, UserPreferences, DEFAULT_USER_PREFERENCES, LinkedAccountEntry } from '../../services/profile';

export type ProfileTab = 'personal' | 'security' | 'preferences' | 'connections' | 'collection';

export interface EcosystemAccount {
  id: string;
  name: string;
  placeholder: string;
  handle: string;
  icon: string;
  bgClass: string;
  connected: boolean;
  updatedAt?: string;
}

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ToastModule,
    ProgressSpinnerModule
  ],
  providers: [MessageService],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  public profileService = inject(ProfileService);
  private userGamesService = inject(UserGamesService);
  private postsService = inject(PostsService);
  private tierlistsService = inject(TierlistsService);
  public authService = inject(AuthService);
  public messageService = inject(MessageService);

  // Estados principales de carga y datos
  profile = signal<UserProfileData | null>(null);
  stats = signal<UserProfileStats | null>(null);
  userGames = signal<UserGame[]>([]);
  userPosts = signal<Post[]>([]);
  userTierlists = signal<Tierlist[]>([]);

  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  activeTab = signal<ProfileTab>('personal');

  // Pestaña activa y filtros en la colección pública
  collectionSubTab = signal<'library' | 'posts' | 'tierlists'>('library');
  vaultSearch = signal<string>('');
  vaultStatusFilter = signal<string>('all');

  filteredVaultGames = computed(() => {
    const query = this.vaultSearch().trim().toLowerCase();
    const status = this.vaultStatusFilter();
    return this.userGames().filter(g => {
      const matchesStatus = status === 'all' || g.status === status;
      const matchesQuery = !query || g.game_title.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  });

  vaultStatusCounts = computed(() => {
    const games = this.userGames();
    const counts: Record<string, number> = { all: games.length };
    for (const g of games) {
      counts[g.status] = (counts[g.status] || 0) + 1;
    }
    return counts;
  });

  // Formulario: Información Personal & Perfil
  fullName = signal<string>('');
  userEmail = signal<string>('');
  phoneNumber = signal<string>('');
  pronouns = signal<string>('No especificar');
  timezone = signal<string>('Europa / Madrid (UTC+01:00)');
  featuredBadge = signal<boolean>(true);
  bio = signal<string>('');
  avatarPreview = signal<string | null>(null);
  selectedAvatarFile = signal<File | null>(null);
  private savedPersonalSnapshot = signal<{
    fullName: string;
    phoneNumber: string;
    pronouns: string;
    timezone: string;
    featuredBadge: boolean;
    bio: string;
  } | null>(null);

  // Formulario: Seguridad & Contraseña
  currentPassword = signal<string>('');
  newPassword = signal<string>('');
  confirmNewPassword = signal<string>('');
  showCurrentPassword = signal<boolean>(false);
  showNewPassword = signal<boolean>(false);
  sendingRecovery = signal<boolean>(false);

  // Estado real de 2FA (Supabase MFA TOTP)
  mfaLoading = signal<boolean>(false);
  mfaFactorId = signal<string | null>(null);
  twoFactorActive = computed(() => !!this.mfaFactorId());
  mfaEnrollData = signal<{ factorId: string; qrCode: string; secret: string } | null>(null);
  mfaVerifyCode = signal<string>('');

  // Sesión actual real + revocación remota vía Supabase Auth
  currentSessionInfo = computed(() => {
    const user = this.authService.currentUser();
    const device = this.detectCurrentDevice();
    const lastSignIn = user?.last_sign_in_at
      ? new Date(user.last_sign_in_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Sesión activa';
    return {
      device,
      detail: `Último acceso: ${lastSignIn}`,
      icon: /Mobi|Android|iPhone|iPad/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')
        ? 'smartphone'
        : 'laptop_mac'
    };
  });
  revokingOthers = signal<boolean>(false);
  isEmailAuthUser = computed(() => {
    const user = this.authService.currentUser();
    const providers = (user?.app_metadata?.['providers'] as string[] | undefined) || [];
    const provider = user?.app_metadata?.['provider'] as string | undefined;
    return provider === 'email' || providers.includes('email');
  });

  // Formulario: Preferencias de Plataforma & Archivo
  profileVisibility = signal<'public' | 'accredited' | 'private'>('public');
  acceptTierChallenges = signal<boolean>(true);
  boxartMode = signal<'retro_hd' | 'original_1to1'>('retro_hd');
  interfaceLanguage = signal<string>('es_es');
  showAdultContent = signal<boolean>(false);
  lastSavedAt = signal<string | null>(null);

  // Cuentas de Ecosistemas Vinculadas (persistidas en preferences.linkedAccounts)
  private readonly defaultEcosystems: Omit<EcosystemAccount, 'handle' | 'connected' | 'updatedAt'>[] = [
    { id: 'steam', name: 'Steam', placeholder: 'Steam ID o URL personalizada', icon: 'terminal', bgClass: 'steam-bg' },
    { id: 'psn', name: 'PlayStation Network', placeholder: 'PSN Online ID', icon: 'gamepad', bgClass: 'psn-bg' },
    { id: 'xbox', name: 'Xbox Live', placeholder: 'Gamertag de Xbox', icon: 'videogame_asset', bgClass: 'xbox-bg' },
    { id: 'switch', name: 'Nintendo Switch', placeholder: 'Código de amigo (SW-...)', icon: 'sports_esports', bgClass: 'switch-bg' },
    { id: 'retroachievements', name: 'RetroAchievements', placeholder: 'Usuario en RetroAchievements', icon: 'emoji_events', bgClass: 'steam-bg' }
  ];

  ecosystems = signal<EcosystemAccount[]>(
    this.defaultEcosystems.map(e => ({ ...e, handle: '', connected: false }))
  );
  editingEcosystemId = signal<string | null>(null);
  ecosystemHandleDraft = signal<string>('');
  savingConnection = signal<boolean>(false);

  oauthIdentities = computed(() => {
    const identities = this.authService.currentUser()?.identities || [];
    const linkedProviders = new Set(identities.map(i => i.provider));
    return [
      { id: 'google' as const, name: 'Google', icon: 'account_circle', connected: linkedProviders.has('google') },
      { id: 'discord' as const, name: 'Discord', icon: 'forum', connected: linkedProviders.has('discord') }
    ];
  });

  // Eliminamos activeSessions hardcoded; usamos currentSessionInfo + signOut({ scope: 'others' })

  // Comprueba si el perfil corresponde al usuario autenticado
  isOwnProfile = computed(() => {
    const currentUser = this.authService.currentUser();
    return !!currentUser && this.profile()?.id === currentUser.id;
  });

  viewerLevel = signal<number>(1);

  vaultRestrictionReason = computed<'private' | 'accredited' | null>(() => {
    if (this.isOwnProfile()) return null;
    const vis = this.profile()?.preferences?.profileVisibility || 'public';
    if (vis === 'private') return 'private';
    if (vis === 'accredited') {
      const currentUser = this.authService.currentUser();
      if (!currentUser || this.viewerLevel() < 20) return 'accredited';
    }
    return null;
  });

  canViewVault = computed(() => this.vaultRestrictionReason() === null);

  isEmailVerified = computed(() => !!this.authService.currentUser()?.email_confirmed_at);

  phoneError = computed(() => {
    const cleaned = this.phoneNumber().replace(/[\s()-]/g, '');
    if (!cleaned) return null;
    return /^\+[1-9]\d{6,14}$/.test(cleaned)
      ? null
      : 'Usa formato internacional E.164 (ej. +34 600 000 000).';
  });

  hasPersonalChanges = computed(() => {
    const snap = this.savedPersonalSnapshot();
    if (!snap) return false;
    return (
      this.fullName() !== snap.fullName ||
      this.phoneNumber() !== snap.phoneNumber ||
      this.pronouns() !== snap.pronouns ||
      this.timezone() !== snap.timezone ||
      this.featuredBadge() !== snap.featuredBadge ||
      this.bio() !== snap.bio ||
      !!this.selectedAvatarFile()
    );
  });

  // Progresión real unificada con Mi Biblioteca (ProfileService.computeProgression)
  private progression = computed(() => this.profileService.computeProgression(this.userGames(), this.stats()));

  totalXp = computed(() => this.progression().totalXp);
  userLevel = computed(() => this.progression().level);
  xpInCurrentLevel = computed(() => this.progression().xpInLevel);
  xpMaxLevel = computed(() => this.progression().xpMax);
  xpProgressPercent = computed(() => this.progression().xpPercent);
  nextRankTitle = computed(() => this.progression().rankTitle);

  completionRate = computed(() => {
    const s = this.stats();
    if (!s || s.totalGames === 0) return 0;
    return Math.round((s.completedGames / s.totalGames) * 1000) / 10;
  });

  // Métricas reactivas de robustez de contraseña
  pwdHasLength = computed(() => this.newPassword().length >= 12);
  pwdHasUpper = computed(() => /[A-Z]/.test(this.newPassword()));
  pwdHasSymbols = computed(() => /[^A-Za-z0-9]/.test(this.newPassword()));
  pwdHasNumbers = computed(() => /[0-9]/.test(this.newPassword()));

  pwdScore = computed(() => {
    let score = 0;
    if (this.pwdHasLength()) score++;
    if (this.pwdHasUpper()) score++;
    if (this.pwdHasSymbols()) score++;
    if (this.pwdHasNumbers()) score++;
    return score;
  });

  pwdScoreLabel = computed(() => {
    const score = this.pwdScore();
    if (score === 4) return 'Excelente (4/4 Parámetros)';
    if (score === 3) return 'Buena (3/4 Parámetros)';
    if (score === 2) return 'Media (2/4 Parámetros)';
    return 'Baja (1/4 Parámetros)';
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const username = params.get('username');
      if (username) {
        this.loadProfileData(username);
      }
    });
  }

  async loadProfileData(username: string): Promise<void> {
    this.loading.set(true);
    try {
      await this.authService.ensureAuthenticated();
      const currentUser = this.authService.currentUser();
      let data = await this.profileService.getProfileByUsername(username);

      if (!data && currentUser) {
        try {
          const profileById = await this.profileService.getProfileById(currentUser.id);
          if (profileById) data = profileById;
        } catch {
          // Ignorar error de búsqueda por id
        }
      }

      if (!data && currentUser) {
        const myUsername = currentUser.user_metadata?.['username'] || currentUser.email?.split('@')[0] || username;
        if (myUsername.toLowerCase() === username.toLowerCase() || username === 'me') {
          try {
            data = await this.profileService.ensureProfile(currentUser.id, myUsername);
          } catch {
            data = {
              id: currentUser.id,
              username: myUsername,
              avatar_url: null,
              bio: null,
              created_at: new Date().toISOString()
            };
          }
        }
      }

      this.profile.set(data);

      if (data) {
        const localPersonal = this.profileService.readPersonalFallback(data.id);
        this.bio.set(data.bio ?? localPersonal.bio ?? '');
        this.fullName.set(data.full_name ?? localPersonal.full_name ?? '');
        this.phoneNumber.set(data.phone_number ?? localPersonal.phone_number ?? '');
        this.pronouns.set(data.pronouns ?? localPersonal.pronouns ?? 'No especificar');
        this.timezone.set(data.timezone ?? localPersonal.timezone ?? 'Europa / Madrid (UTC+01:00)');
        this.featuredBadge.set(data.featured_badge ?? localPersonal.featured_badge ?? true);
        this.capturePersonalSnapshot();
        const resolvedAvatar = data.avatar_url || localPersonal.avatar_url || null;
        this.avatarPreview.set(resolvedAvatar);
        if (resolvedAvatar && !data.avatar_url) {
          this.profile.set({ ...data, avatar_url: resolvedAvatar });
        }
        this.userEmail.set(
          currentUser && data.id === currentUser.id
            ? (currentUser.email || '')
            : ''
        );

        const prefs: UserPreferences = {
          ...DEFAULT_USER_PREFERENCES,
          ...this.profileService.readPreferencesFromStorage(data.id),
          ...(data.preferences || {})
        };
        this.profileVisibility.set(prefs.profileVisibility);
        this.acceptTierChallenges.set(prefs.acceptTierChallenges);
        this.boxartMode.set(prefs.boxartMode);
        this.interfaceLanguage.set(prefs.interfaceLanguage);
        this.showAdultContent.set(prefs.showAdultContent);
        this.hydrateEcosystems(prefs.linkedAccounts);
        if (currentUser && data.id === currentUser.id) {
          this.profileService.syncLocalPreferences(prefs, data.id);
        }

        // Si no es el perfil propio, verificar nivel del visitante si la bóveda es solo para acreditados
        if (currentUser && data.id !== currentUser.id) {
          this.activeTab.set('collection');
          if (data.preferences?.profileVisibility === 'accredited') {
            try {
              const vs = await this.profileService.getProfileStats(currentUser.id);
              const vXp = vs.totalGames * 50 + vs.completedGames * 100 + vs.totalTierlists * 150 + vs.totalPosts * 75;
              this.viewerLevel.set(Math.floor(vXp / 500) + 1);
            } catch {
              this.viewerLevel.set(1);
            }
          }
        } else if (currentUser && data.id === currentUser.id) {
          void this.loadMfaStatus();
        }

        if (data.id) {
          const statsData = await this.profileService.getProfileStats(data.id);
          this.stats.set(statsData);

          if (this.canViewVault()) {
            const [gamesData, postsData, tierlistsData] = await Promise.all([
              this.userGamesService.getUserLibrary(data.id),
              this.postsService.getPosts('all'),
              this.tierlistsService.getPublicTierlists()
            ]);

            this.userGames.set(gamesData);
            this.userPosts.set(postsData.filter(p => p.user_id === data.id));
            this.userTierlists.set(tierlistsData.filter(t => t.user_id === data.id));
          } else {
            this.userGames.set([]);
            this.userPosts.set([]);
            this.userTierlists.set([]);
          }
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al cargar perfil';
      this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      this.loading.set(false);
    }
  }

  setActiveTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }

  setCollectionSubTab(subTab: 'library' | 'posts' | 'tierlists'): void {
    this.collectionSubTab.set(subTab);
  }

  async onAvatarFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    this.selectedAvatarFile.set(file);

    const reader = new FileReader();
    reader.onload = (e) => this.avatarPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    // Guardar automáticamente la foto apenas se selecciona para evitar perderla al recargar
    const current = this.profile();
    if (!current || !this.isOwnProfile()) return;

    this.saving.set(true);
    try {
      let avatarUrl: string;
      let usedFallback = false;

      try {
        avatarUrl = await this.profileService.uploadAvatar(file, current.id);
      } catch (storageErr) {
        console.warn('Supabase Storage avatars falló, usando respaldo comprimido:', storageErr);
        avatarUrl = await this.compressImageToDataUrl(file, 256, 0.8);
        usedFallback = true;
      }

      await this.profileService.updateProfile(current.id, { avatar_url: avatarUrl });
      this.profile.set({ ...current, avatar_url: avatarUrl });
      this.avatarPreview.set(avatarUrl);
      this.selectedAvatarFile.set(null);
      this.lastSavedAt.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      this.messageService.add({
        severity: usedFallback ? 'warn' : 'success',
        summary: 'Foto de Perfil Actualizada',
        detail: usedFallback
          ? 'Guardada en tu perfil (el bucket "avatars" de Storage no respondió; se usó formato compacto).'
          : 'Tu nueva foto se subió y guardó en Supabase.'
      });
    } catch (error: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al guardar foto',
        detail: this.extractErrorMessage(error)
      });
    } finally {
      this.saving.set(false);
      input.value = '';
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return 'Error inesperado al guardar en Supabase';
  }

  private compressImageToDataUrl(file: File, maxSize: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo procesar la imagen'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo leer la imagen seleccionada'));
      };
      img.src = url;
    });
  }

  private capturePersonalSnapshot(): void {
    this.savedPersonalSnapshot.set({
      fullName: this.fullName(),
      phoneNumber: this.phoneNumber(),
      pronouns: this.pronouns(),
      timezone: this.timezone(),
      featuredBadge: this.featuredBadge(),
      bio: this.bio()
    });
  }

  discardPersonalChanges(): void {
    const snap = this.savedPersonalSnapshot();
    if (!snap) return;
    this.fullName.set(snap.fullName);
    this.phoneNumber.set(snap.phoneNumber);
    this.pronouns.set(snap.pronouns);
    this.timezone.set(snap.timezone);
    this.featuredBadge.set(snap.featuredBadge);
    this.bio.set(snap.bio);
    this.selectedAvatarFile.set(null);
    this.avatarPreview.set(this.profile()?.avatar_url || null);
    this.messageService.add({
      severity: 'info',
      summary: 'Cambios Descartados',
      detail: 'Se restauraron los últimos datos guardados.'
    });
  }

  async savePersonalInfo(): Promise<void> {
    const current = this.profile();
    if (!current || !this.isOwnProfile()) return;

    if (this.phoneError()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Teléfono inválido',
        detail: this.phoneError()!
      });
      return;
    }

    const trimmedName = this.fullName().trim();
    const trimmedPhone = this.phoneNumber().trim();
    const trimmedBio = this.bio().trim();
    this.fullName.set(trimmedName);
    this.phoneNumber.set(trimmedPhone);
    this.bio.set(trimmedBio);

    this.saving.set(true);
    try {
      let avatarUrl = current.avatar_url;

      if (this.selectedAvatarFile()) {
        try {
          avatarUrl = await this.profileService.uploadAvatar(this.selectedAvatarFile()!, current.id);
        } catch {
          avatarUrl = await this.compressImageToDataUrl(this.selectedAvatarFile()!, 256, 0.8);
        }
        this.selectedAvatarFile.set(null);
      }

      const updates: Partial<UserProfileData> = {
        bio: trimmedBio,
        avatar_url: avatarUrl,
        full_name: trimmedName,
        phone_number: trimmedPhone,
        pronouns: this.pronouns(),
        timezone: this.timezone(),
        featured_badge: this.featuredBadge()
      };

      const { extendedSynced } = await this.profileService.updateProfile(current.id, updates);

      this.profile.set({
        ...current,
        ...updates
      });
      this.capturePersonalSnapshot();
      this.lastSavedAt.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      this.messageService.add({
        severity: 'success',
        summary: 'Bóveda Actualizada',
        detail: extendedSynced
          ? 'Tu información personal ha sido sincronizada con Supabase.'
          : 'Biografía/avatar guardados en Supabase; campos extendidos guardados localmente (falta migración SQL).'
      });
    } catch (error: unknown) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: this.extractErrorMessage(error) });
    } finally {
      this.saving.set(false);
    }
  }

  async updatePassword(): Promise<void> {
    if (!this.newPassword()) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Ingresa una nueva contraseña.' });
      return;
    }

    if (this.newPassword().length < 8) {
      this.messageService.add({ severity: 'warn', summary: 'Contraseña débil', detail: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }

    if (this.newPassword() !== this.confirmNewPassword()) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Las contraseñas no coinciden.' });
      return;
    }

    const email = this.authService.currentUser()?.email;
    if (this.isEmailAuthUser() && email) {
      if (!this.currentPassword()) {
        this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Ingresa tu contraseña actual para confirmar el cambio.' });
        return;
      }
    }

    this.saving.set(true);
    try {
      if (this.isEmailAuthUser() && email) {
        const { error: verifyError } = await this.authService.client.auth.signInWithPassword({
          email,
          password: this.currentPassword()
        });
        if (verifyError) {
          throw new Error('La contraseña actual es incorrecta.');
        }
      }

      const { error } = await this.authService.client.auth.updateUser({
        password: this.newPassword()
      });
      if (error) throw error;

      this.messageService.add({
        severity: 'success',
        summary: 'Contraseña Actualizada',
        detail: 'Tu contraseña se actualizó correctamente en Supabase Auth.'
      });
      this.currentPassword.set('');
      this.newPassword.set('');
      this.confirmNewPassword.set('');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'No se pudo actualizar la contraseña';
      this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      this.saving.set(false);
    }
  }

  async sendPasswordRecoveryEmail(): Promise<void> {
    const email = this.authService.currentUser()?.email || this.userEmail();
    if (!email) {
      this.messageService.add({ severity: 'warn', summary: 'Sin correo', detail: 'No hay un correo asociado a esta cuenta.' });
      return;
    }

    this.sendingRecovery.set(true);
    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth` : undefined;
      const { error } = await this.authService.client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      this.messageService.add({
        severity: 'success',
        summary: 'Enlace Enviado',
        detail: `Se envió un correo de recuperación a ${email}.`
      });
    } catch (error: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al enviar enlace',
        detail: this.extractErrorMessage(error)
      });
    } finally {
      this.sendingRecovery.set(false);
    }
  }

  async loadMfaStatus(): Promise<void> {
    try {
      const { data, error } = await this.authService.client.auth.mfa.listFactors();
      if (error) return;
      const verifiedTotp = data?.totp?.find(f => f.status === 'verified');
      this.mfaFactorId.set(verifiedTotp ? verifiedTotp.id : null);
    } catch {
      // MFA no disponible o deshabilitado en el proyecto
    }
  }

  async startMfaEnroll(): Promise<void> {
    this.mfaLoading.set(true);
    try {
      const { data, error } = await this.authService.client.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'QuestLog Vault'
      });
      if (error) throw error;
      this.mfaEnrollData.set({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret
      });
      this.mfaVerifyCode.set('');
    } catch (error: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'No se pudo iniciar 2FA',
        detail: this.extractErrorMessage(error)
      });
    } finally {
      this.mfaLoading.set(false);
    }
  }

  async verifyMfaEnroll(): Promise<void> {
    const enroll = this.mfaEnrollData();
    const code = this.mfaVerifyCode().trim();
    if (!enroll || !/^\d{6}$/.test(code)) {
      this.messageService.add({ severity: 'warn', summary: 'Código inválido', detail: 'Ingresa el código de 6 dígitos de tu app autenticadora.' });
      return;
    }

    this.mfaLoading.set(true);
    try {
      const { error } = await this.authService.client.auth.mfa.challengeAndVerify({
        factorId: enroll.factorId,
        code
      });
      if (error) throw error;
      this.mfaFactorId.set(enroll.factorId);
      this.mfaEnrollData.set(null);
      this.mfaVerifyCode.set('');
      this.messageService.add({
        severity: 'success',
        summary: '2FA Activado',
        detail: 'El doble factor TOTP quedó vinculado a tu cuenta.'
      });
    } catch (error: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Verificación fallida',
        detail: this.extractErrorMessage(error)
      });
    } finally {
      this.mfaLoading.set(false);
    }
  }

  async cancelMfaEnroll(): Promise<void> {
    const enroll = this.mfaEnrollData();
    this.mfaEnrollData.set(null);
    this.mfaVerifyCode.set('');
    if (enroll) {
      try {
        await this.authService.client.auth.mfa.unenroll({ factorId: enroll.factorId });
      } catch {
        // Ignorar si ya fue limpiado
      }
    }
  }

  async disableMfa(): Promise<void> {
    const factorId = this.mfaFactorId();
    if (!factorId) return;
    this.mfaLoading.set(true);
    try {
      const { error } = await this.authService.client.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      this.mfaFactorId.set(null);
      this.messageService.add({
        severity: 'info',
        summary: '2FA Desactivado',
        detail: 'Se desvinculó el autenticador TOTP de tu bóveda.'
      });
    } catch (error: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al desactivar 2FA',
        detail: this.extractErrorMessage(error)
      });
    } finally {
      this.mfaLoading.set(false);
    }
  }

  private detectCurrentDevice(): string {
    if (typeof navigator === 'undefined') return 'Navegador Web';
    const ua = navigator.userAgent;
    const browser = ua.includes('Edg')
      ? 'Edge'
      : ua.includes('Chrome')
        ? 'Chrome'
        : ua.includes('Firefox')
          ? 'Firefox'
          : ua.includes('Safari')
            ? 'Safari'
            : 'Navegador';
    const os = ua.includes('Windows')
      ? 'Windows'
      : ua.includes('Mac')
        ? 'macOS'
        : ua.includes('Android')
          ? 'Android'
          : /iPhone|iPad/.test(ua)
            ? 'iOS'
            : ua.includes('Linux')
              ? 'Linux'
              : 'Sistema';
    return `${browser} en ${os}`;
  }

  async savePreferences(): Promise<void> {
    const userId = this.profile()?.id || this.authService.currentUser()?.id;
    const prefs: UserPreferences = {
      profileVisibility: this.profileVisibility(),
      acceptTierChallenges: this.acceptTierChallenges(),
      boxartMode: this.boxartMode(),
      interfaceLanguage: this.interfaceLanguage(),
      showAdultContent: this.showAdultContent(),
      linkedAccounts: this.buildLinkedAccountsMap()
    };

    if (!userId) {
      this.profileService.syncLocalPreferences(prefs);
      this.messageService.add({
        severity: 'success',
        summary: 'Preferencias Guardadas',
        detail: 'Preferencias actualizadas localmente.'
      });
      return;
    }

    this.saving.set(true);
    try {
      const { syncedToCloud } = await this.profileService.savePreferences(userId, prefs);
      this.lastSavedAt.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      this.messageService.add({
        severity: 'success',
        summary: 'Preferencias Guardadas',
        detail: syncedToCloud
          ? 'Tus preferencias (incluido filtro +18) se sincronizaron con Supabase.'
          : 'Preferencias guardadas en este navegador (falta columna preferences en Supabase).'
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al guardar preferencias';
      this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      this.saving.set(false);
    }
  }

  private hydrateEcosystems(linked?: Record<string, LinkedAccountEntry>): void {
    this.ecosystems.set(
      this.defaultEcosystems.map(base => {
        const saved = linked?.[base.id];
        return {
          ...base,
          handle: saved?.handle || '',
          connected: !!saved?.connected && !!saved?.handle,
          updatedAt: saved?.updatedAt
        };
      })
    );
  }

  private buildLinkedAccountsMap(): Record<string, LinkedAccountEntry> {
    const map: Record<string, LinkedAccountEntry> = {};
    for (const acc of this.ecosystems()) {
      if (acc.connected || acc.handle) {
        map[acc.id] = {
          handle: acc.handle,
          connected: acc.connected,
          updatedAt: acc.updatedAt
        };
      }
    }
    return map;
  }

  private async persistLinkedAccounts(): Promise<void> {
    const userId = this.profile()?.id || this.authService.currentUser()?.id;
    const prefs: UserPreferences = {
      ...this.profileService.preferences(),
      profileVisibility: this.profileVisibility(),
      acceptTierChallenges: this.acceptTierChallenges(),
      boxartMode: this.boxartMode(),
      interfaceLanguage: this.interfaceLanguage(),
      showAdultContent: this.showAdultContent(),
      linkedAccounts: this.buildLinkedAccountsMap()
    };

    if (!userId) {
      this.profileService.syncLocalPreferences(prefs);
      return;
    }

    await this.profileService.savePreferences(userId, prefs);
    this.lastSavedAt.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }

  startEditEcosystem(account: EcosystemAccount): void {
    this.editingEcosystemId.set(account.id);
    this.ecosystemHandleDraft.set(account.handle || '');
  }

  cancelEditEcosystem(): void {
    this.editingEcosystemId.set(null);
    this.ecosystemHandleDraft.set('');
  }

  async saveEcosystemConnection(account: EcosystemAccount): Promise<void> {
    const handle = this.ecosystemHandleDraft().trim();
    if (!handle) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Identificador requerido',
        detail: `Ingresa tu usuario o ID de ${account.name}.`
      });
      return;
    }

    this.savingConnection.set(true);
    try {
      this.ecosystems.update(items =>
        items.map(i =>
          i.id === account.id
            ? { ...i, handle, connected: true, updatedAt: new Date().toISOString() }
            : i
        )
      );
      await this.persistLinkedAccounts();
      this.editingEcosystemId.set(null);
      this.ecosystemHandleDraft.set('');
      this.messageService.add({
        severity: 'success',
        summary: `${account.name} Vinculado`,
        detail: `Identificador "${handle}" guardado en tu perfil.`
      });
    } catch (error: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al vincular',
        detail: this.extractErrorMessage(error)
      });
    } finally {
      this.savingConnection.set(false);
    }
  }

  async disconnectEcosystem(account: EcosystemAccount): Promise<void> {
    this.savingConnection.set(true);
    try {
      this.ecosystems.update(items =>
        items.map(i =>
          i.id === account.id
            ? { ...i, handle: '', connected: false, updatedAt: undefined }
            : i
        )
      );
      await this.persistLinkedAccounts();
      this.messageService.add({
        severity: 'info',
        summary: `${account.name} Desvinculado`,
        detail: 'Se eliminó la vinculación de tu perfil.'
      });
    } catch (error: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al desvincular',
        detail: this.extractErrorMessage(error)
      });
    } finally {
      this.savingConnection.set(false);
    }
  }

  copyEcosystemHandle(account: EcosystemAccount): void {
    if (!account.handle || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(account.handle).then(() => {
      this.messageService.add({
        severity: 'info',
        summary: 'ID Copiado',
        detail: `${account.name}: ${account.handle} copiado al portapapeles.`
      });
    });
  }

  async linkOAuthProvider(provider: 'google' | 'discord'): Promise<void> {
    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.href : undefined;
      const { error } = await this.authService.client.auth.linkIdentity({
        provider,
        options: redirectTo ? { redirectTo } : undefined
      });
      if (error) throw error;
    } catch (error: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: `No se pudo vincular ${provider}`,
        detail: this.extractErrorMessage(error)
      });
    }
  }

  async revokeOtherSessions(): Promise<void> {
    this.revokingOthers.set(true);
    try {
      const { error } = await this.authService.client.auth.signOut({ scope: 'others' });
      if (error) throw error;
      this.messageService.add({
        severity: 'success',
        summary: 'Sesiones Remotas Cerradas',
        detail: 'Se cerraron todas las demás sesiones activas en otros dispositivos.'
      });
    } catch (error: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al revocar sesiones',
        detail: this.extractErrorMessage(error)
      });
    } finally {
      this.revokingOthers.set(false);
    }
  }

  copyProfileLink(): void {
    const username = this.profile()?.username || 'archivista';
    const link = `https://questlog.gg/u/${username}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        this.messageService.add({
          severity: 'info',
          summary: 'Enlace Copiado',
          detail: 'El enlace canónico ha sido copiado al portapapeles.'
        });
      });
    }
  }

  shareProfile(): void {
    const username = this.profile()?.username || 'archivista';
    const link = `https://questlog.gg/u/${username}`;
    if (navigator.share) {
      navigator.share({
        title: `Bóveda de ${username} en QuestLog`,
        text: 'Inspecciona mi catálogo de preservación y matrices de tier lists.',
        url: link
      }).catch(() => this.copyProfileLink());
    } else {
      this.copyProfileLink();
    }
  }
}
