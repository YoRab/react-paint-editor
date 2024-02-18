export const compact = <T>(array: (T | undefined | null)[]): T[] => {
	return array.filter((item): item is T => item !== undefined && item !== null)
}
