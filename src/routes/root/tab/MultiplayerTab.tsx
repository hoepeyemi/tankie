import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNetwork, usePlayerSettings } from '@/store/store';
import Button from '@/ui/Button';
import { NetworkStatus } from '@game/network/Network';
import CodeInput from '@/ui/CodeInput';

export default function MultiplayerTab() {
	const { status, hostGame, joinGame } = useNetwork();
	const { name, tank } = usePlayerSettings();
	const [mode, setMode] = useState<'choose' | 'host' | 'join'>('choose');
	const [code, setCode] = useState('');

	const handleHostGame = () => {
		void hostGame({ name, tank });
	};

	const handleJoinGame = () => {
		void joinGame(code, { name, tank });
	};

	if (mode === 'choose') {
		return (
			<div className='space-y-4'>
				<h2 className='text-center text-xl font-bold text-gray-900 dark:text-white'>
					Multiplayer
				</h2>
				<Button onClick={() => setMode('host')} fullWidth size='large'>
					Host Game
				</Button>
				<Button onClick={() => setMode('join')} fullWidth size='large'>
					Join Game
				</Button>
			</div>
		);
	}

	if (mode === 'host') {
		return (
			<div className='space-y-4'>
				<button onClick={() => setMode('choose')} className='text-sm text-gray-400 hover:text-white'>
					← Back
				</button>
				<h2 className='text-center text-xl font-bold text-gray-900 dark:text-white'>
					Host a Game
				</h2>
				<Button
					onClick={handleHostGame}
					loading={status === NetworkStatus.Connecting}
					fullWidth
					size='large'
				>
					Create Lobby
				</Button>
			</div>
		);
	}

	return (
		<div className='space-y-4'>
			<button onClick={() => setMode('choose')} className='text-sm text-gray-400 hover:text-white'>
				← Back
			</button>
			<h2 className='text-center text-xl font-bold text-gray-900 dark:text-white'>
				Enter Game ID
			</h2>
			<CodeInput value={code} onChange={setCode} length={6} className='mb-5' />
			<Button
				onClick={handleJoinGame}
				loading={status === NetworkStatus.Connecting}
				disabled={code.length !== 6}
				fullWidth
				size='large'
			>
				Join
			</Button>
		</div>
	);
}
