import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

// PrimeNG
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { RatingModule } from 'primeng/rating';
import { CardModule } from 'primeng/card';
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
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TagModule,
    ButtonModule,
    SelectModule,
    RatingModule,
    CardModule,
    ProgressSpinnerModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './game-detail.html',
  styleUrl: './game-detail.css'
})
export class GameDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private rawgService = inject(RawgService);
  private userGamesService = inject(UserGamesService);
  public authService = inject(AuthService);
  private messageService = inject(MessageService);

  // Estados
  game = signal<GameDetail | null>(null);
  screenshots = signal<string[]>([]);
  userGame = signal<UserGame | null>(null);
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);

  // Campos vinculados a la UI
  selectedStatus = signal<GameStatus | null>(null);
  userRating = signal<number | null>(null);

  // Opciones para el p-dropdown
  statusOptions = [
    { label: GAME_STATUS_LABELS.playing, value: 'playing' },
    { label: GAME_STATUS_LABELS.completed, value: 'completed' },
    { label: GAME_STATUS_LABELS.on_hold, value: 'on_hold' },
    { label: GAME_STATUS_LABELS.dropped, value: 'dropped' },
    { label: GAME_STATUS_LABELS.plan_to_play, value: 'plan_to_play' }
  ];

  ngOnInit(): void {
    const gameId = this.route.snapshot.paramMap.get('id');
    if (gameId) {
      this.loadGameData(gameId);
    }
  }

  private async loadGameData(id: string): Promise<void> {
    this.loading.set(true);
    const numericId = Number(id);

    try {
      // 1. Cargar detalle y capturas de pantalla desde RAWG
      this.rawgService.getGameDetails(id).subscribe({
        next: (data) => this.game.set(data),
        error: (err) => console.error('Error cargando detalles del juego:', err)
      });

      this.rawgService.getGameScreenshots(id).subscribe({
        next: (shots) => this.screenshots.set(shots)
      });

      // 2. Si el usuario está autenticado, consultar si el juego ya está en su biblioteca
      if (this.authService.currentUser()) {
        const userGameData = await this.userGamesService.getGameStatusForUser(numericId);
        if (userGameData) {
          this.userGame.set(userGameData);
          this.selectedStatus.set(userGameData.status);
          this.userRating.set(userGameData.user_rating ? Math.round(userGameData.user_rating / 2) : null); // Escala 1-5 para el p-rating
        }
      }
    } catch (error) {
      console.error('Error al inicializar la ficha del juego:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Guarda o actualiza el juego en la biblioteca personal de Supabase
   */
  async onStatusOrRatingChange(): Promise<void> {
    const currentGame = this.game();
    const status = this.selectedStatus();
    if (!currentGame || !status) return;

    this.saving.set(true);
    try {
      // Convertimos la puntuación de 5 estrellas de PrimeNG a escala 1-10 para la BD
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
        summary: 'Biblioteca actualizada',
        detail: `Guardado como "${GAME_STATUS_LABELS[status]}"`
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
        detail: 'El juego fue eliminado de tu biblioteca'
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