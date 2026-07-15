import React, { useEffect, useState } from 'react';
import TankModel from '@/ui/TankModel';
import { Canvas } from '@react-three/fiber';
import { TankTypeList } from '@game/models/TankType';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayerSettings } from '@/store/store';
import { useRedditUser } from '@/contexts/RedditContext';
import Button from './Button';

export default function PlayerInfosSelection() {
	const { tank, setName, setTank, setMenu } = usePlayerSettings();
	const { username } = useRedditUser();
	const [index, setIndex] = useState(TankTypeList.findIndex(t => t.key === tank));
	const [direction, setDirection] = useState(1);

	useEffect(() => {
		setTank(TankTypeList[index].key);
	}, [index]);

	// Sync Reddit username as display name
	useEffect(() => {
		setName(username);
	}, [username]);

	const nextTank = () => {
		setIndex((index + 1) % TankTypeList.length);
		setDirection(-1);
	};

	const prevTank = () => {
		setIndex((index - 1 + TankTypeList.length) % TankTypeList.length);
		setDirection(1);
	};

	return (
		<>
			<nav className='border-toonks-orange m-2 flex flex-row border-b-4 uppercase'>
				<h1 className='relative flex flex-1 flex-col items-center justify-center rounded-t py-4 text-xl font-bold text-gray-900 dark:text-white md:text-2xl'>
					Customize your tank
				</h1>
			</nav>
			<main className='space-y-6 px-6 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-6'>
				<div className='flex flex-col items-center justify-center'>
					<span className='block text-center text-lg font-bold text-gray-900 dark:text-white'>
						Playing as u/{username}
					</span>
				</div>
				<div>
					<div className='bg-gradient-radial relative overflow-hidden rounded border border-gray-100/90 from-slate-900/80 to-gray-900/30 dark:border-gray-700/90'>
						<motion.img
							key={TankTypeList[index].key}
							initial={{ opacity: 0 }}
							animate={{ opacity: 0.5 }}
							transition={{ duration: 0.25 }}
							className='absolute inset-0 -z-10 h-full w-full object-cover object-[center_20%] opacity-50 blur-[1px]'
							src={TankTypeList[index].value.backdrop}
						/>
						<Canvas camera={{ fov: 35, zoom: 1.5 }}>
							<TankModel type={TankTypeList[index].key} />
						</Canvas>
						<div className='flex flex-row items-center justify-between border border-gray-300 bg-white/70 leading-tight text-gray-500 shadow dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-400'>
							<span className='block cursor-pointer px-3 py-2 leading-tight text-gray-500 hover:bg-gray-100/90 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/90 dark:hover:text-white' onClick={prevTank}>
								<svg aria-hidden='true' className='h-5 w-5' fill='currentColor' viewBox='0 0 20 20'>
									<path fillRule='evenodd' d='M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z' clipRule='evenodd' />
								</svg>
							</span>
							<h4 className='text-center font-bold leading-tight tracking-tight text-gray-900 dark:text-white'>
								{TankTypeList[index].value.name}
							</h4>
							<span className='block cursor-pointer px-3 py-2 leading-tight text-gray-500 hover:bg-gray-100/90 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/90 dark:hover:text-white' onClick={nextTank}>
								<svg aria-hidden='true' className='h-5 w-5' fill='currentColor' viewBox='0 0 20 20'>
									<path fillRule='evenodd' d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z' clipRule='evenodd' />
								</svg>
							</span>
						</div>
					</div>
				</div>
				<Button onClick={() => setMenu(false)} fullWidth size='large'>
					Save & Play
				</Button>
			</main>
		</>
	);
}
