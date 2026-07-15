import React, { useEffect, useState } from 'react';
import { getDailyChallenge, type DailyChallenge } from '@/lib/devvit-bridge';

type ChallengeState = {
	challenge: DailyChallenge;
	progress: number;
	completed: boolean;
	streak: number;
};

export default function DailyChallengeCard() {
	const [state, setState] = useState<ChallengeState | null>(null);

	useEffect(() => {
		getDailyChallenge().then(r => r && setState(r)).catch(() => {});
	}, []);

	if (!state) return null;

	const { challenge, progress, completed, streak } = state;
	const pct = Math.min(100, Math.round((progress / challenge.target) * 100));

	return (
		<div style={{
			background: completed
				? 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.1))'
				: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.08))',
			border: `1px solid ${completed ? 'rgba(34,197,94,0.3)' : 'rgba(249,115,22,0.3)'}`,
			borderRadius: 12,
			padding: '12px 16px',
			marginBottom: 12,
		}}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
				<span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: completed ? '#4ade80' : '#fb923c' }}>
					🎯 Daily Challenge
				</span>
				{streak > 0 && (
					<span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700 }}>
						🔥 {streak} day streak
					</span>
				)}
			</div>

			<p style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 8, fontWeight: 500 }}>
				{challenge.description}
			</p>

			{/* Progress bar */}
			<div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
				<div style={{
					height: '100%',
					width: `${pct}%`,
					background: completed ? 'linear-gradient(90deg,#4ade80,#22c55e)' : 'linear-gradient(90deg,#f97316,#fb923c)',
					borderRadius: 999,
					transition: 'width 0.4s ease',
				}} />
			</div>

			<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
				<span>{progress} / {challenge.target}</span>
				{completed
					? <span style={{ color: '#4ade80', fontWeight: 700 }}>✓ +{challenge.bonusXp} XP earned!</span>
					: <span>+{challenge.bonusXp} XP bonus</span>
				}
			</div>
		</div>
	);
}
