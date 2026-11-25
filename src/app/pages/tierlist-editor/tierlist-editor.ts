import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';

// Angular CDK Drag and Drop
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';

// PrimeNG
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

// Servicios y Modelos
import { TierRow, TierGame, DEFAULT_TIER_ROWS } from '../../models/tierlist.model';
import { Game } from '../../models/rawg.model';
import { TierlistsService } from '../../services/tierlist';
import { RawgService } from '../../services/rawg';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-tierlist-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    AutoCompleteModule,
    ToastModule,
    ProgressSpinnerModule
  ],
  providers: [MessageService],
  templateUrl: './tierlist-editor.html',
  styleUrl: './tierlist-editor.css'
})
export class TierlistEditorComponent implements OnInit {
  private tierlistsService = inject(TierlistsService);
  private rawgService = inject(RawgService);
  public authService = inject(AuthService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Datos del Formulario
  tierlistId = signal<string | null>(null);
  title = signal<string>('Ranking Definitivo: Los Mejores Videojuegos');
  description = signal<string>('');
  isPublic = signal<boolean>(true);
  saving = signal<boolean>(false);
  loading = signal<boolean>(false);

  // Filas del tablero (S, A, B, C, D)
  rows = signal<TierRow[]>(structuredClone(DEFAULT_TIER_ROWS));

  // Banco de juegos sin clasificar (Unranked Pool)
  bankGames = signal<TierGame[]>([]);

  // Buscador de juegos para agregar al banco
  selectedGameSearch = signal<Game | null>(null);
  gameSuggestions = signal<Game[]>([]);

  // Fila actualmente en edición (modal)
  editingRowIndex = signal<number | null>(null);
  editingRow = computed(() => {
    const idx = this.editingRowIndex();
    return idx !== null ? this.rows()[idx] ?? null : null;
  });

  // Paleta rápida para selector de color de filas
  readonly rowColorPresets: string[] = [
    '#dc2626', '#ea580c', '#f59e0b', '#10b981',
    '#06b6d4', '#6366f1', '#a855f7', '#ec4899', '#64748b'
  ];

  // Métricas de estado
  totalRanked = computed(() => {
    return this.rows().reduce((sum, r) => sum + r.games.length, 0);
  });

  totalUnranked = computed(() => {
    return this.bankGames().length;
  });

  tierDescriptions: Record<string, string> = {
    'S': 'Obra Maestra',
    'A': 'Excelente',
    'B': 'Destacado',
    'C': 'Bueno',
    'D': 'Prescindible'
  };

  tierColors: Record<string, string> = {
    'S': '#dc2626',
    'A': '#ea580c',
    'B': '#f59e0b',
    'C': '#10b981',
    'D': '#06b6d4'
  };

  // IDs de todos los contenedores conectables para Drag and Drop
  connectedDropLists = computed(() => {
    const rowIds = this.rows().map((_, index) => `tier-row-${index}`);
    return ['bank-list', ...rowIds];
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTierlist(id);
    } else {
      // Cargar juegos sugeridos populares en el unranked pool inicial para que no esté vacío
      this.loadInitialPool();
    }
  }

  private loadInitialPool(): void {
    this.rawgService.getPopularGames(8).subscribe({
      next: (popular) => {
        const pool: TierGame[] = popular.map(g => ({
          game_id: g.id,
          game_title: g.name,
          game_cover: g.background_image
        }));
        this.bankGames.set(pool);
      },
      error: () => {}
    });
  }

  private async loadTierlist(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.tierlistsService.getTierlistById(id);
      this.tierlistId.set(data.id || null);
      this.title.set(data.title);
      this.description.set(data.description || '');
      this.isPublic.set(data.is_public);
      this.rows.set(data.rows_data);
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la Tierlist' });
    } finally {
      this.loading.set(false);
    }
  }

  // Búsqueda en RAWG para el banco de juegos
  searchGames(event: AutoCompleteCompleteEvent): void {
    this.rawgService.searchGames(event.query, 6).subscribe({
      next: (games) => this.gameSuggestions.set(games)
    });
  }

  // Agrega un juego seleccionado al banco sin clasificar
  addGameToBank(game: Game | string | null): void {
    if (!game || typeof game === 'string' || !game.id) return;

    const existsInBank = this.bankGames().some(g => g.game_id === game.id);
    const existsInRows = this.rows().some(r => r.games.some(g => g.game_id === game.id));

    if (existsInBank || existsInRows) {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'El juego ya está en el tablero' });
      this.selectedGameSearch.set(null);
      return;
    }

    const newTierGame: TierGame = {
      game_id: game.id,
      game_title: game.name,
      game_cover: game.background_image
    };

    this.bankGames.update(list => [...list, newTierGame]);
    this.selectedGameSearch.set(null);
  }

  /**
   * Lógica principal de Drag & Drop entre filas y banco
   */
  onDrop(event: CdkDragDrop<TierGame[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
    this.rows.update(r => [...r]);
    this.bankGames.update(b => [...b]);
  }

  // Elimina una portada del tablero/banco
  removeGameFromTablero(list: TierGame[], index: number, event: Event): void {
    event.stopPropagation();
    list.splice(index, 1);
    this.rows.update(r => [...r]);
    this.bankGames.update(b => [...b]);
  }

  // Vaciar tablero y mover todo al pool
  clearBoard(): void {
    const allGames: TierGame[] = [];
    const currentRows = this.rows();
    currentRows.forEach(r => {
      allGames.push(...r.games);
      r.games = [];
    });
    this.rows.set([...currentRows]);
    this.bankGames.update(pool => [...pool, ...allGames]);
    this.messageService.add({ severity: 'info', summary: 'Tablero Vaciado', detail: 'Todos los juegos fueron devueltos al banco' });
  }

  // Añadir nueva fila
  addRow(): void {
    const letters = ['E', 'F', 'G'];
    const currentCount = this.rows().length;
    const nextLetter = letters[currentCount - 5] || `T${currentCount + 1}`;
    
    this.rows.update(list => [
      ...list,
      { tier: nextLetter, color: '#64748b', description: 'Nuevo Rango', games: [] }
    ]);
  }

  getRowColor(row: TierRow): string {
    return row.color || this.tierColors[row.tier] || '#6366f1';
  }

  getRowDescription(row: TierRow): string {
    return row.description !== undefined
      ? row.description
      : (this.tierDescriptions[row.tier] || 'Rango');
  }

  openRowEditor(index: number): void {
    this.editingRowIndex.set(index);
  }

  closeRowEditor(): void {
    this.editingRowIndex.set(null);
  }

  updateRowField(index: number, patch: Partial<Pick<TierRow, 'tier' | 'color' | 'description'>>): void {
    this.rows.update(list =>
      list.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  moveRow(index: number, direction: -1 | 1): void {
    const targetIndex = index + direction;
    const list = this.rows();
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const updated = [...list];
    moveItemInArray(updated, index, targetIndex);
    this.rows.set(updated);

    if (this.editingRowIndex() === index) {
      this.editingRowIndex.set(targetIndex);
    }
  }

  deleteRow(index: number): void {
    const list = this.rows();
    if (list.length <= 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Mínimo requerido',
        detail: 'La tierlist debe tener al menos una fila'
      });
      return;
    }

    const removedRow = list[index];
    if (removedRow.games.length > 0) {
      this.bankGames.update(pool => [...pool, ...removedRow.games]);
    }

    this.rows.set(list.filter((_, i) => i !== index));
    if (this.editingRowIndex() === index) {
      this.editingRowIndex.set(null);
    }
    this.messageService.add({
      severity: 'info',
      summary: 'Fila eliminada',
      detail: removedRow.games.length > 0
        ? `Se devolvieron ${removedRow.games.length} juegos al banco`
        : `Se eliminó la fila ${removedRow.tier}`
    });
  }

  // Guardar en Supabase
  async saveTierlist(): Promise<void> {
    if (!this.title().trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Ingresa un título para la Tierlist' });
      return;
    }

    this.saving.set(true);
    try {
      if (this.tierlistId()) {
        await this.tierlistsService.updateTierlist(this.tierlistId()!, {
          title: this.title(),
          description: this.description(),
          is_public: this.isPublic(),
          rows_data: this.rows()
        });
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Tierlist actualizada correctamente' });
      } else {
        const created = await this.tierlistsService.createTierlist({
          title: this.title(),
          description: this.description(),
          is_public: this.isPublic(),
          rows_data: this.rows()
        });
        this.tierlistId.set(created.id || null);
        this.messageService.add({ severity: 'success', summary: 'Publicado', detail: 'Tierlist guardada exitosamente en el Vault' });
      }
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    } finally {
      this.saving.set(false);
    }
  }
}