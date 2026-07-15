import React, { useEffect, useState } from 'react';
import { useNetwork, usePlayerSettings } from '@/store/store';
import Button from '@/ui/Button';
import CodeInput from '@/ui/CodeInput';
import { NetworkStatus } from '@game/network/Network';
import { getLeaderboard } from '@/lib/devvit-bridge';

export default function MultiplayerTab() {
	const { status, hostGame, joinGame } = useNetwork();
	const { name, tank } = usePlayerSettings();
	const [mode, setMode] = useState<'choose' | 'host' | 'join'>('choose');
	const [code, setCode] = useState('');
	const [rankedCount, setRankedCount] = useState<number | null>(null);

	useEffect(() => {
		getLeaderboard()
			.then(entries => setRankedCount(entries.filter(e => e.xp > 0).length))
			.catch(() => {});
	}, []);

	if (mode === 'host') {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
				<button
					onClick={() => setMode('choose')}
					style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
				>
					← Back
				</button>
				<div style={{
					background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.06))',
					border: '1px solid rgba(249,115,22,0.25)',
					borderRadius: 12, padding: '16px',
				}}>
					<div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
						Host a Game
					</div>
					<div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 14 }}>
						A 6-digit code will be shared with your opponent. You start when they join.
					</div>
					<Button
						onClick={() => void hostGame({ name, tank })}
						loading={status === NetworkStatus.Connecting}
						fullWidth
						size='large'
					>
						Create Lobby
					</Button>
				</div>
			</div>
		);
	}

	if (mode === 'join') {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
				<button
					onClick={() => setMode('choose')}
					style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
				>
					← Back
				</button>
				<div style={{
					background: 'rgba(255,255,255,0.03)',
					border: '1px solid rgba(255,255,255,0.09)',
					borderRadius: 12, padding: '16px',
				}}>
					<div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
						Join a Game
					</div>
					<div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 14 }}>
						Enter the 6-digit code your opponent shared with you.
					</div>
					<CodeInput value={code} onChange={setCode} length={6} className='mb-5' />
					<div style={{ marginTop: 14 }}>
						<Button
							onClick={() => void joinGame(code, { name, tank })}
							loading={status === NetworkStatus.Connecting}
							disabled={code.length !== 6}
							fullWidth
							size='large'
						>
							Join Game
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

			{/* Community stat */}
			{rankedCount !== null && rankedCount > 0 && (
				<div style={{
					display: 'flex', alignItems: 'center', gap: 8,
					background: 'rgba(255,255,255,0.03)',
					border: '1px solid rgba(255,255,255,0.07)',
					borderRadius: 10, padding: '8px 14px',
				}}>
					<span style={{ fontSize: 16 }}>🌍</span>
					<span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
						<b style={{ color: '#f97316' }}>{rankedCount}</b> players ranked in this community
					</span>
				</div>
			)}

			{/* Host card */}
			<div
				onClick={() => setMode('host')}
				style={{
					background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.06))',
					border: '1px solid rgba(249,115,22,0.25)',
					borderRadius: 12, padding: '16px',
					cursor: 'pointer',
					transition: 'border-color 0.15s',
				}}
			>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div>
						<div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
							🎮 Host a Game
						</div>
						<div style={{ fontSize: '0.72rem', color: '#64748b' }}>
							Get a code · invite a friend · battle 1v1
						</div>
					</div>
					<span style={{ color: '#f97316', fontSize: '1.2rem' }}>›</span>
				</div>
			</div>

			{/* Join card */}
			<div
				onClick={() => setMode('join')}
				style={{
					background: 'rgba(255,255,255,0.03)',
					border: '1px solid rgba(255,255,255,0.09)',
					borderRadius: 12, padding: '16px',
					cursor: 'pointer',
				}}
			>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div>
						<div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
							🔗 Join a Game
						</div>
						<div style={{ fontSize: '0.72rem', color: '#64748b' }}>
							Enter a 6-digit code to join your opponent
						</div>
					</div>
					<span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>›</span>
				</div>
			</div>

			{/* How it works */}
			<div style={{
				display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
				gap: 8, textAlign: 'center',
			}}>
				{[
					{ step: '1', label: 'Host creates a lobby' },
					{ step: '2', label: 'Share the code' },
					{ step: '3', label: 'Battle starts' },
				].map(item => (
					<div key={item.step} style={{
						background: 'rgba(255,255,255,0.02)',
						border: '1px solid rgba(255,255,255,0.06)',
						borderRadius: 10, padding: '10px 6px',
					}}>
						<div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f97316', marginBottom: 4 }}>{item.step}</div>
						<div style={{ fontSize: '0.6rem', color: '#64748b', lineHeight: 1.4 }}>{item.label}</div>
					</div>
				))}
			</div>
		</div>
	);
}
