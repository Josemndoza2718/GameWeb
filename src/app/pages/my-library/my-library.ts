import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// PrimeNG
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { RatingModule } from 'primeng/rating';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

// Servicios y Modelos
import { UserGame, GameStatus, GAME_STATUS_LABELS } from '../../models/user-game.model';
import { UserGamesService } from '../../services/user-games';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-my-library',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'showXpModal() && toggleXpModal()'
  },
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TabsModule,
    ButtonModule,
    SelectModule,
    RatingModule,
    ProgressSpinnerModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './my-library.html',
  styleUrl: './my-library.css'
})
export class MyLibraryComponent implements OnInit {
  private userGamesService = inject(UserGamesService);
  public authService = inject(AuthService);
  private messageService = inject(MessageService);

  library = signal<UserGame[]>([]);
  loading = signal<boolean>(true);
  showXpModal = signal<boolean>(false);

  // Opciones para cambiar estado directamente desde la tarjeta
  statusOptions = [
    { label: GAME_STATUS_LABELS.playing, value: 'playing' },
    { label: GAME_STATUS_LABELS.completed, value: 'completed' },
    { label: GAME_STATUS_LABELS.on_hold, value: 'on_hold' },
    { label: GAME_STATUS_LABELS.dropped, value: 'dropped' },
    { label: GAME_STATUS_LABELS.plan_to_play, value: 'plan_to_play' }
  ];

  // Perfil del Archivista (Fusionado con perfil)
  currentUser = this.authService.currentUser;

  username = computed(() => {
    const user = this.currentUser();
    return user?.user_metadata?.['username'] || user?.email?.split('@')[0] || 'Archivist';
  });

  userInitial = computed(() => {
    return this.username().charAt(0).toUpperCase();
  });

  // Métricas computadas de la biblioteca
  totalGames = computed(() => this.library().length);
  playingGames = computed(() => this.library().filter(g => g.status === 'playing'));
  completedGames = computed(() => this.library().filter(g => g.status === 'completed'));
  onHoldGames = computed(() => this.library().filter(g => g.status === 'on_hold'));
  droppedGames = computed(() => this.library().filter(g => g.status === 'dropped'));
  planToPlayGames = computed(() => this.library().filter(g => g.status === 'plan_to_play'));

  completionRatio = computed(() => {
    const total = this.totalGames();
    if (!total) return 0;
    return Math.round((this.completedGames().length / total) * 100);
  });

  estimatedHours = computed(() => {
    return (this.completedGames().length * 28) + (this.playingGames().length * 14) + (this.onHoldGames().length * 8);
  });

  // --- Sistema de XP y Gamificación de QuestLog ---
  // Criterios:
  // 1. Cada juego añadido a la biblioteca: +100 XP (Preservación)
  // 2. Cada juego completado: +400 XP (Victoria Mayor)
  // 3. Cada juego en curso: +150 XP (Compromiso Activo)
  // 4. Cada juego valorado con nota personal: +50 XP (Aporte de Archivo)
  totalXp = computed(() => {
    const list = this.library();
    let xp = 0;
    for (const g of list) {
      xp += 100; // Preservar
      if (g.status === 'completed') xp += 400; // Completado
      if (g.status === 'playing') xp += 150; // Jugando
      if (g.user_rating) xp += 50; // Calificado
    }
    return xp;
  });

  level = computed(() => {
    const xp = this.totalXp();
    return Math.floor(xp / 1000) + 1;
  });

  xpProgress = computed(() => {
    const xp = this.totalXp();
    const inLevel = xp % 1000;
    return {
      current: inLevel,
      max: 1000,
      percent: Math.min(100, Math.round((inLevel / 1000) * 100))
    };
  });

  rankTitle = computed(() => {
    const lvl = this.level();
    if (lvl <= 5) return 'Novice Collector';
    if (lvl <= 15) return 'Archive Seeker';
    if (lvl <= 30) return 'Retro Vanguard';
    if (lvl <= 50) return 'Chrono Archivist';
    return 'Archivist Prime';
  });

  ngOnInit(): void {
    this.loadLibrary();
  }

  async loadLibrary(): Promise<void> {
    this.loading.set(true);
    try {
      const games = await this.userGamesService.getUserLibrary();
      this.library.set(games);
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al cargar biblioteca',
        detail: error.message || 'No se pudieron recuperar tus videojuegos'
      });
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Actualiza el estado de un juego directamente desde la biblioteca
   */
  async onStatusChange(game: UserGame, newStatus: GameStatus): Promise<void> {
    try {
      await this.userGamesService.updateStatus(game.game_id, newStatus);

      this.library.update(current =>
        current.map(g => g.game_id === game.game_id ? { ...g, status: newStatus } : g)
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Estado Actualizado',
        detail: `Cambiado a ${GAME_STATUS_LABELS[newStatus]}`
      });
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    }
  }

  /**
   * Actualiza la valoración del juego (escala 1-5 a 1-10)
   */
  async onRatingChange(game: UserGame, newStars: number | null): Promise<void> {
    const rating10 = newStars ? newStars * 2 : null;
    try {
      await this.userGamesService.updateRating(game.game_id, rating10);
      this.library.update(current =>
        current.map(g => g.game_id === game.game_id ? { ...g, user_rating: rating10 } : g)
      );
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    }
  }

  /**
   * Elimina un juego de la biblioteca
   */
  async removeGame(gameId: number, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    try {
      await this.userGamesService.removeGame(gameId);
      this.library.update(current => current.filter(g => g.game_id !== gameId));
      this.messageService.add({
        severity: 'info',
        summary: 'Juego Eliminado',
        detail: 'El título fue quitado de tu colección'
      });
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    }
  }

  getStars(rating: number | null | undefined): number {
    return rating ? Math.round(rating / 2) : 0;
  }

  toggleXpModal(): void {
    this.showXpModal.update(v => !v);
  }
}