import React, { useEffect, useRef, useState } from 'react';
import Button from '@/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useNetwork } from '@/store/store';
import { TankTypes } from '@game/models/TankType';
import { createWager, cancelWager } from '@/lib/devvit-bridge';

export default function Connected() {
	const navigate = useNavigate();
	const { code, peers, maxNbPlayers, wagerAmount, network } = useNetwork();
	const wagerCreated = useRef(false);
	const [wagerError, setWagerError] = useState('');

	// Create the wager reservation as soon as the Connected screen mounts for a wager lobby
	useEffect(() => {
		if (!wagerAmount || !code || wagerCreated.current) return;
		wagerCreated.current = true;
		createWager(code, wagerAmount).then(res => {
			if (!res.ok) setWagerError(res.error ?? 'Failed to reserve XP for wager');
		}).catch(() => setWagerError('Failed to create wager'));
	}, []);

	const [copied, setCopied] = useState(false);
	const handleCopy = () => {
		if (code) {
			void navigator.clipboard.writeText(code).then(() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			});
		}
	};

	const handleBack = () => {
		if (wagerAmount > 0 && code) cancelWager(code).catch(() => {});
		network?.disconnect();
		navigate(-1 as any);
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px' }}>

			{/* Back button */}
			<button
				onClick={handleBack}
				style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
			>
				← Back
			</button>

			{/* Room code — tap to copy */}
			<div style={{ textAlign: 'center' }}>
				<div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
					Room Code — tap to copy &amp; share
				</div>
				<button
					onClick={handleCopy}
					style={{
						display: 'inline-flex', alignItems: 'center', gap: 8,
						background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
						border: copied ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(255,255,255,0.15)',
						borderRadius: 10, padding: '8px 18px', cursor: 'pointer',
						fontSize: '1.8rem', fontWeight: 900, letterSpacing: '0.18em',
						color: copied ? '#4ade80' : '#f97316',
						fontFamily: 'monospace', transition: 'all 0.2s',
					}}
				>
					{code}
					{copied
						? <span style={{ fontSize: '0.75rem', fontFamily: 'system-ui', letterSpacing: 0, color: '#4ade80' }}>Copied!</span>
						: <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' style={{ color: '#64748b', flexShrink: 0 }}>
							<path fill='currentColor' d='M14 22H4a1.934 1.934 0 0 1-2-2V10a1.934 1.934 0 0 1 2-2h4V4a1.934 1.934 0 0 1 2-2h10a1.934 1.934 0 0 1 2 2v10a1.935 1.935 0 0 1-2 2h-4v4a1.935 1.935 0 0 1-2 2ZM4 10v10h10v-4h-4a1.935 1.935 0 0 1-2-2v-4H4Zm6-6v10h10V4H10Z'/>
						</svg>
					}
				</button>
				<p style={{ fontSize: '0.6rem', color: '#475569', marginTop: 6 }}>Share this code with your opponent in the comments or a DM</p>
			</div>

			{/* Wager banner */}
			{wagerAmount > 0 && (
				<div style={{
					background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)',
					borderRadius: 10, padding: '10px 14px', textAlign: 'center',
				}}>
					<span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24' }}>⚔️ Wager: {wagerAmount.toLocaleString()} XP</span>
					<span style={{ marginLeft: 8, fontSize: '0.72rem', color: '#64748b' }}>— winner takes {(wagerAmount * 2).toLocaleString()} XP</span>
					{wagerError && <p style={{ marginTop: 4, fontSize: '0.72rem', color: '#f87171' }}>{wagerError}</p>}
				</div>
			)}

			{/* Player count */}
			<div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#64748b' }}>
				{peers.length} / {maxNbPlayers} players in lobby
			</div>

			{/* Peer cards */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
				{peers.map(peer => {
					const tankInfo = TankTypes[peer.metadata.tank] ?? TankTypes.heig;
					return (
						<div key={peer.uuid} style={{
							display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
							background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
							borderRadius: 10, padding: '12px 8px',
						}}>
							<img
								src={tankInfo.avatar}
								alt={tankInfo.name}
								style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 8 }}
							/>
							<span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e2e8f0', textAlign: 'center', wordBreak: 'break-word', maxWidth: '100%' }}>
								{peer.metadata.name}
							</span>
						</div>
					);
				})}
			</div>

			<Button onClick={() => navigate('/game')} fullWidth size='large'>Play</Button>

			{wagerAmount > 0 && (
				<p style={{ textAlign: 'center', fontSize: '0.68rem', color: '#64748b' }}>
					← Back cancels the wager and refunds your XP
				</p>
			)}
		</div>
	);
}
