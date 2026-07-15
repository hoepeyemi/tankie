import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Network, NetworkStatus } from '@game/network/Network';
import { DevvitNetwork } from '@game/network/DevvitNetwork';
import { OfflineNetwork } from '@game/network/OfflineNetwork';
import { type Metadata, type NetworkEvents, type PeerData } from '@game/network/NetworkEvents';
import { Howl } from 'howler';
import { type TankType } from '@game/models/TankType';

type Store = {
	hostGame: (metadata: Metadata & { roomOverride?: string; wagerAmount?: number }) => Promise<{ code: string; network: DevvitNetwork }>;
	joinGame: (code: string, metadata: Metadata, wagerAmount?: number) => Promise<{ code: string; network: DevvitNetwork }>;
	quickPlay: (metadata: Metadata) => Promise<{ code: string; network: OfflineNetwork }>;
	code?: string;
	network?: Network<NetworkEvents, Metadata>;
	status: NetworkStatus;
	peers: PeerData[];
	wagerAmount: number;
	readonly maxNbPlayers: number;
};

export const useNetwork = create<Store>((set, get) => {
	function switchNetwork<T extends Network<NetworkEvents, Metadata>>(network: T): T {
		const oldNetwork = get().network;
		oldNetwork?.clearListeners();
		oldNetwork?.disconnect();
		network.on('peers', peers => {
			set({ peers });
		});
		network.on('status', status => {
			set({ status });
		});
		set({ network });
		return network;
	}

	return {
		status: NetworkStatus.Disconnected,
		peers: [],
		wagerAmount: 0,
		async hostGame(metadata: Metadata & { roomOverride?: string; wagerAmount?: number }) {
			const { code } = metadata.roomOverride
				? Network.createRoomId({ prefix: 'TOONKS', value: metadata.roomOverride })
				: Network.createRoomId({ prefix: 'TOONKS', length: 6 });
			const network = switchNetwork(new DevvitNetwork());
			await network.connect({ isHost: true, code, metadata });
			set({ code, wagerAmount: metadata.wagerAmount ?? 0 });
			return { network, code };
		},
		async joinGame(code, metadata: Metadata, wagerAmount?: number) {
			const network = switchNetwork(new DevvitNetwork());
			await network.connect({ isHost: false, code, metadata });
			set({ code, wagerAmount: wagerAmount ?? 0 });
			return { network, code };
		},
		async quickPlay(metadata: Metadata) {
			const network = switchNetwork(new OfflineNetwork());
			await network.connect({ metadata });
			useMatchStore.getState().setMatchState(180000, 'PLAYING');
			const code = 'OFFLINE';
			set({ code, wagerAmount: 0 });
			return { network, code };
		},
		maxNbPlayers: 6,
	};
});

export const usePlayerSettings = create(persist<{
	showMenu: boolean;
	name: string;
	tank: TankType;
	setName: (name: string) => void;
	setTank: (type: TankType) => void;
	setMenu: (showMenu: boolean) => void;
}>(
	set => ({
		showMenu: false,
		name: 'Player',
		tank: 'heig',
		setName(name: string) {
			set({ name });
		},
		setTank(tank: TankType) {
			set({ tank });
		},
		setMenu(showMenu: boolean) {
			set({ showMenu });
		},
	}),
	{ 
		name: 'player-storage',
		merge: (persisted: any, current: any) => ({
			...current,
			...persisted,
			showMenu: false, // Always start on main menu, never tank customization
		}),
	},
));

export const useAudio = create(persist<{
	mute: boolean;
	volume: number;
	toggleBacksound: () => void;
	setBacksoundVolume: (volume: number) => void;
	play(): void;
	fadeOut(): void;
}>((set, get) => {
	let _backsound: Howl;
	const backsound = () => {
		if (!_backsound) {
			_backsound = new Howl({
				src: ['/audio/Eyes_on_the_Podium.mp3'],
				loop: true,
				volume: get()?.volume ?? 0.5,
				mute: get()?.mute ?? false,
			});
		}

		return _backsound;
	};

	return ({
		mute: false,
		volume: 0.5,
		toggleBacksound() {
			const mute = !backsound().mute();
			set({ mute });
			backsound().mute(mute);
		},
		setBacksoundVolume(volume: number) {
			set({ volume });
			backsound().volume(volume);
		},
		play() {
			backsound().play();
		},
		fadeOut() {
			const from = backsound().volume();
			backsound().fade(from, 0.0, 5000);
		},
	});
}, { name: 'audio-storage' }));

export const useMatchStore = create<{
	time: number;
	state: 'PLAYING' | 'OVER';
	setMatchState: (time: number, state: 'PLAYING' | 'OVER') => void;
}>(set => ({
	time: 300000,
	state: 'PLAYING',
	setMatchState: (time, state) => { set({ time, state }); },
}));
