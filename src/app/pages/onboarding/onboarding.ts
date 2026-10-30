import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Servicios y Modelos
import { AuthService } from '../../services/auth';
import { RawgService } from '../../services/rawg';
import { UserGamesService } from '../../services/user-games';
import { ProfileService } from '../../services/profile';
import { Game } from '../../models/rawg.model';

export interface EcosystemOption {
  id: string;
  name: string;
  category: string;
  icon: string;
  badge: string;
  color: string;
  connected: boolean;
  accountHandle?: string;
}

export interface CuratorRoleOption {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  accent: string;
  description: string;
}

@Component({
  selector: 'app-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ProgressSpinnerModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css'
})
export class OnboardingComponent implements OnInit {
  private router = inject(Router);
  public authService = inject(AuthService);
  private rawgService = inject(RawgService);
  private userGamesService = inject(UserGamesService);
  private profileService = inject(ProfileService);
  private messageService = inject(MessageService);

  // Paso actual (1: Identidad & Arquetipo, 2: Calibración de Backlog, 3: Ecosistemas & Activación)
  currentStep = signal<number>(1);
  totalSteps = 3;

  // Estados de carga
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  searchingGames = signal<boolean>(false);

  // === PASO 1: Identidad y Arquetipo del Archivista ===
  displayName = signal<string>('');
  selectedRole = signal<string>('curator');
  bioSnippet = signal<string>('Custodio del patrimonio interactivo y explorador de gemas olvidadas.');

  rolesList: CuratorRoleOption[] = [
    {
      id: 'curator',
      title: 'Curador de Bóveda',
      tagline: 'Preservación Histórica & Análisis Crítico',
      icon: 'auto_stories',
      accent: 'var(--primary)',
      description: 'Especialista en clasificar obras maestras, mantener el canon intacto y documentar sagas de culto.'
    },
    {
      id: 'heretic',
      title: 'Hereje Dialéctico',
      tagline: 'Desafío al Consenso & Controversias',
      icon: 'local_fire_department',
      accent: 'var(--tertiary)',
      description: 'Cuestiona los rankings inflados, defiende joyas incomprendidas y lidera debates acalorados en el Ágora.'
    },
    {
      id: 'completionist',
      title: 'Custodio del 100%',
      tagline: 'Bitácora Implacable & Backlog Zero',
      icon: 'verified',
      accent: 'var(--secondary)',
      description: 'Obsesión por dominar mecánicas, registrar horas de campaña y purgar cada rincón del backlog.'
    }
  ];

  // === PASO 2: Backlog Inicial & Calibración de Algoritmo ===
  searchQuery = signal<string>('');
  suggestedGames = signal<Game[]>([]);
  selectedGames = signal<Game[]>([]);
  maxSelectedGames = 5;

  // === PASO 3: Ecosistemas & Redes Gaming ===
  ecosystems = signal<EcosystemOption[]>([
    {
      id: 'steam',
      name: 'Steam Vault Network',
      category: 'PC Gaming',
      icon: 'laptop_windows',
      badge: 'API v2.4',
      color: '#1da1f2',
      connected: true,
      accountHandle: 'Archivist_01'
    },
    {
      id: 'psn',
      name: 'PlayStation Network',
      category: 'Consola Sony',
      icon: 'gamepad',
      badge: 'PS4 / PS5',
      color: '#00439c',
      connected: false
    },
    {
      id: 'nintendo',
      name: 'Nintendo Network Account',
      category: 'Híbrida & Clásicos',
      icon: 'toggle_on',
      badge: 'Switch & Retro',
      color: '#e60012',
      connected: false
    },
    {
      id: 'xbox',
      name: 'Xbox Live / Game Pass',
      category: 'Ecosistema Microsoft',
      icon: 'stadia_controller',
      badge: 'Series X/S',
      color: '#107c10',
      connected: false
    }
  ]);

  // Derivados reactivos
  stepProgressPercent = computed(() => {
    return Math.round((this.currentStep() / this.totalSteps) * 100);
  });

  connectedEcosystemsCount = computed(() => {
    return this.ecosystems().filter(e => e.connected).length;
  });

  canProceedStep1 = computed(() => {
    return this.displayName().trim().length >= 2;
  });

  canProceedStep2 = computed(() => {
    return this.selectedGames().length >= 1;
  });

  ngOnInit(): void {
    // Inicializar nombre si hay sesión iniciada
    const user = this.authService.currentUser();
    if (user?.email) {
      const defaultName = user.user_metadata?.['username'] || user.email.split('@')[0];
      this.displayName.set(defaultName);
    }
    this.loadInitialSuggestions();
  }

  // --- Navegación entre pasos ---
  goToNextStep(): void {
    if (this.currentStep() === 1 && !this.canProceedStep1()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Ingresa un nombre de archivista para tu credencial.'
      });
      return;
    }
    if (this.currentStep() === 2 && !this.canProceedStep2()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Calibración Requerida',
        detail: 'Selecciona al menos 1 título insignia para calibrar tu bóveda inicial.'
      });
      return;
    }

    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update(s => s + 1);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  goToPreviousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  selectRole(roleId: string): void {
    this.selectedRole.set(roleId);
  }

  // --- Búsqueda y Selección de Juegos (Paso 2) ---
  loadInitialSuggestions(): void {
    this.searchingGames.set(true);
    this.rawgService.getPopularGames(8).subscribe({
      next: (games) => {
        this.suggestedGames.set(games);
        this.searchingGames.set(false);
      },
      error: () => this.searchingGames.set(false)
    });
  }

  onSearchInput(query: string): void {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      this.loadInitialSuggestions();
      return;
    }

    this.searchingGames.set(true);
    this.rawgService.searchGames(trimmed, 8).subscribe({
      next: (results) => {
        this.suggestedGames.set(results);
        this.searchingGames.set(false);
      },
      error: () => this.searchingGames.set(false)
    });
  }

  isGameSelected(gameId: number): boolean {
    return this.selectedGames().some(g => g.id === gameId);
  }

  toggleGameSelection(game: Game): void {
    const current = this.selectedGames();
    const index = current.findIndex(g => g.id === game.id);

    if (index >= 0) {
      this.selectedGames.set(current.filter(g => g.id !== game.id));
    } else {
      if (current.length >= this.maxSelectedGames) {
        this.messageService.add({
          severity: 'info',
          summary: 'Límite de Calibración',
          detail: `Puedes seleccionar un máximo de ${this.maxSelectedGames} títulos iniciales.`
        });
        return;
      }
      this.selectedGames.set([...current, game]);
    }
  }

  removeSelectedGame(gameId: number): void {
    this.selectedGames.set(this.selectedGames().filter(g => g.id !== gameId));
  }

  // --- Ecosistemas (Paso 3) ---
  toggleEcosystem(ecoId: string): void {
    this.ecosystems.update(list =>
      list.map(eco => {
        if (eco.id === ecoId) {
          const nextState = !eco.connected;
          return {
            ...eco,
            connected: nextState,
            accountHandle: nextState ? `${this.displayName() || 'Archivist'}_${eco.id.toUpperCase()}` : undefined
          };
        }
        return eco;
      })
    );
  }

  // --- Finalización del Onboarding ---
  async finishOnboarding(): Promise<void> {
    this.saving.set(true);
    const user = this.authService.currentUser();

    try {
      // 1. Guardar o actualizar perfil básico si hay usuario autenticado
      if (user) {
        this.authService.setOnboardingCompleted(user.id);

        await this.profileService.updateProfile(user.id, {
          username: this.displayName().trim(),
          bio: `[${this.rolesList.find(r => r.id === this.selectedRole())?.title}] ${this.bioSnippet().trim()}`
        });

        // 2. Agregar los juegos seleccionados a la biblioteca con estado 'plan_to_play' o 'completed'
        for (const game of this.selectedGames()) {
          await this.userGamesService.addOrUpdateGame({
            game_id: game.id,
            game_title: game.name,
            game_cover: game.background_image,
            status: 'plan_to_play'
          });
        }
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Protocolo de Inicio Completado',
        detail: 'Tu Bóveda ha sido calibrada con éxito. Bienvenido al Archivo.'
      });

      // Redirigir al catálogo principal
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 1200);

    } catch (error: unknown) {
      console.error('Error al guardar onboarding:', error);
      this.messageService.add({
        severity: 'warn',
        summary: 'Activación en Modo Local',
        detail: 'Configuración aplicada localmente. Redirigiendo a tu terminal...'
      });
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 1000);
    } finally {
      this.saving.set(false);
    }
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/images/placeholder-game.png';
    }
  }
}

