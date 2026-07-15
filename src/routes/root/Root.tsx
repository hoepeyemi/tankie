import React, { useEffect, useState } from 'react';
import Logo from '@/ui/Logo';
import Register from '@/routes/root/Register';
import { useAudio, useNetwork, usePlayerSettings } from '@/store/store';
import { NetworkStatus } from '@game/network/Network';
import Connected from '@/routes/root/Connected';
import Confetti from '@/ui/Confetti';
import SettingsMenu from '@/ui/SettingsMenu';
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
		timeoutRef.current = setTimeout(() => {
			setValue(false);
		}, timeout) as unknown as number;
	}, [timeout]);
	return [value, toggle] as const;
}

export default function Root() {
	const { status } = useNetwork();
	const [confetti, toggleConfetti] = useToggleTimeout(false, 2000);
	const audio = useAudio();
	const { showMenu } = usePlayerSettings();
	const [showCredits, setShowCredits] = useState(false);

	useEffect(() => {
		audio.play();
	}, []);

	useEffect(() => {
		if (status === NetworkStatus.Connected) {
			toggleConfetti();
		}
	}, [status]);

	return (
		<>
			<Confetti active={confetti} />
			{/* Full-viewport scrollable container */}
			<div style={{ minHeight: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 16px 24px' }}>
				<div className='w-full rounded-lg bg-white/90 shadow backdrop-blur dark:border dark:border-gray-700 dark:bg-gray-800/90' style={{ maxWidth: 600 }}>
					{
						showMenu ? <PlayerInfosSelection />
							: status === NetworkStatus.Connected ? <Connected /> : <Register />
					}
				</div>
			</div>

			{/* Top bar — username + controls */}
			<div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
				<UnifiedWalletButton />
				<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
					<Button size='small' onClick={() => setShowCredits(true)}>Controls</Button>
					<Credits isOpen={showCredits} onClose={() => setShowCredits(false)} />
				</div>
			</div>
		</>
	);
}
