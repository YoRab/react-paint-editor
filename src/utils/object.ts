export const omit = <T extends Record<string, unknown>>(keys: string[], obj: T): T => {
    const result = { ...obj };

    keys.forEach(key => {
        delete result[key];
    });

    return result;
}

export const set = <T extends Record<string, any> | unknown[]>(
    path: string | number | (string | number)[],
    value: unknown,
    obj: T,
): T => {
    const result = (Array.isArray(obj) ? [...obj] : { ...obj }) as T;
    const chunks = Array.isArray(path) ? path : typeof path === 'string' ? path.split('.') : [path];
    chunks.reduce<Record<string, any>>((acc, chunk, index) => {
        acc[chunk] ??= {};
        if (index === chunks.length - 1) acc[chunk] = value;
        return acc[chunk];
    }, result);
    return result
};