import { connectRealtime } from '@devvit/web/client';
import { Network, NetworkStatus } from './Network';
import type { Metadata, NetworkEvents, PeerData } from './NetworkEvents';

type RealtimeMsg = {
	channel: string;
	peer: string;
	data: unknown;
};

export class DevvitNetwork extends Network<NetworkEvents, Metadata> {
	private _uuid?: string;
	private _code?: string;
	private _metadata?: Metadata;
	private _peers: PeerData[] = [];
	private _host = false;
	private _rt?: { disconnect: () => void };

	get isHost() { return this._host; }

	async connect(options: { isHost: boolean; code: string; metadata: Metadata }): Promise<void> {
		this._host = options.isHost;
		this._code = options.code;
		this._metadata = options.metadata;

		void this.emit('status', NetworkStatus.Connecting);

		const res = await fetch(options.isHost ? '/api/game/host' : '/api/game/join', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code: options.code, metadata: options.metadata }),
		});
		if (!res.ok) throw new Error(`Failed to ${options.isHost ? 'host' : 'join'} room: ${res.status}`);

		const { uuid, players } = await res.json() as { uuid: string; players: PeerData[] };
		this._uuid = uuid;
		this._peers = players;

		this._rt = connectRealtime({
			channel: `game_${options.code}`,
			onMessage: (raw: unknown) => {
				const msg = raw as RealtimeMsg;
				if (msg.peer === this._uuid) return; // own echo

				if (msg.channel === 'join') {
					const { peer, peers } = msg.data as { peer: PeerData; peers: PeerData[] };
					this._peers = peers;
					void this.emit('peers', peers);
					void this.emit('join', peer.metadata.name);
				} else if (msg.channel === 'leave') {
					const { peer, peers } = msg.data as { peer: PeerData; peers: PeerData[] };
					this._peers = peers;
					void this.emit('peers', peers);
					void this.emit('leave', peer.metadata.name);
				} else {
					void this.channelEmitter.emit(msg.channel as keyof NetworkEvents, {
						peer: msg.peer,
						data: msg.data,
					} as any);
				}
			},
		});

		void this.emit('status', NetworkStatus.Connected);
		void this.emit('peers', this._peers);
	}

	disconnect(): void {
		if (this._uuid && this._code) {
			void fetch('/api/game/disconnect', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: this._code, uuid: this._uuid }),
			});
		}
		this._rt?.disconnect();
		this._rt = undefined;
		this._uuid = undefined;
		this._code = undefined;
		this._peers = [];
		void this.emit('status', NetworkStatus.Disconnected);
	}

	send(channel: string, data: unknown): void {
		if (!this._uuid || !this._code) return;
		void fetch('/api/game/send', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code: this._code, uuid: this._uuid, channel, data }),
		});
	}

	connectedPeers(): PeerData[] { return this._peers; }
	getMetadata(): Metadata | undefined { return this._metadata; }

	getPeerData(): PeerData | undefined {
		if (this._uuid && this._metadata) {
			return { uuid: this._uuid, metadata: this._metadata };
		}
	}

	protected addConnection(_connection: unknown): void {}
	protected removeConnection(_connection: unknown): void {}
}
