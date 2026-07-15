import React, { useEffect, useState } from 'react';
import { useNetwork, usePlayerSettings } from '@/store/store';
import Button from '@/ui/Button';
import CodeInput from '@/ui/CodeInput';
import { getMyXp, getWagerInfo, joinWager } from '@/lib/devvit-bridge';
import { NetworkStatus } from '@game/network/Network';

type Mode = 'choose' | 'host' | 'join';

const QUICK_AMOUNTS = [50, 100, 250, 500];

export default function WagerTab() {
	const { hostGame, joinGame, status } = useNetwork();
	const settings = usePlayerSettings();
	const [mode, setMode] = useState<Mode>('choose');
	const [amount, setAmount] = useState(50);
	const [code, setCode] = useState('');
	const [myXp, setMyXp] = useState<number | null>(null);
	const [wagerInfo, setWagerInfo] = useState<{ host: string; amount: number } | null>(null);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		getMyXp().then(setMyXp).catch(() => setMyXp(0));
	}, []);

	const handleHost = async () => {
		setError('');
		setBusy(true);
		try {
			await hostGame({ name: settings.name, tank: settings.tank, wagerAmount: amount });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error creating wager');
			setBusy(false);
		}
	};

	const handleJoinLookup = async () => {
		setError('');
		if (code.length !== 6) return;
		const info = await getWagerInfo(code);
		if (!info) { setError('Wager match not found.'); return; }
		if (info.status !== 'waiting') { setError('This wager match has already started or ended.'); return; }
		setWagerInfo({ host: info.host, amount: info.amount });
	};

	const handleJoin = async () => {
		setError('');
		setBusy(true);
		try {
			const wagerRes = await joinWager(code);
			if (!wagerRes.ok) { setError(wagerRes.error ?? 'Failed to join wager'); setBusy(false); return; }
			if (wagerRes.challengerXp !== undefined) setMyXp(wagerRes.challengerXp);
			await joinGame(code, { name: settings.name, tank: settings.tank }, wagerRes.amount);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error joining wager');
			setBusy(false);
		}
	};

	const back = (resetWager = false) => {
		setMode('choose');
		setError('');
		if (resetWager) { setWagerInfo(null); setCode(''); }
	};

	const xpBalance = myXp !== null ? (
		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
			background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
			borderRadius: 10, padding: '8px 14px', marginBottom: 2 }}>
			<span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your XP</span>
			<span style={{ fontSize: '1rem', fontWeight: 900, color: '#fbbf24', fontVariantNumeric: 'tabular-nums' }}>
				{myXp.toLocaleString()}
			</span>
		</div>
	) : null;

	if (mode === 'host') {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
				<button onClick={() => back()} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>
					← Back
				</button>
				{xpBalance}

				{/* Amount selector */}
				<div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '14px 16px' }}>
					<div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
						XP to Wager
					</div>

					{/* Quick-pick chips */}
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
						{QUICK_AMOUNTS.map(v => (
							<button
								key={v}
								onClick={() => setAmount(v)}
								style={{
									padding: '8px 4px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
									cursor: 'pointer', transition: 'all 0.15s',
									background: amount === v ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.04)',
									border: `1px solid ${amount === v ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.08)'}`,
									color: amount === v ? '#f97316' : '#94a3b8',
								}}
							>
								{v}
							</button>
						))}
					</div>

					{/* Custom amount input */}
					<div style={{ position: 'relative' }}>
						<input
							type='number'
							min={10}
							max={myXp ?? 5000}
							value={amount}
							onChange={e => setAmount(Math.max(10, Math.min(myXp ?? 5000, Number(e.target.value) || 10)))}
							style={{
								width: '100%', boxSizing: 'border-box',
								background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)',
								borderRadius: 8, padding: '10px 12px',
								color: '#fff', fontSize: '1.1rem', fontWeight: 900, textAlign: 'center',
								outline: 'none',
							}}
						/>
					</div>

					<div style={{ marginTop: 8, textAlign: 'center', fontSize: '0.68rem', color: '#64748b' }}>
						Winner receives <span style={{ color: '#f97316', fontWeight: 700 }}>{(amount * 2).toLocaleString()} XP</span>
					</div>
				</div>

				{error && <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#f87171' }}>{error}</div>}

				<Button
					onClick={handleHost}
					loading={busy || status === NetworkStatus.Connecting}
					disabled={!myXp || amount > myXp || amount < 10}
					fullWidth
					size='large'
				>
					Create Wager Lobby
				</Button>
			</div>
		);
	}

	if (mode === 'join') {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
				<button onClick={() => back(true)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>
					← Back
				</button>
				{xpBalance}

				<div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '14px 16px' }}>
					<div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
						Enter Game Code
					</div>
					<CodeInput value={code} onChange={v => { setCode(v); setWagerInfo(null); setError(''); }} length={6} className='mb-2' />
				</div>

				{!wagerInfo && (
					<Button onClick={handleJoinLookup} disabled={code.length !== 6} fullWidth size='large'>
						Look Up Match
					</Button>
				)}

				{wagerInfo && (
					<div style={{
						background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
						borderRadius: 12, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8,
					}}>
						<div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
							Hosted by <span style={{ color: '#fff', fontWeight: 700 }}>u/{wagerInfo.host}</span>
						</div>
						<div style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, color: '#fbbf24', fontVariantNumeric: 'tabular-nums' }}>
							{wagerInfo.amount.toLocaleString()} XP
						</div>
						<div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#64748b' }}>
							Winner takes <span style={{ color: '#f97316' }}>{(wagerInfo.amount * 2).toLocaleString()} XP</span>
						</div>
						{myXp !== null && myXp < wagerInfo.amount && (
							<div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#f87171', fontWeight: 600 }}>
								Not enough XP (need {wagerInfo.amount.toLocaleString()})
							</div>
						)}
						<Button
							onClick={handleJoin}
							loading={busy || status === NetworkStatus.Connecting}
							disabled={myXp !== null && myXp < wagerInfo.amount}
							fullWidth
							size='large'
						>
							Accept &amp; Join
						</Button>
					</div>
				)}

				{error && <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#f87171' }}>{error}</div>}
			</div>
		);
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
			{xpBalance}

			<div style={{
				background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.06))',
				border: '1px solid rgba(251,191,36,0.2)',
				borderRadius: 12, padding: '14px 16px', textAlign: 'center',
			}}>
				<div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24', marginBottom: 4 }}>⚔️ XP Wager</div>
				<div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.6 }}>
					Challenge another player to a duel.<br />Winner takes both XP stakes. Loser walks away empty.
				</div>
			</div>

			<div
				onClick={() => setMode('host')}
				style={{
					background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)',
					borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
					display: 'flex', justifyContent: 'space-between', alignItems: 'center',
				}}
			>
				<div>
					<div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>🎮 Host Wager Match</div>
					<div style={{ fontSize: '0.72rem', color: '#64748b' }}>Set the stakes · get a code · invite your rival</div>
				</div>
				<span style={{ color: '#f97316', fontSize: '1.2rem' }}>›</span>
			</div>

			<div
				onClick={() => setMode('join')}
				style={{
					background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)',
					borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
					display: 'flex', justifyContent: 'space-between', alignItems: 'center',
				}}
			>
				<div>
					<div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>🔗 Join Wager Match</div>
					<div style={{ fontSize: '0.72rem', color: '#64748b' }}>Enter the code your opponent shared</div>
				</div>
				<span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>›</span>
			</div>
		</div>
	);
}
