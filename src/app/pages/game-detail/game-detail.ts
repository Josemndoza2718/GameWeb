import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

// PrimeNG
import { RatingModule } from 'primeng/rating';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Servicios y Modelos
import { GameDetail } from '../../models/rawg.model';
import { UserGame, GameStatus, GAME_STATUS_LABELS } from '../../models/user-game.model';
import { RawgService } from '../../services/rawg';
import { UserGamesService } from '../../services/user-games';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-game-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeLightbox()'
  },
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RatingModule,
    ProgressSpinnerModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './game-detail.html',
  styleUrl: './game-detail.css'
})
export class GameDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rawgService = inject(RawgService);
  private userGamesService = inject(UserGamesService);
  public authService = inject(AuthService);
  private messageService = inject(MessageService);

  // Estados de datos
  game = signal<GameDetail | null>(null);
  screenshots = signal<string[]>([]);
  userGame = signal<UserGame | null>(null);
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);

  // Campos vinculados a la UI
  selectedStatus = signal<GameStatus | null>(null);
  userRating = signal<number | null>(null);

  // Lightbox / Visor de Imágenes
  activeLightboxImage = signal<string | null>(null);
  activeLightboxIndex = signal<number>(0);

  statusList: { status: GameStatus; label: string; icon: string }[] = [
    { status: 'playing', label: 'Jugando', icon: 'videogame_asset' },
    { status: 'completed', label: 'Completado', icon: 'check_circle' },
    { status: 'plan_to_play', label: 'Backlog', icon: 'hourglass_empty' },
    { status: 'on_hold', label: 'En Espera', icon: 'pause_circle' },
    { status: 'dropped', label: 'Abandonado', icon: 'block' }
  ];

  metacriticScore = computed(() => {
    const g = this.game();
    if (!g) return 85;
    return g.metacritic || (g.rating ? Math.round(g.rating * 20) : 85);
  });

  acclaimText = computed(() => {
    const score = this.metacriticScore();
    if (score >= 90) return 'Universal Acclaim';
    if (score >= 80) return 'Generally Favorable';
    return 'Mixed Reviews';
  });

  // Duración media en horas (proporcionada por RAWG)
  campaignHours = computed(() => {
    const g = this.game();
    if (!g) return null;
    if (g.playtime && g.playtime > 0) {
      return g.playtime;
    }
    return null;
  });

  developersList = computed(() => {
    const g = this.game();
    if (!g?.developers?.length) return 'Desarrollador N/A';
    return g.developers.map(d => d.name).join(', ');
  });

  publishersList = computed(() => {
    const g = this.game();
    if (!g?.publishers?.length) return 'Publisher N/A';
    return g.publishers.map(p => p.name).join(', ');
  });

  // Lista combinada de portada + screenshots para el lightbox
  allImages = computed(() => {
    const g = this.game();
    const shots = this.screenshots();
    const imgs: string[] = [];
    if (g?.background_image) {
      imgs.push(g.background_image);
    }
    shots.forEach(s => {
      if (!imgs.includes(s)) imgs.push(s);
    });
    return imgs;
  });

  ngOnInit(): void {
    // Solución al Bug 1: Suscribirse reactivamente a paramMap para recargar cuando cambia el ID
    this.route.paramMap.subscribe(params => {
      const gameId = params.get('id');
      if (gameId) {
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        this.resetGameState();
        this.loadGameData(gameId);
      }
    });
  }

  private resetGameState(): void {
    this.game.set(null);
    this.screenshots.set([]);
    this.userGame.set(null);
    this.selectedStatus.set(null);
    this.userRating.set(null);
    this.activeLightboxImage.set(null);
  }

  private async loadGameData(id: string): Promise<void> {
    this.loading.set(true);
    const numericId = Number(id);

    try {
      this.rawgService.getGameDetails(id).subscribe({
        next: (data) => {
          this.game.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error cargando detalles del juego:', err);
          this.loading.set(false);
        }
      });

      this.rawgService.getGameScreenshots(id).subscribe({
        next: (shots) => this.screenshots.set(shots)
      });

      if (this.authService.currentUser()) {
        const userGameData = await this.userGamesService.getGameStatusForUser(numericId);
        if (userGameData) {
          this.userGame.set(userGameData);
          this.selectedStatus.set(userGameData.status);
          this.userRating.set(userGameData.user_rating ? Math.round(userGameData.user_rating / 2) : null);
        }
      }
    } catch (error) {
      console.error('Error al inicializar la ficha del juego:', error);
      this.loading.set(false);
    }
  }

  // --- Funcionalidad del Lightbox de Imágenes (Item 2) ---
  openLightbox(imageUrl: string, index?: number): void {
    if (!imageUrl) return;
    this.activeLightboxImage.set(imageUrl);
    const list = this.allImages();
    const realIdx = list.indexOf(imageUrl);
    this.activeLightboxIndex.set(realIdx !== -1 ? realIdx : (index ?? 0));
  }

  closeLightbox(): void {
    this.activeLightboxImage.set(null);
  }

  nextLightboxImage(event?: Event): void {
    if (event) event.stopPropagation();
    const list = this.allImages();
    if (!list.length) return;
    const nextIdx = (this.activeLightboxIndex() + 1) % list.length;
    this.activeLightboxIndex.set(nextIdx);
    this.activeLightboxImage.set(list[nextIdx]);
  }

  prevLightboxImage(event?: Event): void {
    if (event) event.stopPropagation();
    const list = this.allImages();
    if (!list.length) return;
    const prevIdx = (this.activeLightboxIndex() - 1 + list.length) % list.length;
    this.activeLightboxIndex.set(prevIdx);
    this.activeLightboxImage.set(list[prevIdx]);
  }

  /**
   * Cambiar de estado con un solo click en los pills de bitácora
   */
  async setStatus(status: GameStatus): Promise<void> {
    if (!this.authService.currentUser()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Inicia sesión',
        detail: 'Debes iniciar sesión para guardar juegos en tu bitácora'
      });
      this.router.navigate(['/auth']);
      return;
    }

    this.selectedStatus.set(status);
    await this.saveToLibrary();
  }

  async onRatingChange(newStars: number | null): Promise<void> {
    this.userRating.set(newStars);
    if (this.selectedStatus()) {
      await this.saveToLibrary();
    }
  }

  /**
   * Guarda o actualiza el juego en la biblioteca personal de Supabase
   */
  async saveToLibrary(): Promise<void> {
    const currentGame = this.game();
    const status = this.selectedStatus();
    if (!currentGame || !status) return;

    this.saving.set(true);
    try {
      const scaleRating = this.userRating() ? this.userRating()! * 2 : null;

      const updated = await this.userGamesService.addOrUpdateGame({
        game_id: currentGame.id,
        game_title: currentGame.name,
        game_cover: currentGame.background_image,
        status: status,
        user_rating: scaleRating
      });

      this.userGame.set(updated);
      this.messageService.add({
        severity: 'success',
        summary: 'Bitácora Actualizada',
        detail: `Registrado como "${GAME_STATUS_LABELS[status]}"`
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo guardar en tu biblioteca'
      });
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Quita el juego de la biblioteca personal
   */
  async removeFromLibrary(): Promise<void> {
    const currentGame = this.game();
    if (!currentGame) return;

    this.saving.set(true);
    try {
      await this.userGamesService.removeGame(currentGame.id);
      this.userGame.set(null);
      this.selectedStatus.set(null);
      this.userRating.set(null);
      this.messageService.add({
        severity: 'info',
        summary: 'Eliminado',
        detail: 'El juego fue eliminado de tu bitácora'
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message
      });
    } finally {
      this.saving.set(false);
    }
  }
}