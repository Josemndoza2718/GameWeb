export interface RawgResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface PlatformInfo {
    platform: {
        id: number;
        name: string;
        slug: string;
    };
}

export interface Genre {
    id: number;
    name: string;
    slug: string;
}

export interface Game {
    id: number;
    slug: string;
    name: string;
    released: string;
    background_image: string;
    rating: number;
    ratings_count: number;
    platforms?: PlatformInfo[];
    genres?: Genre[];
}

export interface GameDetail extends Game {
    description_raw: string;
    website: string;
    metacritic: number;
    developers: { id: number; name: string }[];
    publishers: { id: number; name: string }[];
}

export interface GameScreenshot {
    id: number;
    image: string;
    width: number;
    height: number;
}