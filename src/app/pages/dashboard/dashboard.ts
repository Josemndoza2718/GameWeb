import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

// PrimeNG
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Servicios y Modelos
import { RawgService } from '../../services/rawg';
import { UserGamesService } from '../../services/user-games';
import { AuthService } from '../../services/auth';
import { Game } from '../../models/rawg.model';
import { GameStatus } from '../../models/user-game.model';

export type CatalogTab = 'all' | 'trends' | 'retro' | 'recent' | 'top';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    ProgressSpinnerModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private rawgService = inject(RawgService);
  private userGamesService = inject(UserGamesService);
  public authService = inject(AuthService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  // Estados de catálogo
  games = signal<Game[]>([]);
  spotlightGame = signal<Game | null>(null);
  loading = signal<boolean>(true);

  // Filtros interactivos
  activeTab = signal<CatalogTab>('all');
  selectedGenre = signal<string>('all');
  selectedDecade = signal<string>('all');
  minScore = signal<number | null>(null);

  genres = [
    { label: 'Todos', value: 'all' },
    { label: 'RPG', value: 'role-playing-games-rpg' },
    { label: 'Acción', value: 'action' },
    { label: 'Aventura', value: 'adventure' },
    { label: 'Plataformas', value: 'platformer' },
    { label: 'Estrategia', value: 'strategy' },
    { label: 'Disparos', value: 'shooter' }
  ];

  decades = [
    { label: 'Todas', value: 'all' },
    { label: '80s', value: '1980-01-01,1989-12-31' },
    { label: '90s', value: '1990-01-01,1999-12-31' },
    { label: '2000s', value: '2000-01-01,2009-12-31' },
    { label: '2010s', value: '2010-01-01,2019-12-31' },
    { label: '2020s', value: '2020-01-01,2029-12-31' }
  ];

  ngOnInit(): void {
    this.fetchCatalog();
  }

  fetchCatalog(): void {
    this.loading.set(true);

    let ordering = '-rating';
    let dates: string | undefined;
    let metacritic: string | undefined;

    switch (this.activeTab()) {
      case 'trends':
        ordering = '-added';
        break;
      case 'retro':
        ordering = '-metacritic';
        dates = '1980-01-01,2002-12-31';
        break;
      case 'recent':
        ordering = '-released';
        dates = '2023-01-01,2026-12-31';
        break;
      case 'top':
        ordering = '-metacritic';
        metacritic = '88,100';
        break;
      default:
        ordering = '-metacritic';
    }

    if (this.selectedDecade() !== 'all') {
      dates = this.selectedDecade();
    }

    if (this.minScore()) {
      metacritic = `${this.minScore()},100`;
    }

    const genreFilter = this.selectedGenre() !== 'all' ? this.selectedGenre() : undefined;

    this.rawgService.getCatalogGames({
      ordering,
      genres: genreFilter,
      dates,
      metacritic,
      pageSize: 20
    }).subscribe({
      next: (list) => {
        this.games.set(list);
        if (list.length > 0 && !this.spotlightGame()) {
          // Asignar primer título de excelencia como Spotlight
          const best = list.find(g => (g.metacritic || 0) >= 90) || list[0];
          this.spotlightGame.set(best);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando catálogo:', err);
        this.loading.set(false);
      }
    });
  }

  setTab(tab: CatalogTab): void {
    this.activeTab.set(tab);
    this.fetchCatalog();
  }

  setGenre(genre: string): void {
    this.selectedGenre.set(genre);
    this.fetchCatalog();
  }

  setDecade(decade: string): void {
    this.selectedDecade.set(decade);
    this.fetchCatalog();
  }

  setMinScore(score: number | null): void {
    this.minScore.set(score);
    this.fetchCatalog();
  }

  /**
   * Acción rápida desde la tarjeta para añadir a biblioteca
   */
  async quickAdd(game: Game, status: GameStatus, event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();

    if (!this.authService.currentUser()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Inicia sesión',
        detail: 'Debes iniciar sesión para guardar juegos en tu bitácora'
      });
      this.router.navigate(['/auth']);
      return;
    }

    try {
      await this.userGamesService.addOrUpdateGame({
        game_id: game.id,
        game_title: game.name,
        game_cover: game.background_image,
        status: status,
        user_rating: null
      });

      const labelMap: Record<GameStatus, string> = {
        playing: 'Jugando',
        plan_to_play: 'Backlog',
        completed: 'Completado',
        on_hold: 'En Espera',
        dropped: 'Abandonado'
      };

      this.messageService.add({
        severity: 'success',
        summary: 'Juego Registrado',
        detail: `"${game.name}" guardado como ${labelMap[status]}`
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo guardar el juego'
      });
    }
  }

  getYear(dateStr?: string): string {
    if (!dateStr) return 'N/A';
    return dateStr.substring(0, 4);
  }

  getPlatformNames(game: Game): string {
    if (!game.platforms || game.platforms.length === 0) return 'Multi';
    const firstTwo = game.platforms.slice(0, 2).map(p => p.platform.name);
    return firstTwo.join(', ');
  }

  getScore(game: Game): number {
    return game.metacritic || (game.rating ? Math.round(game.rating * 20) : 85);
  }
}
