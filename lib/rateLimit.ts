const rateMap = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(
	key: string,
	limit = 5,
	windowMs = 60_000,
): boolean {
	const now = Date.now();
	const entry = rateMap.get(key);

	if (!entry || now > entry.reset) {
		rateMap.set(key, { count: 1, reset: now + windowMs });
		return true;
	}

	if (entry.count >= limit) {
		return false;
	}

	entry.count += 1;
	return true;
}
