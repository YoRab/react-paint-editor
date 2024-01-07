const idCounter: Record<string, number> = {};

export const uniqueId = (prefix = '') => {
    if (!idCounter[prefix]) {
        idCounter[prefix] = 0;
    }

    const id = ++idCounter[prefix];

    return `${prefix}${id}`;
}