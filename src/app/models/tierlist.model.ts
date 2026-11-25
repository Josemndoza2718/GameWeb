export interface TierGame {
    game_id: number;
    game_title: string;
    game_cover?: string;
}

export interface TierRow {
    tier: string;        // Nombre del nivel: 'S', 'A', 'B', 'C', 'D'
    color: string;       // Color en código Hex (#dc2626, #ea580c, etc.)
    description?: string; // Descripción corta del rango (ej. 'Obra Maestra')
    games: TierGame[];   // Elementos dentro del nivel
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
    { tier: 'S', color: '#dc2626', description: 'Obra Maestra', games: [] },
    { tier: 'A', color: '#ea580c', description: 'Excelente', games: [] },
    { tier: 'B', color: '#f59e0b', description: 'Destacado', games: [] },
    { tier: 'C', color: '#10b981', description: 'Bueno', games: [] },
    { tier: 'D', color: '#06b6d4', description: 'Prescindible', games: [] }
];