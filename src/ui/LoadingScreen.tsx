import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type LoadingScreenProps = {
    progress: number; // 0-100 from game engine
    onComplete: () => void;
};

export default function LoadingScreen({ progress, onComplete }: LoadingScreenProps) {
    const [phase, setPhase] = useState<'loading' | 'ready' | 'done'>('loading');

    // Once progress reaches 100%, show "ready" briefly then dismiss
    useEffect(() => {
        if (progress >= 100 && phase === 'loading') {
            setPhase('ready');
            setTimeout(() => {
                setPhase('done');
                onComplete();
            }, 800);
        }
    }, [progress, phase]);

    if (phase === 'done') return null;

    // Compute display label based on progress
    const getLabel = () => {
        if (phase === 'ready') return 'Ready!';
        if (progress < 20) return 'Loading Models...';
        if (progress < 55) return 'Loading Assets...';
        if (progress < 75) return 'Building World...';
        if (progress < 90) return 'Spawning Tanks...';
        return 'Generating Terrain...';
    };

    return (
        <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'radial-gradient(ellipse at center, #1e293b 0%, #0f172a 70%, #020617 100%)',
            }}
        >
            {/* Logo */}
            <motion.img
                src='/Blasttankslogo.png'
                alt='Blast Tanks'
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                    width: 220,
                    height: 220,
                    objectFit: 'contain',
                    marginBottom: 32,
                    filter: 'drop-shadow(0 8px 24px rgba(249, 115, 22, 0.3))',
                }}
            />

            {/* Progress bar */}
            <div style={{
                width: 320,
                height: 6,
                borderRadius: 999,
                background: '#1e293b',
                border: '1px solid #334155',
                overflow: 'hidden',
                marginBottom: 12,
            }}>
                <motion.div
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    style={{
                        height: '100%',
                        borderRadius: 999,
                        background: 'linear-gradient(90deg, #f97316, #fb923c)',
                    }}
                />
            </div>

            {/* Status text */}
            <p style={{
                color: phase === 'ready' ? '#f97316' : '#94a3b8',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
            }}>
                {getLabel()}
            </p>

            {/* Platform hints */}
            <div style={{
                marginTop: 28,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
            }}>
                <div style={{ display: 'flex', gap: 16 }}>
                    {[
                        { icon: '🖥️', label: 'Desktop', sub: 'WASD + Mouse' },
                        { icon: '📱', label: 'Mobile', sub: 'Touch joystick' },
                    ].map(p => (
                        <div key={p.label} style={{
                            textAlign: 'center',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 10,
                            padding: '10px 18px',
                        }}>
                            <div style={{ fontSize: 22, marginBottom: 4 }}>{p.icon}</div>
                            <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{p.label}</div>
                            <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>{p.sub}</div>
                        </div>
                    ))}
                </div>
                <p style={{ color: '#475569', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>
                    Best enjoyed with headphones
                </p>
            </div>

            {/* Bottom branding */}
            <p style={{
                position: 'absolute',
                bottom: 24,
                color: '#475569',
                fontSize: 11,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
            }}>
                Blast Tanks
            </p>
        </motion.div>
    );
}

