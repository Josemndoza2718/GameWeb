import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';

import { Game } from '../../models/rawg.model';
import { RawgService } from '../../services/rawg';

@Component({
  selector: 'app-search-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AutoCompleteModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css'
})
export class SearchBarComponent {
  private rawgService = inject(RawgService);
  private router = inject(Router);

  selectedGame = signal<Game | null>(null);
  suggestions = signal<Game[]>([]);

  /**
   * Se ejecuta en cada pulsación de tecla dentro del p-autoComplete
   */
  onSearch(event: AutoCompleteCompleteEvent): void {
    const query = event.query;

    if (!query || query.trim().length < 2) {
      this.suggestions.set([]);
      return;
    }

    this.rawgService.searchGames(query, 8).subscribe({
      next: (games) => this.suggestions.set(games),
      error: (err) => console.error('Error buscando juegos en RAWG:', err)
    });
  }

  /**
   * Evento al hacer clic o seleccionar un juego de la lista desplegable
   */
  onSelect(game: Game): void {
    if (game && game.id) {
      this.router.navigate(['/game', game.id]);
      this.selectedGame.set(null); // Limpiar la barra tras seleccionar
    }
  }
}