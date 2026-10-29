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
import { ProfileService, UserProfileData, UserProfileStats } from '../../services/profile';

export type ProfileTab = 'personal' | 'security' | 'preferences' | 'connections' | 'collection';

export interface EcosystemAccount {
  id: string;
  name: string;
  detail: string;
  icon: string;
  bgClass: string;
  connected: boolean;
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
  private profileService = inject(ProfileService);
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

  // Pestaña activa en la colección pública
  collectionSubTab = signal<'library' | 'posts' | 'tierlists'>('library');

  // Formulario: Información Personal & Perfil
  fullName = signal<string>('Alejandro Vance');
  userEmail = signal<string>('');
  phoneNumber = signal<string>('+34 612 984 521');
  pronouns = signal<string>('Él / He / Him');
  timezone = signal<string>('Europa / Madrid (UTC+01:00)');
  featuredBadge = signal<boolean>(true);
  bio = signal<string>('Archivista centrado en JRPGs de la era dorada (16/32-bit), metroidvanias y análisis de dificultad en juegos de FromSoftware. Defensor crítico del ritmo en el diseño de niveles.');
  avatarPreview = signal<string | null>(null);
  selectedAvatarFile = signal<File | null>(null);

  // Formulario: Seguridad & Contraseña
  currentPassword = signal<string>('MasterPass2024!Vault');
  newPassword = signal<string>('');
  confirmNewPassword = signal<string>('');
  showCurrentPassword = signal<boolean>(false);
  showNewPassword = signal<boolean>(false);
  twoFactorActive = signal<boolean>(true);

  // Formulario: Preferencias de Plataforma & Archivo
  profileVisibility = signal<'public' | 'accredited' | 'private'>('public');
  acceptTierChallenges = signal<boolean>(true);
  boxartMode = signal<'retro_hd' | 'original_1to1'>('retro_hd');
  interfaceLanguage = signal<string>('es_es');

  // Cuentas de Ecosistemas Vinculadas
  ecosystems = signal<EcosystemAccount[]>([
    { id: 'steam', name: 'Steam', detail: '412 Juegos Sinc.', icon: 'terminal', bgClass: 'steam-bg', connected: true },
    { id: 'psn', name: 'PSN Network', detail: '18 Platinos', icon: 'gamepad', bgClass: 'psn-bg', connected: true },
    { id: 'xbox', name: 'Xbox Live', detail: 'Pausado', icon: 'videogame_asset', bgClass: 'xbox-bg', connected: false },
    { id: 'switch', name: 'Nintendo Switch', detail: 'Conectado', icon: 'sports_esports', bgClass: 'switch-bg', connected: true }
  ]);

  // Sesiones activas monitorizadas
  activeSessions = signal([
    { id: '1', device: 'Chrome en macOS', location: 'Madrid, España • IP: 88.23.190.***', isCurrent: true, icon: 'laptop_mac' },
    { id: '2', device: 'App Móvil QuestLog (iOS)', location: 'iPhone 15 Pro • Hace 42 minutos', isCurrent: false, icon: 'smartphone' }
  ]);

  // Comprueba si el perfil corresponde al usuario autenticado
  isOwnProfile = computed(() => {
    const currentUser = this.authService.currentUser();
    return !!currentUser && this.profile()?.id === currentUser.id;
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
        this.bio.set(data.bio || this.bio());
        this.avatarPreview.set(data.avatar_url);
        this.userEmail.set(currentUser?.email || `${data.username.toLowerCase()}@retroarchive.gg`);

        // Si no es el perfil propio, abrir por defecto la pestaña de colección pública
        if (currentUser && data.id !== currentUser.id) {
          this.activeTab.set('collection');
        }

        if (data.id) {
          const [statsData, gamesData, postsData, tierlistsData] = await Promise.all([
            this.profileService.getProfileStats(data.id),
            this.userGamesService.getUserLibrary(data.id),
            this.postsService.getPosts('all'),
            this.tierlistsService.getPublicTierlists()
          ]);

          this.stats.set(statsData);
          this.userGames.set(gamesData);
          this.userPosts.set(postsData.filter(p => p.user_id === data.id));
          this.userTierlists.set(tierlistsData.filter(t => t.user_id === data.id));
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

  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedAvatarFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => this.avatarPreview.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  async savePersonalInfo(): Promise<void> {
    const current = this.profile();
    if (!current) return;

    this.saving.set(true);
    try {
      let avatarUrl = current.avatar_url;

      if (this.selectedAvatarFile()) {
        avatarUrl = await this.profileService.uploadAvatar(this.selectedAvatarFile()!, current.id);
      }

      await this.profileService.updateProfile(current.id, {
        bio: this.bio(),
        avatar_url: avatarUrl
      });

      this.profile.set({
        ...current,
        bio: this.bio(),
        avatar_url: avatarUrl
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Bóveda Actualizada',
        detail: 'Tu información personal ha sido sincronizada exitosamente.'
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al guardar información';
      this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      this.saving.set(false);
    }
  }

  async updatePassword(): Promise<void> {
    if (!this.newPassword()) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Ingresa una nueva contraseña.' });
      return;
    }

    if (this.newPassword() !== this.confirmNewPassword()) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Las contraseñas no coinciden.' });
      return;
    }

    this.saving.set(true);
    try {
      const { error } = await this.authService.client.auth.updateUser({
        password: this.newPassword()
      });
      if (error) throw error;

      this.messageService.add({
        severity: 'success',
        summary: 'Contraseña Actualizada',
        detail: 'Tu clave maestra ha sido modificada con cifrado cuántico.'
      });
      this.newPassword.set('');
      this.confirmNewPassword.set('');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'No se pudo actualizar la contraseña';
      this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      this.saving.set(false);
    }
  }

  savePreferences(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Preferencias Guardadas',
      detail: 'Tus modos de visualización y visibilidad de canon han sido actualizados.'
    });
  }

  toggleEcosystem(account: EcosystemAccount): void {
    this.ecosystems.update(items =>
      items.map(i => i.id === account.id ? { ...i, connected: !i.connected } : i)
    );
    const updated = this.ecosystems().find(i => i.id === account.id);
    this.messageService.add({
      severity: 'info',
      summary: updated?.connected ? 'Ecosistema Conectado' : 'Ecosistema Desconectado',
      detail: `Estado de sincronización de ${account.name} modificado.`
    });
  }

  revokeSession(sessionId: string): void {
    this.activeSessions.update(list => list.filter(s => s.id !== sessionId));
    this.messageService.add({
      severity: 'warn',
      summary: 'Sesión Revocada',
      detail: 'La sesión remota ha sido desconectada del nodo de autenticación.'
    });
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
