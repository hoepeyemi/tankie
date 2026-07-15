// Single source of truth for rank definitions — used by both client UI and server rank-up logic
export const RANKS = [
	{ name: 'Recruit',    min: 0,     color: '#94a3b8', icon: '🪖' },
	{ name: 'Private',    min: 100,   color: '#22c55e', icon: '⭐' },
	{ name: 'Corporal',   min: 500,   color: '#3b82f6', icon: '🔵' },
	{ name: 'Sergeant',   min: 1500,  color: '#8b5cf6', icon: '💜' },
	{ name: 'Lieutenant', min: 3500,  color: '#f59e0b', icon: '🌟' },
	{ name: 'Captain',    min: 7500,  color: '#f97316', icon: '🔥' },
	{ name: 'Colonel',    min: 15000, color: '#ef4444', icon: '💥' },
	{ name: 'General',    min: 30000, color: '#fbbf24', icon: '👑' },
] as const;

export const RANK_THRESHOLDS = RANKS.map(r => r.min);
export const RANK_NAMES = RANKS.map(r => r.name);

export function getRankIndex(xp: number): number {
	return RANK_THRESHOLDS.filter(t => t <= xp).length - 1;
}

export function getRank(xp: number) {
	const idx = getRankIndex(xp);
	const rank = RANKS[idx];
	const next = RANKS[idx + 1] as typeof RANKS[number] | undefined;
	const pct = next
		? Math.min(100, Math.round(((xp - rank.min) / (next.min - rank.min)) * 100))
		: 100;
	return { ...rank, next, pct, idx };
}
