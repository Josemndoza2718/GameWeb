import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// PrimeNG
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { RatingModule } from 'primeng/rating';
import { SelectModule } from 'primeng/select';
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
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TabsModule,
    CardModule,
    ButtonModule,
    TagModule,
    RatingModule,
    SelectModule,
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

  // Opciones para cambiar estado directamente desde la tarjeta
  statusOptions = [
    { label: GAME_STATUS_LABELS.playing, value: 'playing' },
    { label: GAME_STATUS_LABELS.completed, value: 'completed' },
    { label: GAME_STATUS_LABELS.on_hold, value: 'on_hold' },
    { label: GAME_STATUS_LABELS.dropped, value: 'dropped' },
    { label: GAME_STATUS_LABELS.plan_to_play, value: 'plan_to_play' }
  ];

  // Computados para filtrar la lista según la pestaña seleccionada
  playingGames = computed(() => this.library().filter(g => g.status === 'playing'));
  completedGames = computed(() => this.library().filter(g => g.status === 'completed'));
  onHoldGames = computed(() => this.library().filter(g => g.status === 'on_hold'));
  droppedGames = computed(() => this.library().filter(g => g.status === 'dropped'));
  planToPlayGames = computed(() => this.library().filter(g => g.status === 'plan_to_play'));

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

      // Actualización inmutable local del Signal
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
   * Actualiza la valoración del juego (convertida de escala 1-5 a 1-10)
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
  async removeGame(gameId: number): Promise<void> {
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

  getSeverity(status: GameStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'playing': return 'success';
      case 'completed': return 'info';
      case 'on_hold': return 'warn';
      case 'dropped': return 'danger';
      case 'plan_to_play': return 'secondary';
    }
  }
}