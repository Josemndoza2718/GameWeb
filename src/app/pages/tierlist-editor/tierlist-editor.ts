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
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { CheckboxModule } from 'primeng/checkbox';
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
    RouterLink,
    DragDropModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    AutoCompleteModule,
    CheckboxModule,
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
  title = signal<string>('Mi Tierlist de Videojuegos');
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

  // IDs de todos los contenedores conectables para Drag and Drop
  connectedDropLists = computed(() => {
    const rowIds = this.rows().map((_, index) => `tier-row-${index}`);
    return ['bank-list', ...rowIds];
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTierlist(id);
    }
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
  addGameToBank(game: Game): void {
    if (!game) return;

    const existsInBank = this.bankGames().some(g => g.game_id === game.id);
    const existsInRows = this.rows().some(r => r.games.some(g => g.game_id === game.id));

    if (existsInBank || existsInRows) {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'El juego ya está en el tablero' });
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
      // Reordenar dentro de la misma lista
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Mover entre diferentes filas o hacia el banco
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  // Elimina una portada del tablero/banco
  removeGameFromTablero(list: TierGame[], index: number): void {
    list.splice(index, 1);
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
        this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Tierlist guardada exitosamente' });
      }
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    } finally {
      this.saving.set(false);
    }
  }
}