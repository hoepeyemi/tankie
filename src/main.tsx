import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GameRenderer from '@/routes/GameRenderer';
import '@/global.css';
import Root from '@/routes/root/Root';
import MultiplayerTab from '@/routes/root/tab/MultiplayerTab';
import QuickPlayTab from '@/routes/root/tab/QuickPlayTab';
import LeaderboardTab from '@/routes/root/tab/LeaderboardTab';
import SkinsTab from '@/routes/root/tab/SkinsTab';
import WagerTab from '@/routes/root/tab/WagerTab';
import { RedditProvider } from '@/contexts/RedditContext';

class ErrorBoundary extends React.Component<
	{ children: React.ReactNode },
	{ error: Error | null }
> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { error: null };
	}
	static getDerivedStateFromError(error: Error) {
		return { error };
	}
	render() {
		if (this.state.error) {
			return (
				<div style={{ color: 'white', background: 'rgba(0,0,0,0.85)', padding: 24, margin: 16, borderRadius: 8, fontFamily: 'monospace', fontSize: 13, zIndex: 9999, position: 'fixed', inset: 0, overflow: 'auto' }}>
					<strong style={{ color: '#ff6b6b', fontSize: 16 }}>React Error</strong>
					<pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
					<pre style={{ marginTop: 8, color: '#aaa', whiteSpace: 'pre-wrap' }}>{this.state.error.stack}</pre>
				</div>
			);
		}
		return this.props.children;
	}
}

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<ErrorBoundary>
			<RedditProvider>
				<MemoryRouter>
					<Routes>
						<Route path='/' element={<Root />}>
							<Route index element={<QuickPlayTab />} />
							<Route path='quickplay' element={<QuickPlayTab />} />
							<Route path='multiplayer' element={<MultiplayerTab />} />
							<Route path='join/:code?' element={<MultiplayerTab />} />
							<Route path='wager' element={<WagerTab />} />
							<Route path='skins' element={<SkinsTab />} />
							<Route path='leaderboard' element={<LeaderboardTab />} />
						</Route>
						<Route path='/game' element={<GameRenderer />} />
					</Routes>
				</MemoryRouter>
			</RedditProvider>
		</ErrorBoundary>
	</React.StrictMode>,
);
