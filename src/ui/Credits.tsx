import React from 'react';
import Modal from 'react-modal';

function KBD(props: {children: React.ReactNode}) {
	return (
		<kbd
			className='rounded bg-gray-200 px-2 py-0.5 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600'
		>
			{props.children}
		</kbd>
	);
}

export default function Credits({isOpen, onClose}: {isOpen: boolean; onClose: () => void}) {
	return (
		<Modal
			isOpen={isOpen}
			shouldCloseOnOverlayClick={true}
			onRequestClose={onClose}
			overlayClassName='fixed inset-0 flex h-full w-full items-center justify-center bg-black/50 p-4 backdrop-blur'
			className='flex max-h-full w-full max-w-md flex-col items-center space-y-4 overflow-auto rounded-lg border-2 border-gray-300 bg-white p-6 shadow dark:border-gray-600 dark:bg-gray-800'
		>
			<h2 className='text-2xl font-bold text-gray-800 dark:text-gray-100'>Controls</h2>

			<div className='w-full space-y-3 text-gray-600 dark:text-gray-300'>
				<ul className='space-y-3'>
					<li className='flex items-center justify-between'>
						<span>Move Forward</span>
						<KBD>W</KBD>
					</li>
					<li className='flex items-center justify-between'>
						<span>Move Backward</span>
						<KBD>S</KBD>
					</li>
					<li className='flex items-center justify-between'>
						<span>Turn Left</span>
						<KBD>A</KBD>
					</li>
					<li className='flex items-center justify-between'>
						<span>Turn Right</span>
						<KBD>D</KBD>
					</li>

					<hr className='border-gray-300 dark:border-gray-600' />

					<li className='flex items-center justify-between'>
						<span>Shoot</span>
						<KBD>Space</KBD>
					</li>
					<li className='flex items-center justify-between'>
						<span>Cannon Angle</span>
						<KBD>Mouse Scroll</KBD>
					</li>

					<hr className='border-gray-300 dark:border-gray-600' />

					<li className='flex items-center justify-between'>
						<span>Respawn / Unstuck</span>
						<KBD>R</KBD>
					</li>
					<li className='flex items-center justify-between'>
						<span>Toggle Headlights</span>
						<KBD>L</KBD>
					</li>
					<li className='flex items-center justify-between'>
						<span>Honk</span>
						<KBD>K</KBD>
					</li>
					<li className='flex items-center justify-between'>
						<span>Show Scoreboard (Hold)</span>
						<KBD>Tab</KBD>
					</li>

					<hr className='border-gray-300 dark:border-gray-600' />

					<li className='flex items-center justify-between'>
						<span>Exit Game</span>
						<KBD>ESC</KBD>
					</li>
				</ul>
			</div>

			<button
				onClick={onClose}
				className='mt-2 w-full rounded-lg bg-toonks-orange px-4 py-2 font-bold text-white hover:bg-toonks-orangeLight'
			>
				Got it!
			</button>
		</Modal>
	);
}

