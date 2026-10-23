import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RatingModule } from 'primeng/rating';

import { SearchBarComponent } from '../../components/search-bar/search-bar.component';
import { AuthService } from '../../services/auth';
import { UserGamesService } from '../../services/user-games';
import { GAME_STATUS_LABELS, GameStatus, UserGame } from '../../models/user-game.model';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    CardModule,
    TagModule,
    ProgressSpinnerModule,
    RatingModule,
    SearchBarComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private userGamesService = inject(UserGamesService);
  private router = inject(Router);
  public authService = inject(AuthService);

  games = signal<UserGame[]>([]);
  loading = signal<boolean>(true);
  selectedFilter = signal<GameStatus | 'all'>('all');

  statusLabels = GAME_STATUS_LABELS;

  currentUsername = computed(() => {
    const user = this.authService.currentUser();
    return user?.user_metadata?.['username'] || '';
  });

  filteredGames = computed(() => {
    const filter = this.selectedFilter();
    const list = this.games();
    if (filter === 'all') return list;
    return list.filter(g => g.status === filter);
  });

  statusCounts = computed(() => {
    const list = this.games();
    return {
      all: list.length,
      playing: list.filter(g => g.status === 'playing').length,
      completed: list.filter(g => g.status === 'completed').length,
      plan_to_play: list.filter(g => g.status === 'plan_to_play').length,
      on_hold: list.filter(g => g.status === 'on_hold').length,
      dropped: list.filter(g => g.status === 'dropped').length
    };
  });

  async ngOnInit(): Promise<void> {
    await this.loadLibrary();
  }

  async loadLibrary(): Promise<void> {
    this.loading.set(true);
    try {
      const library = await this.userGamesService.getUserLibrary();
      this.games.set(library);
    } catch (err) {
      console.error('Error cargando biblioteca:', err);
    } finally {
      this.loading.set(false);
    }
  }

  setFilter(status: GameStatus | 'all'): void {
    this.selectedFilter.set(status);
  }

  async logout(): Promise<void> {
    try {
      await this.authService.signOut();
      this.router.navigate(['/auth']);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  }
}
