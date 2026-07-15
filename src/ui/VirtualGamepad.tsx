import React, { useCallback, useEffect, useRef, useState } from 'react';

// Fire synthetic keyboard events so the existing Keyboard class picks them up
function keyDown(code: string) {
	document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }));
	window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }));
}
function keyUp(code: string) {
	document.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true, cancelable: true }));
	window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true, cancelable: true }));
}

const DEAD_ZONE = 12; // px — ignore tiny movements

type ActiveKeys = Set<string>;

export default function VirtualGamepad() {
	const [visible, setVisible] = useState(false);
	const joystickRef = useRef<HTMLDivElement>(null);
	const stickRef = useRef<HTMLDivElement>(null);
	const activeKeys = useRef<ActiveKeys>(new Set());

	// Track joystick and turret by touch identifier for proper multitouch handling
	const joystickTouchId = useRef<number | null>(null);
	const joystickOrigin = useRef({ x: 0, y: 0 });
	const turretTouchId = useRef<number | null>(null);
	const turretPrev = useRef({ x: 0, y: 0 });

	// Detect touch device
	useEffect(() => {
		const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
		setVisible(isTouch);
	}, []);

	const releaseKey = useCallback((code: string) => {
		if (activeKeys.current.has(code)) {
			activeKeys.current.delete(code);
			keyUp(code);
		}
	}, []);

	const pressKey = useCallback((code: string) => {
		if (!activeKeys.current.has(code)) {
			activeKeys.current.add(code);
			keyDown(code);
		}
	}, []);

	// Update directional keys from joystick position
	const updateJoystick = useCallback((dx: number, dy: number) => {
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < DEAD_ZONE) {
			['KeyW', 'KeyS', 'KeyA', 'KeyD'].forEach(releaseKey);
			if (stickRef.current) stickRef.current.style.transform = 'translate(0,0)';
			return;
		}

		if (dy < -DEAD_ZONE) pressKey('KeyW'); else releaseKey('KeyW');
		if (dy > DEAD_ZONE) pressKey('KeyS'); else releaseKey('KeyS');
		if (dx < -DEAD_ZONE) pressKey('KeyA'); else releaseKey('KeyA');
		if (dx > DEAD_ZONE) pressKey('KeyD'); else releaseKey('KeyD');

		// Move stick visual (clamped to 40px radius)
		const clamp = Math.min(dist, 40);
		const nx = (dx / dist) * clamp;
		const ny = (dy / dist) * clamp;
		if (stickRef.current) {
			stickRef.current.style.transform = `translate(${nx}px, ${ny}px)`;
		}
	}, [pressKey, releaseKey]);

	const resetJoystick = useCallback(() => {
		['KeyW', 'KeyS', 'KeyA', 'KeyD'].forEach(releaseKey);
		joystickTouchId.current = null;
		if (stickRef.current) stickRef.current.style.transform = 'translate(0,0)';
	}, [releaseKey]);

	useEffect(() => {
		if (!visible) return;

		const onTouchStart = (e: TouchEvent) => {
			for (const touch of Array.from(e.changedTouches)) {
				const isLeft = touch.clientX < window.innerWidth / 2;
				if (isLeft && joystickTouchId.current === null) {
					joystickTouchId.current = touch.identifier;
					joystickOrigin.current = { x: touch.clientX, y: touch.clientY };
					e.preventDefault();
				} else if (!isLeft && turretTouchId.current === null) {
					// Right half — turret aim drag
					turretTouchId.current = touch.identifier;
					turretPrev.current = { x: touch.clientX, y: touch.clientY };
					e.preventDefault();
				}
			}
		};

		const onTouchMove = (e: TouchEvent) => {
			for (const touch of Array.from(e.changedTouches)) {
				if (touch.identifier === joystickTouchId.current) {
					const dx = touch.clientX - joystickOrigin.current.x;
					const dy = touch.clientY - joystickOrigin.current.y;
					updateJoystick(dx, dy);
					e.preventDefault();
				} else if (touch.identifier === turretTouchId.current) {
					const dx = touch.clientX - turretPrev.current.x;
					const dy = touch.clientY - turretPrev.current.y;
					// Dispatch mouse movement so the game's pointer-drag turret controller picks it up
					window.dispatchEvent(new MouseEvent('mousemove', {
						movementX: Math.round(dx * 2.5),
						movementY: Math.round(dy * 2.5),
						bubbles: true,
					}));
					document.dispatchEvent(new MouseEvent('mousemove', {
						movementX: Math.round(dx * 2.5),
						movementY: Math.round(dy * 2.5),
						bubbles: true,
					}));
					turretPrev.current = { x: touch.clientX, y: touch.clientY };
					e.preventDefault();
				}
			}
		};

		const onTouchEnd = (e: TouchEvent) => {
			for (const touch of Array.from(e.changedTouches)) {
				if (touch.identifier === joystickTouchId.current) {
					resetJoystick();
				} else if (touch.identifier === turretTouchId.current) {
					turretTouchId.current = null;
				}
			}
			e.preventDefault();
		};

		document.addEventListener('touchstart', onTouchStart, { passive: false });
		document.addEventListener('touchmove', onTouchMove, { passive: false });
		document.addEventListener('touchend', onTouchEnd, { passive: false });
		document.addEventListener('touchcancel', onTouchEnd, { passive: false });

		return () => {
			document.removeEventListener('touchstart', onTouchStart);
			document.removeEventListener('touchmove', onTouchMove);
			document.removeEventListener('touchend', onTouchEnd);
			document.removeEventListener('touchcancel', onTouchEnd);
		};
	}, [visible, updateJoystick, resetJoystick]);

	// Cleanup all keys on unmount
	useEffect(() => {
		return () => {
			activeKeys.current.forEach(code => keyUp(code));
		};
	}, []);

	if (!visible) return null;

	const btnBase: React.CSSProperties = {
		position: 'absolute',
		borderRadius: '50%',
		border: '2px solid rgba(255,255,255,0.3)',
		background: 'rgba(255,255,255,0.12)',
		backdropFilter: 'blur(4px)',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		userSelect: 'none',
		WebkitUserSelect: 'none',
		touchAction: 'none',
		fontWeight: 700,
		color: 'rgba(255,255,255,0.8)',
	};

	return (
		<div style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none' }}>
			{/* Left joystick */}
			<div
				ref={joystickRef}
				style={{
					...btnBase,
					pointerEvents: 'auto',
					position: 'absolute',
					left: 32,
					bottom: 80,
					width: 100,
					height: 100,
					borderRadius: '50%',
					background: 'rgba(255,255,255,0.08)',
					border: '2px solid rgba(255,255,255,0.2)',
				}}
			>
				<div
					ref={stickRef}
					style={{
						width: 44,
						height: 44,
						borderRadius: '50%',
						background: 'rgba(255,255,255,0.25)',
						border: '2px solid rgba(255,255,255,0.5)',
						transition: 'transform 0.05s',
						pointerEvents: 'none',
					}}
				/>
			</div>

			{/* Right drag zone hint — subtle, tells user to swipe for turret */}
			<div style={{
				position: 'absolute',
				right: 0,
				top: 0,
				bottom: 0,
				width: '50%',
				pointerEvents: 'none',
				display: 'flex',
				alignItems: 'flex-end',
				justifyContent: 'center',
				paddingBottom: 180,
			}}>
				<span style={{
					fontSize: 10,
					color: 'rgba(255,255,255,0.2)',
					letterSpacing: '0.1em',
					textTransform: 'uppercase',
					pointerEvents: 'none',
					userSelect: 'none',
				}}>swipe to aim</span>
			</div>

			{/* Fire button */}
			<div
				style={{
					...btnBase,
					pointerEvents: 'auto',
					position: 'absolute',
					right: 32,
					bottom: 80,
					width: 72,
					height: 72,
					background: 'rgba(249,115,22,0.35)',
					border: '2px solid rgba(249,115,22,0.7)',
					fontSize: 28,
				}}
				onTouchStart={e => { e.preventDefault(); pressKey('Space'); }}
				onTouchEnd={e => { e.preventDefault(); releaseKey('Space'); }}
			>
				🔥
			</div>

			{/* Honk button */}
			<div
				style={{
					...btnBase,
					pointerEvents: 'auto',
					position: 'absolute',
					right: 120,
					bottom: 80,
					width: 52,
					height: 52,
					fontSize: 22,
				}}
				onTouchStart={e => { e.preventDefault(); pressKey('KeyK'); }}
				onTouchEnd={e => { e.preventDefault(); releaseKey('KeyK'); }}
			>
				📯
			</div>
		</div>
	);
}
