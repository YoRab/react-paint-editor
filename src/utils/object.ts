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
}

const mergeCheckIsRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
}

export const mergeWith = (customMergeFn: (objValue: unknown, srcValue: unknown, key: string) => unknown, target: unknown, source: unknown): unknown => {
    if (!mergeCheckIsRecord(target) || !mergeCheckIsRecord(source)) {
        return source
    }

    const merged: Record<string, any> = { ...target };

    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (merged.hasOwnProperty(key)) {
                merged[key] = customMergeFn(merged[key], source[key], key) ?? mergeWith(customMergeFn, merged[key], source[key])
            } else {
                merged[key] = source[key];
            }
        }
    }

    return merged;
};
