/**
 * Genera un email único para usuario guest
 * Formato: guest_<randomId>@temp.socialclubs.com
 */
export function generateGuestEmail(): string {
    const randomId = Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
    return `guest_${randomId}@temp.socialclubs.com`;
}

/**
 * Genera una contraseña aleatoria segura
 */
export function generateRandomPassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

/**
 * Genera datos fake para el perfil guest
 * Nombres creativos y usernames únicos
 */
export function generateFakeProfileData() {
    const adjectives = ['Happy', 'Creative', 'Curious', 'Friendly', 'Cool', 'Smart', 'Bold', 'Brave'];
    const nouns = ['Explorer', 'Visitor', 'Guest', 'Traveler', 'Wanderer', 'Observer'];

    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 9999);

    return {
        name: `${randomAdjective} ${randomNoun}`,
        username: `guest_${randomNumber}_${Date.now().toString(36)}`,
        bio: 'Exploring SocialClubs as a guest 🌟',
    };
}
