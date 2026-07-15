import React, { useEffect, useRef, useState } from 'react';
import { useMatchStore, useNetwork } from '@/store/store';
import Button from '@/ui/Button';
import type Game from '@game/scenes/Game';
import { motion } from 'framer-motion';
import { submitScore, settleWager, cancelWager, reportChallengeProgress } from '@/lib/devvit-bridge';
import { useNavigate } from 'react-router-dom';

export default function GameOver({ game }: { game: Game }) {
    const navigate = useNavigate();
    const { state, time } = useMatchStore();
    const { network, code, wagerAmount } = useNetwork();
    const hasSubmitted = useRef(false);
    const matchStartTime = useRef(Date.now());
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [wagerOutcome, setWagerOutcome] = useState<{ won: boolean; prize: number } | null>(null);
    const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    const stats = state === 'OVER'
        ? game.tanks.array.map(tank => ({
            pseudo: tank.pseudo,
            kills: tank.kills,
            deaths: tank.deaths,
            xp: tank.xp,
            isLocal: tank.uuid === game.player?.uuid,
        })).sort((a, b) => b.xp - a.xp)
        : [];

    const localStats = stats.find(s => s.isLocal);

    useEffect(() => {
        if (state !== 'OVER' || hasSubmitted.current || !localStats) return;
        hasSubmitted.current = true;
        setSubmitStatus('submitting');

        const winner = stats[0];
        // Persist last match for splash screen comeback hook
        try {
            localStorage.setItem('bt_last_match', JSON.stringify({
                kills: localStats.kills,
                deaths: localStats.deaths,
                xp: localStats.xp,
                won: winner?.isLocal ?? false,
                ts: Date.now(),
            }));
        } catch { /* storage may be blocked in sandboxed iframe */ }

        submitScore(localStats.kills, localStats.deaths, localStats.xp)
            .then(() => setSubmitStatus('success'))
            .catch(err => {
                console.error('[DevvitBridge] Failed to submit score:', err);
                setSubmitStatus('error');
            });

        // Settle wager — only host settles, only for real wager matches
        if (code && code !== 'OFFLINE' && network?.isHost && wagerAmount > 0) {
            const hostWon = winner?.isLocal ?? false;
            settleWager(code, hostWon)
                .then((res: any) => {
                    if (res?.prize) setWagerOutcome({ won: hostWon, prize: res.prize });
                })
                .catch(() => {
                    // Settle failed — refund both players so XP isn't stuck indefinitely
                    cancelWager(code).catch(() => {});
                });
        }

        // Report wager win challenge — only for actual wager matches (not free multiplayer)
        if (winner?.isLocal && code && code !== 'OFFLINE' && wagerAmount > 0) {
            reportChallengeProgress('wager_win', 1).catch(() => {});
        }

        // Report other challenge progress
        const survivedSeconds = Math.floor((Date.now() - matchStartTime.current) / 1000);
        if (localStats.kills > 0) reportChallengeProgress('kills', localStats.kills).catch(() => {});
        if (survivedSeconds > 0) reportChallengeProgress('survive', survivedSeconds).catch(() => {});
        reportChallengeProgress('matches', 1).catch(() => {});
    }, [state, localStats]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (state === 'OVER' && e.key === 'Escape') {
                network?.disconnect();
                navigate('/');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state, network, navigate]);

    if (state !== 'OVER') return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md'
        >
            <motion.h1
                initial={{ scale: 0.8, y: -50 }}
                animate={{ scale: 1, y: 0 }}
                className='mb-8 text-6xl font-black text-toonks-orange drop-shadow-2xl'
            >
                MATCH OVER
            </motion.h1>

            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className='w-full max-w-2xl rounded-2xl bg-slate-900/90 p-4 shadow-2xl border border-slate-700/50'
                style={{ padding: '16px' }}
            >
                {/* Responsive scroll wrapper — prevents horizontal overflow on mobile */}
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: 320, borderCollapse: 'collapse', fontSize: '0.95rem', color: '#d1d5db' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #374151', fontSize: '0.75rem', textTransform: 'uppercase', color: '#9ca3af' }}>
                                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Player</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Kills</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Deaths</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', color: '#f97316' }}>XP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s, i) => (
                                <tr key={i} style={{
                                    borderBottom: '1px solid rgba(55,65,81,0.5)',
                                    background: s.isLocal ? 'rgba(249,115,22,0.12)' : 'transparent',
                                }}>
                                    <td style={{ padding: '12px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                                        {i === 0 && <span style={{ marginRight: 6, color: '#eab308', fontWeight: 800, fontSize: '0.75rem' }}>1ST</span>}
                                        {s.pseudo}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'monospace' }}>{s.kills}</td>
                                    <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'monospace' }}>{s.deaths}</td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#f97316', fontFamily: 'monospace' }}>+{s.xp}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Wager outcome banner */}
                {wagerOutcome && (
                    <div style={{
                        marginTop: 12,
                        padding: '10px 14px',
                        borderRadius: 10,
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        background: wagerOutcome.won ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.12)',
                        border: `1px solid ${wagerOutcome.won ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.25)'}`,
                        color: wagerOutcome.won ? '#4ade80' : '#f87171',
                    }}>
                        {wagerOutcome.won
                            ? `⚔️ Wager won! +${wagerOutcome.prize} XP`
                            : `⚔️ Wager lost. Better luck next time.`}
                    </div>
                )}

                <div style={{ marginTop: 12, textAlign: 'center', fontSize: '0.85rem' }}>
                    {submitStatus === 'submitting' && (
                        <span style={{ color: '#facc15' }}>Saving results to leaderboard...</span>
                    )}
                    {submitStatus === 'success' && (
                        <span style={{ color: '#4ade80' }}>Results saved to Reddit leaderboard!</span>
                    )}
                    {submitStatus === 'error' && (
                        <span style={{ color: '#f87171' }}>Could not save score. Check your connection.</span>
                    )}
                </div>

                {!isMobile && (
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #1f2937', textAlign: 'center' }}>
                        <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>Press Esc to exit</p>
                    </div>
                )}
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}
            >
                <Button onClick={() => { network?.disconnect(); navigate('/'); }}>
                    ⚡ Play Again
                </Button>
            </motion.div>
        </motion.div>
    );
}
