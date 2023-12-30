export const omit = <T extends Record<string, unknown>>(keys: string[], obj: T): T => {
    const result = { ...obj };

    keys.forEach(key => {
        delete result[key];
    });

    return result;
}