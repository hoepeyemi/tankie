import React from 'react';
import { useNetwork, usePlayerSettings } from '@/store/store';
import Button from '@/ui/Button';

export default function QuickPlayTab() {
    const { quickPlay } = useNetwork();
    const { name, tank } = usePlayerSettings();

    return (
        <div className='space-y-4 md:space-y-6'>
            <h2 className='text-center text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-2xl'>
                Ready for Quick Play?
            </h2>
            <Button onClick={() => quickPlay({ name, tank })} fullWidth size='large'>
                Start Game
            </Button>
        </div>
    );
}
