import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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

export interface ConsoleOption {
  id: number;
  name: string;
  badge: string;
}

export interface PlatformFamilyOption {
  id: string; // 'all' | 'nintendo' | 'sony' | 'xbox' | 'pc'
  name: string;
  icon: string;
  parentId?: number;
  consoles: ConsoleOption[];
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
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
  private destroyRef = inject(DestroyRef);

  // Estados de catálogo y paginación
  games = signal<Game[]>([]);
  totalGamesCount = signal<number>(0);
  currentPage = signal<number>(1);
  hasNextPage = signal<boolean>(false);
  spotlightGame = signal<Game | null>(null);
  loading = signal<boolean>(true);
  loadingMore = signal<boolean>(false);

  // Búsqueda en la grilla del catálogo
  searchQuery = signal<string>('');
  private searchSubject = new Subject<string>();

  totalPages = computed(() => {
    const total = this.totalGamesCount();
    return total > 0 ? Math.ceil(total / 20) : 1;
  });

  // Filtros interactivos
  activeTab = signal<CatalogTab>('all');
  selectedGenre = signal<string>('all');
  selectedDecade = signal<string>('all');

  // Plataformas & Sub-menú de consolas
  selectedPlatformFamily = signal<string>('all');
  selectedConsoleId = signal<number | null>(null);

  platformFamilies: PlatformFamilyOption[] = [
    {
      id: 'all',
      name: 'Todas las Plataformas',
      icon: 'devices',
      consoles: []
    },
    {
      id: 'nintendo',
      name: 'Nintendo',
      icon: 'videogame_asset',
      parentId: 7,
      consoles: [
        { id: 7, name: 'Nintendo Switch', badge: 'Switch' },
        { id: 10, name: 'Wii U', badge: 'Wii U' },
        { id: 11, name: 'Nintendo Wii', badge: 'Wii' },
        { id: 105, name: 'Nintendo GameCube', badge: 'GameCube' },
        { id: 83, name: 'Nintendo 64', badge: 'N64' },
        { id: 79, name: 'Super Nintendo (SNES)', badge: 'SNES' },
        { id: 49, name: 'NES (Famicom)', badge: 'NES' },
        { id: 8, name: 'Nintendo 3DS', badge: '3DS' },
        { id: 9, name: 'Nintendo DS', badge: 'NDS' },
        { id: 24, name: 'Game Boy Advance', badge: 'GBA' },
        { id: 43, name: 'Game Boy Color', badge: 'GBC' },
        { id: 26, name: 'Game Boy Clásica', badge: 'GB' }
      ]
    },
    {
      id: 'sony',
      name: 'PlayStation',
      icon: 'sports_esports',
      parentId: 2,
      consoles: [
        { id: 187, name: 'PlayStation 5', badge: 'PS5' },
        { id: 18, name: 'PlayStation 4', badge: 'PS4' },
        { id: 16, name: 'PlayStation 3', badge: 'PS3' },
        { id: 15, name: 'PlayStation 2', badge: 'PS2' },
        { id: 27, name: 'PlayStation 1', badge: 'PS1' },
        { id: 19, name: 'PS Vita', badge: 'PS Vita' },
        { id: 17, name: 'PSP', badge: 'PSP' }
      ]
    },
    {
      id: 'xbox',
      name: 'Xbox',
      icon: 'stadia_controller',
      parentId: 3,
      consoles: [
        { id: 186, name: 'Xbox Series X/S', badge: 'Series X/S' },
        { id: 1, name: 'Xbox One', badge: 'Xbox One' },
        { id: 14, name: 'Xbox 360', badge: 'Xbox 360' },
        { id: 80, name: 'Xbox Clásica (2001)', badge: 'Xbox Retro' }
      ]
    },
    {
      id: 'pc',
      name: 'PC / Windows',
      icon: 'computer',
      parentId: 1,
      consoles: [
        { id: 4, name: 'PC (Windows)', badge: 'PC Master' }
      ]
    }
  ];

  activeConsoles = computed<ConsoleOption[]>(() => {
    const current = this.selectedPlatformFamily();
    const family = this.platformFamilies.find(f => f.id === current);
    return family?.consoles || [];
  });

  selectedConsoleName = computed<string | null>(() => {
    const consoleId = this.selectedConsoleId();
    if (!consoleId) return null;
    for (const fam of this.platformFamilies) {
      const match = fam.consoles.find(c => c.id === consoleId);
      if (match) return match.name;
    }
    return null;
  });

  // Filtro de Score (Rango 0 - 100 o Puntuación Específica)
  scoreFilterMode = signal<'preset' | 'range' | 'exact'>('preset');
  selectedScorePreset = signal<string>('all');
  scoreRangeMin = signal<number>(70);
  scoreRangeMax = signal<number>(100);
  scoreExact = signal<number>(85);
  showCustomScorePanel = signal<boolean>(false);
  customScoreMode = signal<'range' | 'exact'>('range');

  activeScoreDescription = computed<string | null>(() => {
    const mode = this.scoreFilterMode();
    if (mode === 'preset') {
      const preset = this.selectedScorePreset();
      if (preset === '90-100') return '90 - 100 (Élite)';
      if (preset === '80-100') return '80 - 100 (Excelente)';
      if (preset === '70-79') return '70 - 79 (Notable)';
      if (preset === '50-69') return '50 - 69 (Aceptable)';
      return null;
    }
    if (mode === 'range') {
      const from = Math.min(this.scoreRangeMin(), this.scoreRangeMax());
      const to = Math.max(this.scoreRangeMin(), this.scoreRangeMax());
      return `Rango ${from} - ${to}`;
    }
    if (mode === 'exact') {
      return `Exacta: ${this.scoreExact()}`;
    }
    return null;
  });

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
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(query => {
      this.searchQuery.set(query);
      this.fetchCatalog();
    });

    this.fetchCatalog();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value);
  }

  onSearchEnter(): void {
    this.fetchCatalog();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSubject.next('');
    this.fetchCatalog();
  }

  private getFilterPayload() {
    let ordering: string | undefined = '-rating';
    let dates: string | undefined;
    let metacritic: string | undefined;
    let parent_platforms: string | undefined;
    let platforms: string | undefined;

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

    // Filtro de Plataformas y Consolas
    if (this.selectedPlatformFamily() !== 'all') {
      const family = this.platformFamilies.find(f => f.id === this.selectedPlatformFamily());
      if (this.selectedConsoleId() !== null) {
        platforms = this.selectedConsoleId()!.toString();
      } else if (family?.parentId) {
        parent_platforms = family.parentId.toString();
      }
    }

    // Filtro de Score (Rango o Específica)
    if (this.scoreFilterMode() === 'preset') {
      switch (this.selectedScorePreset()) {
        case '90-100':
          metacritic = '90,100';
          break;
        case '80-100':
          metacritic = '80,100';
          break;
        case '70-79':
          metacritic = '70,79';
          break;
        case '50-69':
          metacritic = '50,69';
          break;
        default:
          break;
      }
    } else if (this.scoreFilterMode() === 'range') {
      const min = Math.min(Math.max(0, this.scoreRangeMin() || 0), 100);
      const max = Math.min(Math.max(0, this.scoreRangeMax() || 100), 100);
      const from = Math.min(min, max);
      const to = Math.max(min, max);
      metacritic = `${from},${to}`;
    } else if (this.scoreFilterMode() === 'exact') {
      const exact = Math.min(Math.max(0, this.scoreExact() || 0), 100);
      metacritic = `${exact},${exact}`;
    }

    const genreFilter = this.selectedGenre() !== 'all' ? this.selectedGenre() : undefined;
    const query = this.searchQuery().trim();

    // Cuando el usuario ingresa un término de búsqueda, priorizamos la relevancia directa del título
    if (query) {
      ordering = undefined;
    }

    return { 
      ordering, 
      dates, 
      metacritic, 
      parent_platforms,
      platforms,
      genres: genreFilter,
      search: query ? query : undefined
    };
  }

  fetchCatalog(): void {
    this.loading.set(true);
    this.currentPage.set(1);

    const filters = this.getFilterPayload();

    this.rawgService.getCatalogGames({
      ...filters,
      page: 1,
      pageSize: 20
    }).subscribe({
      next: (response) => {
        this.games.set(response.results);
        this.totalGamesCount.set(response.count);
        this.hasNextPage.set(!!response.next);

        if (response.results.length > 0 && !this.spotlightGame()) {
          const best = response.results.find(g => (g.metacritic || 0) >= 90) || response.results[0];
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

  loadMore(): void {
    if (this.loadingMore() || !this.hasNextPage()) return;

    const nextPage = this.currentPage() + 1;
    this.loadingMore.set(true);
    const filters = this.getFilterPayload();

    this.rawgService.getCatalogGames({
      ...filters,
      page: nextPage,
      pageSize: 20
    }).subscribe({
      next: (response) => {
        this.games.update(prev => [...prev, ...response.results]);
        this.currentPage.set(nextPage);
        this.totalGamesCount.set(response.count);
        this.hasNextPage.set(!!response.next);
        this.loadingMore.set(false);
      },
      error: (err) => {
        console.error('Error al cargar más videojuegos:', err);
        this.loadingMore.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar más títulos del catálogo'
        });
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

  // Plataformas y Consolas
  setPlatformFamily(familyId: string): void {
    this.selectedPlatformFamily.set(familyId);
    this.selectedConsoleId.set(null);
    this.fetchCatalog();
  }

  setConsole(consoleId: number | null): void {
    this.selectedConsoleId.set(consoleId);
    this.fetchCatalog();
  }

  // Score Controls
  setScorePreset(preset: string): void {
    this.scoreFilterMode.set('preset');
    this.selectedScorePreset.set(preset);
    this.showCustomScorePanel.set(false);
    this.fetchCatalog();
  }

  toggleCustomScorePanel(): void {
    this.showCustomScorePanel.update(v => !v);
  }

  setCustomScoreMode(mode: 'range' | 'exact'): void {
    this.customScoreMode.set(mode);
  }

  applyScoreRange(): void {
    this.scoreFilterMode.set('range');
    this.selectedScorePreset.set('custom');
    this.fetchCatalog();
  }

  applyScoreExact(): void {
    this.scoreFilterMode.set('exact');
    this.selectedScorePreset.set('custom');
    this.fetchCatalog();
  }

  resetScoreFilter(): void {
    this.scoreFilterMode.set('preset');
    this.selectedScorePreset.set('all');
    this.showCustomScorePanel.set(false);
    this.fetchCatalog();
  }

  // Manejo de imágenes no disponibles o con error de carga
  onImageError(event: Event): void {
    const target = event.target as HTMLElement;
    target.style.display = 'none';
    const parent = target.parentElement;
    if (parent && !parent.querySelector('.no-image-placeholder')) {
      const placeholder = document.createElement('div');
      placeholder.className = 'no-image-placeholder flex flex-column align-items-center justify-content-center w-full h-full p-2 text-center';
      placeholder.innerHTML = `
        <span class="material-symbols-outlined text-3xl text-muted opacity-40">broken_image</span>
        <span class="no-image-text font-title font-semibold text-muted opacity-60 mt-1" style="font-size: 10px;">No disponible</span>
      `;
      parent.appendChild(placeholder);
    }
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
