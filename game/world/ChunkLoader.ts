import { Chunk } from '@game/world/Chunk';
import type Game from '@game/scenes/Game';

type ChunkLoaderOptions = {
	worldHeightMapUrl: string;
	chunkSize: number;
	scale?: number;
};

export class ChunkLoader {
	private readonly options: Required<ChunkLoaderOptions>;
	private readonly image: Promise<HTMLImageElement>;
	private readonly canvas: HTMLCanvasElement;
	private readonly context: CanvasRenderingContext2D;

	constructor(options: ChunkLoaderOptions) {
		this.options = { scale: 1, ...options };
		const { chunkSize, scale } = this.options;

		this.canvas = document.createElement('canvas');
		this.canvas.width = chunkSize * scale;
		this.canvas.height = chunkSize * scale;
		const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) throw new Error('Could not get canvas context');
		this.context = ctx;

		this.image = new Promise<HTMLImageElement>((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = options.worldHeightMapUrl;
		});
	}

	public async loadChunk(game: Game, x: number, y: number): Promise<Chunk> {
		const fullImage = await this.image;
		const { chunkSize, scale } = this.options;
		this.context.drawImage(
			fullImage,
			x * chunkSize,
			y * chunkSize,
			chunkSize,
			chunkSize,
			0,
			0,
			chunkSize * scale,
			chunkSize * scale,
		);
		const pixels = this.context.getImageData(0, 0, chunkSize * scale, chunkSize * scale);
		return new Chunk(game, x, y, pixels);
	}
}
