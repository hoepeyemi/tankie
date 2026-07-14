import React from 'react';
import { useRedditUser } from '@/contexts/RedditContext';

export default function UnifiedWalletButton() {
	const { username, isLoggedIn, loading } = useRedditUser();

	if (loading) {
		return (
			<div className='flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-gray-400 backdrop-blur'>
				<div className='h-2 w-2 animate-pulse rounded-full bg-gray-400' />
				Loading...
			</div>
		);
	}

	return (
		<div className='flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm backdrop-blur dark:bg-gray-800/80'>
			<span className='h-2 w-2 rounded-full bg-orange-500' />
			<span className='font-medium text-gray-900 dark:text-white'>
				{isLoggedIn ? `u/${username}` : username}
			</span>
		</div>
	);
}
