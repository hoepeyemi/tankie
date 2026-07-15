import React, { useEffect, useState } from 'react';
import TankModel from '@/ui/TankModel';
import { Canvas } from '@react-three/fiber';
import { type TankType, TankTypeList } from '@game/models/TankType';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayerSettings } from '@/store/store';
import Button from '@/ui/Button';
import { getOwnedSkins, purchaseSkin } from '@/lib/devvit-bridge';
import { useRedditUser } from '@/contexts/RedditContext';


export default function SkinsTab() {
	const { name, tank, setTank } = usePlayerSettings();
	const { isLoggedIn } = useRedditUser();
	const [index, setIndex] = useState(TankTypeList.findIndex(t => t.key === tank));
	const [direction, setDirection] = useState(1);
	const [ownedSkins, setOwnedSkins] = useState<Set<string>>(new Set(['default']));
	const [loading, setLoading] = useState(true);
	const [txStatus, setTxStatus] = useState('');

	const currentTank = TankTypeList[index];

	useEffect(() => {
		getOwnedSkins()
			.then(skins => setOwnedSkins(new Set(['default', ...skins])))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	const isOwned = !currentTank.value.premium || ownedSkins.has(currentTank.key);

	useEffect(() => {
		if (isOwned) setTank(currentTank.key);
	}, [index, isOwned]);

	const nextTank = () => {
		setIndex((index + 1) % TankTypeList.length);
		setDirection(-1);
		setTxStatus('');
	};

	const prevTank = () => {
		setIndex((index - 1 + TankTypeList.length) % TankTypeList.length);
		setDirection(1);
		setTxStatus('');
	};

	const handleBuySkin = async () => {
		if (!isLoggedIn) {
			setTxStatus('You must be logged into Reddit to unlock skins.');
			return;
		}

		setTxStatus('Opening Reddit Gold purchase...');
		try {
			const success = await purchaseSkin(currentTank.key);
			if (success) {
				setOwnedSkins(prev => new Set([...prev, currentTank.key]));
				setTank(currentTank.key);
				setTxStatus('Skin unlocked!');
				setTimeout(() => setTxStatus(''), 3000);
			} else {
				setTxStatus('Purchase cancelled.');
				setTimeout(() => setTxStatus(''), 2000);
			}
		} catch {
			setTxStatus('Purchase failed. Try again.');
		}
	};

	return (
		<div className='space-y-4'>
			<h2 className='text-center text-xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2'>
				Garage
			</h2>
			<div className='bg-gradient-radial relative overflow-hidden rounded border border-gray-100/90 from-slate-900/80 to-gray-900/30 dark:border-gray-700/90'>
				<motion.img
					key={currentTank.key}
					initial={{ opacity: 0 }}
					animate={{ opacity: 0.5 }}
					transition={{ duration: 0.25 }}
					className='absolute inset-0 -z-10 h-full w-full object-cover object-[center_20%] opacity-50 blur-[1px]'
					src={currentTank.value.backdrop}
				/>

				{/* Single persistent Canvas — avoids WebGL context exhaustion */}
				<Canvas camera={{ fov: 35, zoom: 1.5 }}>
					<TankModel type={currentTank.key} />
				</Canvas>

				{!isOwned && !loading && currentTank.value.premium && (
					<div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
						<svg className='w-16 h-16 text-white drop-shadow-2xl opacity-80' fill='currentColor' viewBox='0 0 20 20'>
							<path fillRule='evenodd' d='M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z' clipRule='evenodd' />
						</svg>
					</div>
				)}

				<div className='flex flex-row items-center justify-between border border-gray-300 bg-white/70 leading-tight text-gray-500 shadow dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-400'>
					<span className='block cursor-pointer px-3 py-2 leading-tight text-gray-500 hover:bg-gray-100/90 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/90 dark:hover:text-white' onClick={prevTank}>
						<svg aria-hidden='true' className='h-5 w-5' fill='currentColor' viewBox='0 0 20 20'>
							<path fillRule='evenodd' d='M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z' clipRule='evenodd' />
						</svg>
					</span>

					<div className='flex flex-col items-center'>
						<h4 className='text-center font-bold flex items-center gap-2 leading-tight tracking-tight text-gray-900 dark:text-white'>
							{currentTank.value.name}
							{currentTank.value.premium && (
								<span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${isOwned ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
									{isOwned ? 'Owned' : 'Premium'}
								</span>
							)}
						</h4>
					</div>

					<span className='block cursor-pointer px-3 py-2 leading-tight text-gray-500 hover:bg-gray-100/90 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/90 dark:hover:text-white' onClick={nextTank}>
						<svg aria-hidden='true' className='h-5 w-5' fill='currentColor' viewBox='0 0 20 20'>
							<path fillRule='evenodd' d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z' clipRule='evenodd' />
						</svg>
					</span>
				</div>
			</div>

			{txStatus && <div className='text-center text-sm text-yellow-500 animate-pulse'>{txStatus}</div>}

			{loading ? (
				<p className='text-center text-sm text-gray-400 animate-pulse'>Checking your garage...</p>
			) : isOwned ? (
				<p className='text-center text-sm text-green-400'>Selection auto-saved. Ready for battle!</p>
			) : (
				<Button fullWidth size='large' onClick={handleBuySkin}>
					{currentTank.value.premium
						? `Unlock for ${currentTank.value.price ?? 25} Reddit Gold`
						: 'Select Tank'}
				</Button>
			)}
		</div>
	);
}
