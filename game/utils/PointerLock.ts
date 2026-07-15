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
				void this.element.requestPointerLock();
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
