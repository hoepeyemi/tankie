import { Network, NetworkStatus } from './Network';
import { type Metadata, type NetworkEvents } from '@game/network/NetworkEvents';

export class OfflineNetwork extends Network<NetworkEvents, Metadata> {
    private metadata?: Metadata;

    public get isHost() {
        return true; // The local player acts as the host in singleplayer
    }

    public constructor() {
        super();
    }

    public async connect(options: { metadata: Metadata }): Promise<void> {
        this.metadata = options.metadata;
        return new Promise((resolve) => {
            this.disconnect();
            void this.emit('status', NetworkStatus.Connecting);
            // Simulate a brief delay like a real connection
            setTimeout(() => {
                void this.emit('status', NetworkStatus.Connected);
                resolve();
            }, 100);
        });
    }

    public disconnect(): void {
        void this.emit('status', NetworkStatus.Disconnected);
    }

    public getMetadata() {
        return this.metadata;
    }

    // Stubs for network functionality that isn't needed offline
    public getConnections() {
        return [];
    }

    public send(channel: string, data: unknown): void {
        this.handleMessage({} as any, {
            channel,
            data,
            peer: 'offline-local-player',
        });
    }

    public connectedPeers(): import('@game/network/NetworkEvents').PeerData[] {
        const peerData = this.getPeerData();
        return peerData ? [peerData] : [];
    }

    public getPeerData(): import('@game/network/NetworkEvents').PeerData | undefined {
        if (this.metadata) {
            return { uuid: 'offline-local-player', metadata: this.metadata };
        }
    }

    protected addConnection(_connection: import('peerjs').DataConnection): void {
        // Not needed
    }

    protected removeConnection(_connection: import('peerjs').DataConnection): void {
        // Not needed
    }
}
