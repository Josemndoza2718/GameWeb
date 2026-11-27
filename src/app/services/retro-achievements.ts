import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../env/environment';

export type RetroAchievementType = 'progression' | 'missable' | 'win_condition' | 'standard';

export interface RetroAchievementItem {
  id: number;
  title: string;
  description: string;
  points: number;
  type: RetroAchievementType;
  badgeUrl: string;
  percent: string;
  displayOrder: number;
}

export interface RetroGameAchievementsResult {
  raGameId: number;
  raTitle: string;
  consoleName: string;
  totalPoints: number;
  achievements: RetroAchievementItem[];
}

interface RAGameListItem {
  ID: number;
  Title: string;
  ConsoleID: number;
  NumAchievements: number;
  Points: number;
}

interface RAAchievementRaw {
  ID: number;
  Title: string;
  Description: string;
  Points: number;
  BadgeName: string;
  DisplayOrder: number;
  NumAwarded?: number;
  type?: string | null;
}

interface RAGameExtendedRaw {
  ID: number;
  Title: string;
  ConsoleName: string;
  NumDistinctPlayers?: number;
  Achievements?: Record<string, RAAchievementRaw>;
}

const PLATFORM_TO_CONSOLE_ID: { match: string; consoleId: number }[] = [
  { match: 'nintendo-64', consoleId: 2 },
  { match: 'n64', consoleId: 2 },
  { match: 'snes', consoleId: 3 },
  { match: 'super nintendo', consoleId: 3 },
  { match: 'nes', consoleId: 7 },
  { match: 'game-boy-advance', consoleId: 5 },
  { match: 'game boy advance', consoleId: 5 },
  { match: 'game-boy-color', consoleId: 6 },
  { match: 'game boy color', consoleId: 6 },
  { match: 'game-boy', consoleId: 4 },
  { match: 'game boy', consoleId: 4 },
  { match: 'nintendo-ds', consoleId: 18 },
  { match: 'nintendo ds', consoleId: 18 },
  { match: 'gamecube', consoleId: 16 },
  { match: 'playstation2', consoleId: 21 },
  { match: 'playstation 2', consoleId: 21 },
  { match: 'playstation1', consoleId: 12 },
  { match: 'playstation', consoleId: 12 },
  { match: 'psp', consoleId: 41 },
  { match: 'genesis', consoleId: 1 },
  { match: 'sega-genesis', consoleId: 1 },
  { match: 'mega drive', consoleId: 1 },
  { match: 'dreamcast', consoleId: 40 },
  { match: 'sega-saturn', consoleId: 39 },
  { match: 'saturn', consoleId: 39 },
  { match: 'master-system', consoleId: 11 },
  { match: 'game-gear', consoleId: 15 },
  { match: 'arcade', consoleId: 27 },
  { match: 'neo-geo', consoleId: 27 }
];

@Injectable({
  providedIn: 'root'
})
export class RetroAchievementsService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'https://retroachievements.org/API';
  private readonly apiKey = environment.retroAchievementsApiKey;
  private consoleGamesCache = new Map<number, RAGameListItem[]>();

  /**
   * Busca logros retro en RetroAchievements a partir del título y plataformas de RAWG
   */
  async findAndGetAchievements(
    gameTitle: string,
    rawgPlatformSlugsAndNames: string[]
  ): Promise<RetroGameAchievementsResult | null> {
    if (!this.apiKey || !gameTitle) return null;

    const consoleIds = this.resolveConsoleIds(rawgPlatformSlugsAndNames);
    if (consoleIds.length === 0) return null;

    const targetNorm = this.normalizeTitle(gameTitle);

    for (const consoleId of consoleIds.slice(0, 3)) {
      const list = await this.getConsoleGameList(consoleId);
      const match = this.findBestMatch(list, targetNorm);
      if (!match) continue;

      const extended = await this.getGameExtended(match.ID);
      if (!extended?.Achievements) continue;

      const rawAchievements = Object.values(extended.Achievements);
      if (rawAchievements.length === 0) continue;

      const totalPlayers = Math.max(1, extended.NumDistinctPlayers || 1);
      const achievements: RetroAchievementItem[] = rawAchievements
        .sort((a, b) => (a.DisplayOrder ?? 0) - (b.DisplayOrder ?? 0))
        .map(a => {
          const type: RetroAchievementType =
            a.type === 'progression' || a.type === 'missable' || a.type === 'win_condition'
              ? a.type
              : 'standard';
          const pct = a.NumAwarded ? ((a.NumAwarded / totalPlayers) * 100).toFixed(1) : '0.0';
          return {
            id: a.ID,
            title: a.Title,
            description: a.Description,
            points: a.Points || 0,
            type,
            badgeUrl: `https://media.retroachievements.org/Badge/${a.BadgeName}.png`,
            percent: pct,
            displayOrder: a.DisplayOrder ?? 0
          };
        });

      const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0);

      return {
        raGameId: extended.ID,
        raTitle: extended.Title,
        consoleName: extended.ConsoleName,
        totalPoints,
        achievements
      };
    }

    return null;
  }

  private resolveConsoleIds(platforms: string[]): number[] {
    const ids: number[] = [];
    const normalized = platforms.map(p => p.toLowerCase().trim());

    for (const plat of normalized) {
      for (const entry of PLATFORM_TO_CONSOLE_ID) {
        if (plat === entry.match || plat.includes(entry.match)) {
          if (!ids.includes(entry.consoleId)) {
            ids.push(entry.consoleId);
          }
          break;
        }
      }
    }
    return ids;
  }

  private async getConsoleGameList(consoleId: number): Promise<RAGameListItem[]> {
    const cached = this.consoleGamesCache.get(consoleId);
    if (cached) return cached;

    try {
      const params = new HttpParams()
        .set('y', this.apiKey)
        .set('i', consoleId.toString())
        .set('f', '1');
      const items = await firstValueFrom(
        this.http.get<RAGameListItem[]>(`${this.baseUrl}/API_GetGameList.php`, { params })
      );
      const safeItems = Array.isArray(items) ? items : [];
      this.consoleGamesCache.set(consoleId, safeItems);
      return safeItems;
    } catch {
      return [];
    }
  }

  private async getGameExtended(gameId: number): Promise<RAGameExtendedRaw | null> {
    try {
      const params = new HttpParams()
        .set('y', this.apiKey)
        .set('i', gameId.toString());
      return await firstValueFrom(
        this.http.get<RAGameExtendedRaw>(`${this.baseUrl}/API_GetGameExtended.php`, { params })
      );
    } catch {
      return null;
    }
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/\(\d{4}\)/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private findBestMatch(list: RAGameListItem[], targetNorm: string): RAGameListItem | null {
    const official = list.filter(item => !item.Title.startsWith('~'));
    const exact = official.find(item => this.normalizeTitle(item.Title) === targetNorm);
    if (exact) return exact;

    const startsWith = official.find(item => {
      const norm = this.normalizeTitle(item.Title);
      return norm.startsWith(targetNorm) || targetNorm.startsWith(norm);
    });
    if (startsWith) return startsWith;

    const includes = official.find(item => this.normalizeTitle(item.Title).includes(targetNorm));
    return includes || null;
  }
}
