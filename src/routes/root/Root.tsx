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
			<div className='mx-auto flex flex-col items-center px-6 py-8 md:h-screen lg:py-0'>
				<div className='w-full rounded-lg bg-white/90 shadow backdrop-blur dark:border dark:border-gray-700 dark:bg-gray-800/90 sm:max-w-2xl xl:p-0' style={{ marginTop: '25vh' }}>
					{
						showMenu ? <PlayerInfosSelection />
							: status === NetworkStatus.Connected ? <Connected /> : <Register />
					}
				</div>

				{/* Global Top Header */}
				<div className='fixed top-4 left-0 right-0 px-6 flex justify-between items-start z-50 pointer-events-none'>

					{/* Top Left Menu */}
					<div className='pointer-events-auto -ml-12 -mt-16 scale-90 origin-top-left'>
						<Logo />
					</div>

					{/* Top Right Menu */}
					<div className='pointer-events-auto flex flex-col items-end gap-2'>
						<UnifiedWalletButton />
						<Button
							size='small'
							onClick={() => {
								setShowCredits(true);
							}}>Controls</Button>
						<Credits isOpen={showCredits} onClose={() => {
							setShowCredits(false);
						}} />
					</div>

				</div>
			</div>
		</>
	);
}
