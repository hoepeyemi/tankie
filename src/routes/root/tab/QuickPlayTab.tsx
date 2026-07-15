import React, { useEffect, useState } from 'react';
import { useNetwork, usePlayerSettings } from '@/store/store';
import { getMyXp } from '@/lib/devvit-bridge';
import Button from '@/ui/Button';
import { NetworkStatus } from '@game/network/Network';
import { getRank } from '@/shared/ranks';
import { useNavigate } from 'react-router-dom';

export default function QuickPlayTab() {
	const { quickPlay, status } = useNetwork();
	const { name, tank } = usePlayerSettings();
	const [xp, setXp] = useState<number | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		getMyXp().then(v => setXp(typeof v === 'number' ? v : null)).catch(() => {});
	}, []);

	const rank = xp !== null ? getRank(xp) : null;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

			{/* Rank card */}
			{rank && (
				<div style={{
					background: 'rgba(255,255,255,0.04)',
					border: `1px solid ${rank.color}30`,
					borderRadius: 12, padding: '12px 14px',
				}}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<span style={{ fontSize: 22 }}>{rank.icon}</span>
							<div>
								<div style={{ fontSize: '0.75rem', color: rank.color, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
									{rank.name}
								</div>
								<div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
									u/{name}
								</div>
							</div>
						</div>
						<div style={{ textAlign: 'right' }}>
							<div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f97316', fontVariantNumeric: 'tabular-nums' }}>
								{xp!.toLocaleString()}
							</div>
							<div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>XP</div>
						</div>
					</div>
					{rank.next && (
						<>
							<div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
								<div style={{
									height: '100%', width: `${rank.pct}%`,
									background: `linear-gradient(90deg, ${rank.color}, ${rank.next.color})`,
									borderRadius: 99, transition: 'width 0.5s ease',
								}} />
							</div>
							<div style={{ marginTop: 4, fontSize: '0.6rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
								<span>{rank.pct}% to {rank.next.name}</span>
								<span>{rank.next.min - xp!} XP needed</span>
							</div>
						</>
					)}
					{!rank.next && (
						<div style={{ marginTop: 6, fontSize: '0.7rem', color: '#fbbf24', fontWeight: 700, textAlign: 'center' }}>
							👑 MAX RANK — You are a legend.
						</div>
					)}
				</div>
			)}

			{/* CTA */}
			<div style={{
				background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.06))',
				border: '1px solid rgba(249,115,22,0.2)',
				borderRadius: 12, padding: '14px',
				textAlign: 'center',
			}}>
				<div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
					Quick Play — Jump straight in
				</div>
				<div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 12 }}>
					Match starts instantly · earn XP · climb the ranks
				</div>
				<Button
					onClick={async () => {
						await quickPlay({ name, tank });
						navigate('/game');
					}}
					loading={status === NetworkStatus.Connecting}
					fullWidth
					size='large'
				>
					⚡ Play Now
				</Button>
			</div>

			{/* How XP works */}
			<div style={{
				display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
				gap: 8, textAlign: 'center',
			}}>
				{[
					{ icon: '💥', label: 'Kill', xp: '+25 XP' },
					{ icon: '🏆', label: 'Win', xp: '+100 XP' },
					{ icon: '⚔️', label: 'Wager win', xp: '2× XP' },
				].map(item => (
					<div key={item.label} style={{
						background: 'rgba(255,255,255,0.03)',
						border: '1px solid rgba(255,255,255,0.07)',
						borderRadius: 10, padding: '8px 4px',
					}}>
						<div style={{ fontSize: 18, marginBottom: 2 }}>{item.icon}</div>
						<div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
						<div style={{ fontSize: '0.75rem', color: '#f97316', fontWeight: 800 }}>{item.xp}</div>
					</div>
				))}
			</div>
		</div>
	);
}
