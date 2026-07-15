import React, { useEffect, useState } from 'react';
import Register from '@/routes/root/Register';
import { useAudio, useNetwork, usePlayerSettings } from '@/store/store';
import { NetworkStatus } from '@game/network/Network';
import Connected from '@/routes/root/Connected';
import Confetti from '@/ui/Confetti';
import PlayerInfosSelection from '@/ui/PlayerInfosSelection';
import Credits from '@/ui/Credits';
import Button from '@/ui/Button';
import UnifiedWalletButton from '@/ui/UnifiedWalletButton';

function useToggleTimeout(initial: boolean, timeout: number) {
	const [value, setValue] = useState(initial);
	const timeoutRef = React.useRef<number>();
	const toggle = React.useCallback(() => {
		setValue(true);
		clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(() => setValue(false), timeout) as unknown as number;
	}, [timeout]);
	return [value, toggle] as const;
}

export default function Root() {
	const { status } = useNetwork();
	const [confetti, toggleConfetti] = useToggleTimeout(false, 2000);
	const audio = useAudio();
	const { showMenu } = usePlayerSettings();
	const [showCredits, setShowCredits] = useState(false);

	useEffect(() => { audio.play(); }, []);

	useEffect(() => {
		if (status === NetworkStatus.Connected) toggleConfetti();
	}, [status]);

	return (
		<>
			<Confetti active={confetti} />

			{/* Top bar */}
			<div style={{
				position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
				display: 'flex', justifyContent: 'space-between', alignItems: 'center',
				padding: '6px 12px',
				background: 'rgba(10,14,26,0.85)',
				backdropFilter: 'blur(10px)',
				borderBottom: '1px solid rgba(249,115,22,0.15)',
			}}>
				<UnifiedWalletButton />
				<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
					<Button size='small' onClick={() => setShowCredits(true)}>Controls</Button>
					<Credits isOpen={showCredits} onClose={() => setShowCredits(false)} />
				</div>
			</div>

			{/* Main scrollable layout */}
			<div style={{
				minHeight: '100vh', overflowY: 'auto', display: 'flex',
				flexDirection: 'column', alignItems: 'center',
				padding: '54px 12px 24px',
				background: 'linear-gradient(160deg, #0a0e1a 0%, #0f1628 60%, #0a0e1a 100%)',
			}}>
				<div style={{ width: '100%', maxWidth: 560 }}>
					{/* Game logo header */}
					<div style={{
						display: 'flex', alignItems: 'center', gap: 10,
						padding: '10px 0 12px',
					}}>
						<img
							src='/Blasttankslogo.png'
							alt='Tankies'
							style={{ width: 40, height: 40, borderRadius: 10, boxShadow: '0 0 16px rgba(249,115,22,0.5)', flexShrink: 0 }}
							onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
						/>
						<div>
							<div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f97316', letterSpacing: 2, lineHeight: 1 }}>
								TANKIES
							</div>
							<div style={{ fontSize: '0.6rem', color: '#64748b', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>
								Multiplayer Tank Battle
							</div>
						</div>
					</div>

					{/* Card */}
					<div style={{
						background: 'rgba(255,255,255,0.04)',
						border: '1px solid rgba(255,255,255,0.09)',
						borderRadius: 16,
						overflow: 'hidden',
					}}>
						{showMenu
							? <PlayerInfosSelection />
							: status === NetworkStatus.Connected
								? <Connected />
								: <Register />
						}
					</div>
				</div>
			</div>
		</>
	);
}
