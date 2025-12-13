import Dexie, { type EntityTable } from 'dexie';

/**
 * Configuración de Dexie DB para almacenamiento local IndexedDB
 * Utilizado para cache offline y mejora de rendimiento
 */

// Definición de tipos para las tablas
export interface CachedPost {
    id: string;
    clubId: string;
    content: string;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
    cachedAt: Date;
}

export interface CachedClub {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    memberCount: number;
    cachedAt: Date;
}

export interface CachedUser {
    id: string;
    email: string;
    username: string;
    avatarUrl?: string;
    cachedAt: Date;
}

export interface DraftPost {
    id: string;
    clubId: string;
    content: string;
    mediaUrls?: string[];
    createdAt: Date;
    updatedAt: Date;
}

// Inicialización de la base de datos
const db = new Dexie('SocialClubsDB') as Dexie & {
    cachedPosts: EntityTable<CachedPost, 'id'>;
    cachedClubs: EntityTable<CachedClub, 'id'>;
    cachedUsers: EntityTable<CachedUser, 'id'>;
    draftPosts: EntityTable<DraftPost, 'id'>;
};

// Definición del esquema de la base de datos
// Version 1: Esquema inicial
db.version(1).stores({
    cachedPosts: 'id, clubId, authorId, createdAt, cachedAt',
    cachedClubs: 'id, name, cachedAt',
    cachedUsers: 'id, email, username, cachedAt',
    draftPosts: 'id, clubId, createdAt, updatedAt',
});

/**
 * Limpia el cache antiguo (más de 7 días)
 */
export async function cleanOldCache(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    await Promise.all([
        db.cachedPosts.where('cachedAt').below(sevenDaysAgo).delete(),
        db.cachedClubs.where('cachedAt').below(sevenDaysAgo).delete(),
        db.cachedUsers.where('cachedAt').below(sevenDaysAgo).delete(),
    ]);
}

/**
 * Limpia todos los datos del cache
 */
export async function clearAllCache(): Promise<void> {
    await Promise.all([
        db.cachedPosts.clear(),
        db.cachedClubs.clear(),
        db.cachedUsers.clear(),
    ]);
}

/**
 * Obtiene el tamaño aproximado del cache en MB
 */
export async function getCacheSize(): Promise<number> {
    const [posts, clubs, users, drafts] = await Promise.all([
        db.cachedPosts.count(),
        db.cachedClubs.count(),
        db.cachedUsers.count(),
        db.draftPosts.count(),
    ]);

    // Estimación aproximada: ~1KB por post, ~500B por club/user, ~2KB por draft
    const estimatedBytes = posts * 1024 + clubs * 512 + users * 512 + drafts * 2048;
    return estimatedBytes / (1024 * 1024); // Convertir a MB
}

// Ejecutar limpieza automática al inicializar
if (typeof window !== 'undefined') {
    cleanOldCache().catch(console.error);
}

export { db };
