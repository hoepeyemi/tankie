import React, { useEffect, useState, useRef } from 'react';
import { initGame } from '@game/main';
import { useAudio, useNetwork, useMatchStore } from '@/store/store';
import GameUi from '@/ui/GameUi';
import GameOver from '@/ui/GameOver';
import LoadingScreen from '@/ui/LoadingScreen';
import { toast } from 'react-hot-toast';
import ConnectionToast from '@/ui/toast/ConnectionToast';
import { NetworkStatus } from '@game/network/Network';
import KillToast from '@/ui/toast/KillToast';
import HitToast from '@/ui/toast/HitToast';
import type Game from '@game/scenes/Game';
import { useNavigate } from 'react-router-dom';

export default function GameRenderer() {
    const navigate = useNavigate();
	const { network } = useNetwork();
	const [game, setGame] = useState<Game>();
	const [loading, setLoading] = useState(true);
	const [loadProgress, setLoadProgress] = useState(0);
	const [loadError, setLoadError] = useState<string | null>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const audio = useAudio();

	useEffect(() => {
		audio.fadeOut();

        // Reset match store to ensure it doesn't bleed from previous matches
        useMatchStore.getState().setMatchState(300000, 'PLAYING');

		if (!network) {
			navigate('/');
            return;
		}

		// Handle WebGL context loss — prevent default so Three.js can attempt restore
		const canvas = canvasRef.current;
		const onContextLost = (e: Event) => {
			e.preventDefault();
			console.warn('[GameRenderer] WebGL context lost — waiting for restore');
		};
		canvas?.addEventListener('webglcontextlost', onContextLost);

		const { start, stop } = initGame();
		// Timeout: force-complete loading after 30s so users aren't stuck forever
		const loadTimeout = setTimeout(() => {
			setLoadProgress(100);
		}, 30000);

		start(canvasRef.current!, network!).then(async game => {
			clearTimeout(loadTimeout);
			setGame(game);
			setLoadProgress(100);

			network?.on('status', status => {
				if (status === NetworkStatus.Disconnected) {
					console.log('Disconnected from server, redirecting to home page');
					navigate('/');
				}
			});
			network?.on('join', name => {
				toast.custom(<ConnectionToast playerName={name} type='join' />);
			});
			network?.on('leave', name => {
				toast.custom(<ConnectionToast playerName={name} type='leave' />);
			});
			game.events.on('tank:kill', ({ killer, killed }) => {
				toast.custom(
					<KillToast killer={killer} killed={killed} />,
				);
			});
			game.events.on('tank:hit', ({ from, to, damage }) => {
				const playerA = game.tanks.get(from)?.pseudo ?? 'Unknown';
				const playerB = game.tanks.get(to)?.pseudo ?? 'Unknown';
				toast.custom(
					<HitToast from={playerA} to={playerB} damage={damage} />,
				);
			});
			game.events.on('sync:matchState', ({ time, state }) => {
				useMatchStore.getState().setMatchState(time, state);
			});
		}).catch((err: unknown) => {
			clearTimeout(loadTimeout);
			const msg = err instanceof Error ? err.message : String(err);
			console.error('[GameRenderer] start() failed:', err);
			setLoadError(msg);
		});

		return () => {
			clearTimeout(loadTimeout);
			stop();
			canvas?.removeEventListener('webglcontextlost', onContextLost);
		};
	}, []);

	if (loadError) {
		return (
			<div style={{ position: 'fixed', inset: 0, background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 99999 }}>
				<p style={{ color: '#f87171', fontFamily: 'monospace', fontSize: 14, marginBottom: 12, fontWeight: 700 }}>Game failed to load</p>
				<pre style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', maxWidth: 480 }}>{loadError}</pre>
				<button onClick={() => navigate('/')} style={{ marginTop: 24, padding: '10px 24px', background: '#f97316', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Back to Menu</button>
			</div>
		);
	}

	return (
		<div style={{ position: 'fixed', inset: 0, zIndex: 1 }}>
			{/* canvas is appended to body by Project.ts and fixed to viewport */}
			<canvas ref={canvasRef} style={{ display: 'none' }} />
			{loading && <LoadingScreen progress={loadProgress} onComplete={() => setLoading(false)} />}
			{game && <GameUi game={game} />}
			{game && <GameOver game={game} />}
		</div>
	);
}

