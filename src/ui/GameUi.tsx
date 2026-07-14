import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import PlayersStatus from '@/ui/PlayersStatus';
import type Game from '@game/scenes/Game';
import type TankPlayer from '@game/models/TankPlayer';
import type Tank from '@game/models/Tank';
import ChatUi from '@/ui/ChatUi';
import Scoreboard from '@/ui/Scoreboard';

export default function GameUi({ game }: { game: Game }) {
	const [tanks, setTanks] = useState<Tank[]>([]);
	const [player, setPlayer] = useState<TankPlayer>();

	useEffect(() => {
		const unregister = game.tanks.events.on(['add', 'remove'], () => {
			setPlayer(game.player);
			setTanks(game.tanks.array.filter((t: Tank) => t.uuid !== game.player?.uuid));
		});

		return () => {
			unregister();
		};
	}, [game]);

	return (
		<>
			<Scoreboard game={game} />
			<PlayersStatus player={player} tanks={tanks} />
			<ChatUi className='absolute bottom-0 left-0 h-2/5 w-full max-w-sm p-3 text-sm' />
			<Toaster
				position='top-right'
				gutter={4}
				containerStyle={{ zIndex: 9999 }}
				toastOptions={{
					duration: 2000,
				}}
			/>
		</>
	);
}
