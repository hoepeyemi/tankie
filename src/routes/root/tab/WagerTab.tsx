import React, { useEffect, useState } from 'react';
import { useNetwork, usePlayerSettings } from '@/store/store';
import Button from '@/ui/Button';
import CodeInput from '@/ui/CodeInput';
import {
	cancelWager,
	createWager,
	getMyXp,
	getWagerInfo,
	joinWager,
} from '@/lib/devvit-bridge';
import { NetworkStatus } from '@game/network/Network';

type Mode = 'choose' | 'host' | 'join';

export default function WagerTab() {
	const { hostGame, joinGame, status } = useNetwork();
	const { name, tank } = usePlayerSettings();
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
			// Pass wagerAmount into hostGame so it's stored in the network store
			// createWager is called from Connected component when it detects wagerAmount > 0
			await hostGame({ name, tank, wagerAmount: amount });
			// After this, Root.tsx switches to Connected — store carries the wagerAmount
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
			await joinGame(code, { name, tank });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error joining wager');
			setBusy(false);
		}
	};

	if (mode === 'choose') {
		return (
			<div className='space-y-4'>
				<h2 className='text-center text-xl font-bold text-gray-900 dark:text-white'>XP Wager</h2>
				{myXp !== null && (
					<p className='text-center text-sm text-gray-400'>
						Your XP: <span className='font-bold text-yellow-400'>{myXp.toLocaleString()}</span>
					</p>
				)}
				<p className='text-center text-sm text-gray-500 dark:text-gray-400'>
					Winner takes all — stake XP and battle for supremacy.
				</p>
				<Button onClick={() => setMode('host')} fullWidth size='large'>Host Wager Match</Button>
				<Button onClick={() => setMode('join')} fullWidth size='large'>Join Wager Match</Button>
			</div>
		);
	}

	if (mode === 'host') {
		return (
			<div className='space-y-4'>
				<button onClick={() => setMode('choose')} className='text-sm text-gray-400 hover:text-white'>← Back</button>
				<h2 className='text-center text-xl font-bold text-gray-900 dark:text-white'>Host Wager Match</h2>
				{myXp !== null && (
					<p className='text-center text-sm text-gray-400'>
						Your XP: <span className='font-bold text-yellow-400'>{myXp.toLocaleString()}</span>
					</p>
				)}
				<div className='space-y-2'>
					<label className='block text-sm font-medium text-gray-300'>XP to Wager</label>
					<input
						type='number'
						min={10}
						max={myXp ?? 5000}
						value={amount}
						onChange={e => setAmount(Math.max(10, Math.min(myXp ?? 5000, Number(e.target.value))))}
						className='w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-white text-center text-2xl font-bold focus:border-yellow-400 focus:outline-none'
					/>
					<div className='flex gap-2'>
						{[50, 100, 250, 500].map(v => (
							<button
								key={v}
								onClick={() => setAmount(v)}
								className='flex-1 rounded border border-gray-600 bg-gray-700 py-1 text-sm text-gray-300 hover:border-yellow-400 hover:text-yellow-400'
							>
								{v}
							</button>
						))}
					</div>
					<p className='text-center text-xs text-gray-500'>Winner receives {(amount * 2).toLocaleString()} XP</p>
				</div>
				{error && <p className='text-center text-sm text-red-400'>{error}</p>}
				<Button
					onClick={handleHost}
					loading={busy}
					disabled={!myXp || amount > myXp || amount < 10}
					fullWidth
					size='large'
				>
					Create Wager Lobby
				</Button>
			</div>
		);
	}

	// Join mode
	return (
		<div className='space-y-4'>
			<button onClick={() => { setMode('choose'); setWagerInfo(null); setCode(''); setError(''); }} className='text-sm text-gray-400 hover:text-white'>
				← Back
			</button>
			<h2 className='text-center text-xl font-bold text-gray-900 dark:text-white'>Join Wager Match</h2>
			{myXp !== null && (
				<p className='text-center text-sm text-gray-400'>
					Your XP: <span className='font-bold text-yellow-400'>{myXp.toLocaleString()}</span>
				</p>
			)}
			<CodeInput value={code} onChange={v => { setCode(v); setWagerInfo(null); setError(''); }} length={6} className='mb-2' />
			{!wagerInfo && (
				<Button onClick={handleJoinLookup} disabled={code.length !== 6} fullWidth size='large'>Look Up Match</Button>
			)}
			{wagerInfo && (
				<div className='rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 space-y-3'>
					<p className='text-center text-sm text-gray-300'>
						Hosted by <span className='font-bold text-white'>u/{wagerInfo.host}</span>
					</p>
					<p className='text-center text-2xl font-black text-yellow-400'>{wagerInfo.amount.toLocaleString()} XP</p>
					<p className='text-center text-xs text-gray-400'>Winner takes {(wagerInfo.amount * 2).toLocaleString()} XP</p>
					{myXp !== null && myXp < wagerInfo.amount && (
						<p className='text-center text-sm text-red-400'>Not enough XP (need {wagerInfo.amount.toLocaleString()})</p>
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
			{error && <p className='text-center text-sm text-red-400'>{error}</p>}
		</div>
	);
}
