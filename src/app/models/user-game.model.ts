export type GameStatus = 'playing' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_play';

export interface UserGame {
    id?: string;
    user_id?: string;
    game_id: number;
    game_title: string;
    game_cover?: string;
    status: GameStatus;
    user_rating?: number | null;
    created_at?: string;
    updated_at?: string;
}

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
    playing: 'Jugando',
    completed: 'Completado',
    on_hold: 'En Espera',
    dropped: 'Abandonado',
    plan_to_play: 'Por Jugar'
};