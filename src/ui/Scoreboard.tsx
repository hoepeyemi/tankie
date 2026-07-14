import React, { useEffect, useState } from 'react';
import type Game from '@game/scenes/Game';
import { useMatchStore } from '@/store/store';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function Scoreboard({ game }: { game: Game }) {
    const { time } = useMatchStore();
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [stats, setStats] = useState<any[]>([]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                setShowLeaderboard(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                setShowLeaderboard(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useEffect(() => {
        if (showLeaderboard) {
            const interval = setInterval(() => {
                const currentTanks = game.tanks.array.map(tank => ({
                    pseudo: tank.pseudo,
                    kills: tank.kills,
                    deaths: tank.deaths,
                    xp: tank.xp,
                    isLocal: tank.uuid === game.player?.uuid,
                }));
                currentTanks.sort((a, b) => b.xp - a.xp);
                setStats(currentTanks);
            }, 250);
            return () => clearInterval(interval);
        }
    }, [showLeaderboard, game]);

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className='absolute top-0 left-0 flex w-full flex-col items-center pt-4 pointer-events-none'>
            <div className='rounded-full bg-slate-900/80 px-6 py-2 border border-slate-700/50 shadow-lg backdrop-blur text-white font-mono text-2xl font-bold'>
                {formatTime(time)}
            </div>

            <AnimatePresence>
                {showLeaderboard && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className='relative mt-4 w-full max-w-2xl rounded-xl bg-slate-900/90 p-6 border border-slate-700/50 shadow-2xl backdrop-blur'
                    >
                        <h2 className='text-center text-xl font-bold text-toonks-orange mb-4'>SCOREBOARD</h2>
                        <table className='w-full text-left text-sm text-gray-300'>
                            <thead className='text-xs uppercase text-gray-400 border-b border-gray-700'>
                                <tr>
                                    <th className='px-4 py-3'>Player</th>
                                    <th className='px-4 py-3 text-center'>Kills</th>
                                    <th className='px-4 py-3 text-center'>Deaths</th>
                                    <th className='px-4 py-3 text-right text-toonks-orange'>XP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map((s, i) => (
                                    <tr key={i} className={clsx('border-b border-gray-800/50', { 'bg-toonks-orange/20': s.isLocal })}>
                                        <td className='px-4 py-3 font-medium text-white'>{s.pseudo}</td>
                                        <td className='px-4 py-3 text-center'>{s.kills}</td>
                                        <td className='px-4 py-3 text-center'>{s.deaths}</td>
                                        <td className='px-4 py-3 text-right font-bold text-toonks-orange'>{s.xp}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
