export interface TierGame {
    game_id: number;
    game_title: string;
    game_cover?: string;
}

export interface TierRow {
    tier: string;      // Nombre del nivel: 'S', 'A', 'B', 'C', 'D'
    color: string;     // Color en código Hex (#ff7f7f, #ffbf7f, etc.)
    games: TierGame[]; // Elementos dentro del nivel
}

export interface Tierlist {
    id?: string;
    user_id?: string;
    title: string;
    description?: string;
    is_public: boolean;
    rows_data: TierRow[];
    created_at?: string;
    updated_at?: string;
    profiles?: {
        username: string;
        avatar_url?: string;
    };
}

export const DEFAULT_TIER_ROWS: TierRow[] = [
    { tier: 'S', color: '#ff7f7f', games: [] },
    { tier: 'A', color: '#ffbf7f', games: [] },
    { tier: 'B', color: '#ffff7f', games: [] },
    { tier: 'C', color: '#7fff7f', games: [] },
    { tier: 'D', color: '#7fbfff', games: [] }
];