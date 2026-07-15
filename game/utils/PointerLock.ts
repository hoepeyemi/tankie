import Emittery from 'emittery';

export class PointerLock extends Emittery<{
	pointerlockchange: boolean;
}> {
	constructor(private readonly element: HTMLElement) {
		super();
		document.addEventListener('pointerlockchange', () => {
			void this.emit('pointerlockchange', this.isLocked());
		});
		element.addEventListener('pointerdown', () => {
			this.lock();
		});
	}

	public isLocked() {
		return document.pointerLockElement === this.element;
	}

	public lock() {
		if (!this.isLocked()) {
			try {
				const p = this.element.requestPointerLock();
				// requestPointerLock returns a Promise in some browsers; catch async rejection
				if (p && typeof p.catch === 'function') p.catch(() => {});
			} catch {
				// Silently ignore — sandboxed iframes (e.g. Devvit) block pointer lock
			}
		}
	}

	public unlock() {
		if (this.isLocked()) {
			try {
				document.exitPointerLock();
			} catch {
				// ignore
			}
		}
	}
}
