import Emittery from 'emittery';

type KeyMap<Action extends string = never> = Record<Action, string[]>;
type Events = typeof Keyboard.events[number];

export class Keyboard<T extends KeyMap> extends Emittery {
	static readonly events = ['keydown', 'keyup'] as const;
	private readonly actionKeys = new Map<string, readonly string[]>();
	private readonly keys = new Map<string, {
		actions: string[];
		event: Events | false;
	}>();

	constructor(private enabled = true) {
		super();
	}

	public setEnabled(enabled: boolean) {
		this.enabled = enabled;
		if (!enabled) {
			this.keys.forEach(key => {
				key.event = false;
			});
		}
	}

	public start(element?: HTMLElement) {
		const handleKey = (event: string) => (e: KeyboardEvent) => {
			if (!this.enabled) return;
			if (!e.repeat && this.keys.has(e.code)) {
				e.preventDefault();
				const key = this.keys.get(e.code);
				if (key) {
					key.event = event as Events;
					if (event === 'keydown') {
						key.actions.forEach(async action => this.emit(action));
					}
				}
			}
		};

		Keyboard.events.forEach(event => {
			// Listen on both document and window to catch events regardless of focus target
			document.addEventListener(event, handleKey(event));
			window.addEventListener(event, handleKey(event));
			if (element) {
				element.addEventListener(event, handleKey(event));
			}
		});

		// Wheel event
		document.addEventListener('wheel', e => {
			if (this.enabled) {
				e.preventDefault();
				void this.emit('wheel', e);
			}
		}, {passive: false});

		// Ensure the iframe/element has keyboard focus — required in sandboxed iframes
		const focusTarget = element ?? document.body;
		if (!focusTarget.hasAttribute('tabindex')) {
			focusTarget.setAttribute('tabindex', '-1');
		}
		focusTarget.focus({ preventScroll: true });

		// Re-focus whenever the user clicks on the page (in case focus drifts to parent frame)
		document.addEventListener('pointerdown', () => {
			focusTarget.focus({ preventScroll: true });
		});
	}

	addAction<A extends string>(action: A, keys: string[]): Keyboard<T & KeyMap<A>> {
		this.actionKeys.set(action, keys);
		keys.forEach(key => {
			if (!this.keys.has(key)) {
				this.keys.set(key, {
					actions: [],
					event: false,
				});
			}

			this.keys.get(key)?.actions.push(action);
		});
		return this as Keyboard<T & KeyMap<A>>;
	}

	getAction(action: keyof T): boolean {
		return this.actionKeys.get(action as string)?.some(key => this.keys?.get(key)?.event === 'keydown') ?? false;
	}

	getOnAction(action: keyof T, listener: () => void, delta = 0): () => void {
		let last = 0;
		return this.on(action as string, () => {
			if (last + delta < Date.now()) {
				last = Date.now();
				listener();
			}
		});
	}
}
