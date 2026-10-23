import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

// PrimeNG
import { AvatarModule } from 'primeng/avatar';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
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

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AvatarModule,
    CardModule,
    ButtonModule,
    TabsModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    ProgressSpinnerModule,
    ToastModule,
    TagModule
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
  private messageService = inject(MessageService);

  // Estados
  profile = signal<UserProfileData | null>(null);
  stats = signal<UserProfileStats | null>(null);
  userGames = signal<UserGame[]>([]);
  userPosts = signal<Post[]>([]);
  userTierlists = signal<Tierlist[]>([]);

  loading = signal<boolean>(true);
  updating = signal<boolean>(false);
  displayEditDialog = false;

  // Formulario de Edición
  editUsername = '';
  editBio = '';
  selectedFile: File | null = null;
  previewAvatarUrl: string | null = null;

  // Determina si el perfil que se está viendo pertenece al usuario autenticado
  isOwnProfile = computed(() => {
    const currentUser = this.authService.currentUser();
    return currentUser && this.profile()?.id === currentUser.id;
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

      // 1. Intentar buscar por nombre de usuario (búsqueda insensible a mayúsculas)
      let data = await this.profileService.getProfileByUsername(username);

      // 2. Si no se encontró por username, comprobar si existe por ID del usuario en sesión
      if (!data && currentUser) {
        try {
          const profileById = await this.profileService.getProfileById(currentUser.id);
          if (profileById) {
            data = profileById;
          }
        } catch {
          // Ignorar error si no se encuentra por ID
        }
      }

      // 3. Si aún no existe y corresponde al usuario en sesión, intentar auto-crearlo o usar perfil local
      if (!data && currentUser) {
        const myUsername = currentUser.user_metadata?.['username'] || currentUser.email?.split('@')[0] || username;
        if (myUsername.toLowerCase() === username.toLowerCase() || username === 'me') {
          try {
            data = await this.profileService.ensureProfile(currentUser.id, myUsername);
          } catch {
            // Si la política RLS en Supabase no permite INSERT, proveemos datos iniciales
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

      if (data?.id) {
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
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message || 'Error al cargar perfil' });
    } finally {
      this.loading.set(false);
    }
  }

  openEditModal(): void {
    const p = this.profile();
    if (!p) return;
    this.editUsername = p.username;
    this.editBio = p.bio || '';
    this.previewAvatarUrl = p.avatar_url;
    this.selectedFile = null;
    this.displayEditDialog = true;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => this.previewAvatarUrl = e.target?.result as string;
      reader.readAsDataURL(this.selectedFile);
    }
  }

  async saveProfile(): Promise<void> {
    const current = this.profile();
    if (!current) return;

    this.updating.set(true);
    try {
      let avatarUrl = current.avatar_url;

      // Subir avatar si seleccionó un nuevo archivo
      if (this.selectedFile) {
        avatarUrl = await this.profileService.uploadAvatar(this.selectedFile, current.id);
      }

      await this.profileService.updateProfile(current.id, {
        username: this.editUsername,
        bio: this.editBio,
        avatar_url: avatarUrl
      });

      this.profile.set({
        ...current,
        username: this.editUsername,
        bio: this.editBio,
        avatar_url: avatarUrl
      });

      this.messageService.add({ severity: 'success', summary: 'Perfil Actualizado', detail: 'Tus cambios han sido guardados' });
      this.displayEditDialog = false;
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    } finally {
      this.updating.set(false);
    }
  }
}