export type PostType = 'review' | 'question' | 'advice' | 'discussion';

export interface PostAuthor {
    username: string;
    avatar_url?: string;
}

export interface Post {
    id?: string;
    user_id?: string;
    game_id: number;
    game_title: string;
    game_cover?: string;
    post_type: PostType;
    title: string;
    content: string;
    score?: number | null; // Calificación 1-10 (para tipo 'review')
    created_at?: string;
    profiles?: PostAuthor; // Join relacional con la tabla profiles
}

export const POST_TYPE_LABELS: Record<PostType, { label: string; severity: 'success' | 'info' | 'warn' | 'secondary' }> = {
    review: { label: 'Reseña', severity: 'success' },
    question: { label: 'Pregunta / Duda', severity: 'warn' },
    advice: { label: 'Consejo / Guía', severity: 'info' },
    discussion: { label: 'Debate', severity: 'secondary' }
};