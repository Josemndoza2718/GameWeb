import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Game, GameDetail, GameScreenshot, RawgResponse } from '../models/rawg.model';
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
   * Obtiene la galería de capturas de pantalla de un juego
   */
  getGameScreenshots(id: number | string): Observable<string[]> {
    const params = new HttpParams().set('key', this.apiKey);
    return this.http
      .get<RawgResponse<GameScreenshot>>(`${this.baseUrl}/games/${id}/screenshots`, { params })
      .pipe(map(res => res.results.map(item => item.image)));
  }
}