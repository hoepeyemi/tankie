import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Button from '@/ui/Button';
import { usePlayerSettings, useAudio } from '@/store/store';
import DailyChallengeCard from '@/ui/DailyChallenge';

export default function Register() {
	const { setMenu } = usePlayerSettings();
	const audio = useAudio();
	const [showSettings, setShowSettings] = useState(false);
	const gearRef = useRef<HTMLButtonElement>(null);
	const [dropPos, setDropPos] = useState({ top: 0, right: 0 });

	useEffect(() => {
		if (showSettings && gearRef.current) {
			const r = gearRef.current.getBoundingClientRect();
			setDropPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
		}
	}, [showSettings]);
	const tabs = [
		{ label: '⚡ Play', url: '/' },
		{ label: '🎮 Multiplayer', url: '/multiplayer' },
		{ label: '⚔️ Wager', url: '/wager' },
		{ label: '🎨 Skins', url: '/skins' },
		{ label: '🏆 Ranks', url: '/leaderboard' },
	];

	const location = useLocation();

	return (
		<>
			<nav style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
				<ul style={{ display: 'flex', flexDirection: 'row', minWidth: 'max-content', width: '100%' }}>
					{tabs.map(item => (
						<NavLink
							to={item.url}
							key={item.label}
							style={{ minWidth: 64, flex: 1, textDecoration: 'none' }}
						>
							{({ isActive }) => (
								<div style={{
									position: 'relative', display: 'flex', flexDirection: 'column',
									alignItems: 'center', justifyContent: 'center',
									padding: '9px 6px', cursor: 'pointer',
									fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em',
									textTransform: 'uppercase', whiteSpace: 'nowrap',
									color: isActive ? '#f97316' : 'rgba(255,255,255,0.45)',
									background: isActive ? 'rgba(249,115,22,0.1)' : 'transparent',
									transition: 'color 0.15s, background 0.15s',
								}}>
									{item.label}
									{isActive && (
										<motion.div
											layoutId='underline'
											style={{
												position: 'absolute', bottom: 0, left: 0, right: 0,
												height: 2, background: '#f97316', borderRadius: 2,
											}}
										/>
									)}
								</div>
							)}
						</NavLink>
					))}
					<div style={{ position: 'relative', flexShrink: 0 }}>
						<button
							ref={gearRef}
							onClick={() => setShowSettings(!showSettings)}
							style={{
								width: 44, height: '100%', display: 'flex',
								alignItems: 'center', justifyContent: 'center',
								background: 'rgba(249,115,22,0.15)', border: 'none',
								borderLeft: '1px solid rgba(249,115,22,0.2)', cursor: 'pointer',
								color: '#f97316',
							}}
						>
							<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'><path fill='currentColor' d='M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.69.07-1.08s-.03-.73-.07-1.08l2.32-1.82c.21-.16.27-.46.13-.7l-2.2-3.81c-.13-.25-.41-.33-.66-.25l-2.73 1.1c-.57-.44-1.18-.8-1.86-1.08l-.42-2.9C14.18 2.18 13.9 2 13.6 2h-4.4c-.3 0-.58.18-.62.5l-.42 2.9c-.68.28-1.3.64-1.86 1.08L3.57 5.38c-.25-.08-.53 0-.66.25L.71 9.44c-.14.24-.08.54.13.7l2.32 1.82C3.03 12.27 3 12.61 3 13s.03.73.07 1.08l-2.32 1.82c-.21.16-.27.46-.13.7l2.2 3.81c.13.25.41.33.66.25l2.73-1.1c.57.44 1.18.8 1.86 1.08l.42 2.9c.04.32.32.5.62.5h4.4c.3 0 .58-.18.62-.5l.42-2.9c.68-.28 1.3-.64 1.86-1.08l2.73 1.1c.25.08.53 0 .66-.25l2.2-3.81c.14-.24.08-.54-.13-.7l-2.32-1.82z' /></svg>
						</button>
						{showSettings && (
							<div style={{
								position: 'fixed', top: dropPos.top, right: dropPos.right, zIndex: 9999,
								width: 200, borderRadius: 10,
								background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
								boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
								padding: 12, display: 'flex', flexDirection: 'column', gap: 10,
							}}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<label htmlFor='mute-toggle' style={{ fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>Mute</label>
									<input id='mute-toggle' type='checkbox' defaultChecked={audio.mute}
										style={{ accentColor: '#f97316', width: 16, height: 16, cursor: 'pointer' }}
										onChange={() => audio.toggleBacksound()} />
								</div>
								<div>
									<label style={{ fontSize: 13, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Volume</label>
									<input type='range' min='0' max='1' defaultValue={audio.volume} step='0.01'
										style={{ accentColor: '#f97316', width: '100%', cursor: 'pointer' }}
										onChange={e => audio.setBacksoundVolume(parseFloat(e.target.value))} />
								</div>
							</div>
						)}
					</div>
				</ul>
			</nav>
			<main style={{ padding: '12px 14px 16px' }}>
				<DailyChallengeCard />
				<AnimatePresence mode='wait'>
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 10 }}
						transition={{ duration: 0.2 }}
						key={location.pathname}
					>
						<Outlet />
					</motion.div>
				</AnimatePresence>
			</main>
		</>
	);
}
