import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Game, GameAchievement, GameDetail, GameScreenshot, RawgResponse } from '../models/rawg.model';
import { environment } from '../../env/environment';

@Injectable({
  providedIn: 'root'
})
export class RawgService {
  private http = inject(HttpClient);
  private baseUrl = 'https://api.rawg.io/api';
  private apiKey = environment.rawgApiKey;

  /**
   * Búsqueda por palabra clave (ideal para autocompletado)
   */
  searchGames(query: string, pageSize: number = 10): Observable<Game[]> {
    const params = new HttpParams()
      .set('key', this.apiKey)
      .set('search', query)
      .set('page_size', pageSize.toString());

    return this.http
      .get<RawgResponse<Game>>(`${this.baseUrl}/games`, { params })
      .pipe(map(response => response.results));
  }

  /**
   * Obtiene el detalle completo de un videojuego mediante su ID
   */
  getGameDetails(id: number | string): Observable<GameDetail> {
    const params = new HttpParams().set('key', this.apiKey);
    return this.http.get<GameDetail>(`${this.baseUrl}/games/${id}`, { params });
  }

  /**
   * Obtiene los juegos más populares/mejor valorados
   */
  getPopularGames(pageSize: number = 12): Observable<Game[]> {
    const params = new HttpParams()
      .set('key', this.apiKey)
      .set('ordering', '-rating')
      .set('page_size', pageSize.toString());

    return this.http
      .get<RawgResponse<Game>>(`${this.baseUrl}/games`, { params })
      .pipe(map(response => response.results));
  }

  /**
   * Obtiene catálogo filtrado para la vista Explorar / Vault con paginación
   */
  getCatalogGames(filters: {
    ordering?: string;
    genres?: string;
    dates?: string;
    metacritic?: string;
    search?: string;
    parent_platforms?: string;
    platforms?: string;
    pageSize?: number;
    page?: number;
  } = {}): Observable<RawgResponse<Game>> {
    let params = new HttpParams()
      .set('key', this.apiKey)
      .set('page_size', (filters.pageSize || 20).toString());

    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.ordering) {
      params = params.set('ordering', filters.ordering);
    }
    if (filters.genres) {
      params = params.set('genres', filters.genres);
    }
    if (filters.dates) {
      params = params.set('dates', filters.dates);
    }
    if (filters.metacritic) {
      params = params.set('metacritic', filters.metacritic);
    }
    if (filters.parent_platforms) {
      params = params.set('parent_platforms', filters.parent_platforms);
    }
    if (filters.platforms) {
      params = params.set('platforms', filters.platforms);
    }
    if (filters.search) {
      params = params.set('search', filters.search);
      params = params.set('search_precise', 'true');
    }

    return this.http.get<RawgResponse<Game>>(`${this.baseUrl}/games`, { params });
  }

  /**
   * Obtiene los juegos de la misma saga/franquicia (secuelas, precuelas, spin-offs)
   */
  getGameSeries(id: number | string, pageSize: number = 12): Observable<Game[]> {
    const params = new HttpParams()
      .set('key', this.apiKey)
      .set('page_size', pageSize.toString());
    return this.http
      .get<RawgResponse<Game>>(`${this.baseUrl}/games/${id}/game-series`, { params })
      .pipe(map(res => res.results));
  }

  /**
   * Obtiene DLCs y expansiones de un juego
   */
  getGameAdditions(id: number | string, pageSize: number = 8): Observable<Game[]> {
    const params = new HttpParams()
      .set('key', this.apiKey)
      .set('page_size', pageSize.toString());
    return this.http
      .get<RawgResponse<Game>>(`${this.baseUrl}/games/${id}/additions`, { params })
      .pipe(map(res => res.results));
  }

  /**
   * Obtiene la galería de capturas de pantalla de un juego
   */
  getGameScreenshots(id: number | string): Observable<string[]> {
    const params = new HttpParams().set('key', this.apiKey);
    return this.http
      .get<RawgResponse<GameScreenshot>>(`${this.baseUrl}/games/${id}/screenshots`, { params })
      .pipe(map(res => res.results.map(item => item.image)));
  }

  /**
   * Obtiene los logros canónicos / trofeos oficiales de un juego
   */
  getGameAchievements(id: number | string, pageSize: number = 24): Observable<GameAchievement[]> {
    const params = new HttpParams()
      .set('key', this.apiKey)
      .set('page_size', pageSize.toString());
    return this.http
      .get<RawgResponse<GameAchievement>>(`${this.baseUrl}/games/${id}/achievements`, { params })
      .pipe(map(res => res.results || []));
  }
}