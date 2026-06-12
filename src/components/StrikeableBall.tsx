'use client';

import { motion, useAnimationControls } from 'framer-motion';
import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';

/**
 * Wraps a decorative pool ball and makes it react to clicks like a cue strike:
 * the ball shoots away from the point of impact (clicking its left edge sends
 * it right), with centre hits transferring more power than glancing edge hits.
 * After the "shot" it lazily rolls back to its resting spot.
 */
export default function StrikeableBall({
    children,
    distance = 110,
    style,
}: {
    children: ReactNode;
    /** Maximum travel distance in px for a dead-centre hit */
    distance?: number;
    style?: CSSProperties;
}) {
    const controls = useAnimationControls();
    const striking = useRef(false);
    const [flying, setFlying] = useState(false);

    const handleStrike = async (e: PointerEvent<HTMLDivElement>) => {
        if (striking.current) return;
        striking.current = true;
        setFlying(true);

        const rect = e.currentTarget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // Direction of travel: from the strike point through the ball's centre.
        let dx = cx - e.clientX;
        let dy = cy - e.clientY;
        const offCentre = Math.hypot(dx, dy);

        if (offCentre < 1) {
            // Dead-centre hit — pick a random direction, full power.
            const angle = Math.random() * Math.PI * 2;
            dx = Math.cos(angle);
            dy = Math.sin(angle);
        } else {
            dx /= offCentre;
            dy /= offCentre;
        }

        // Centre hits transfer more force than glancing edge hits.
        const radius = Math.max(rect.width, rect.height) / 2;
        const power = offCentre < 1 ? 1 : Math.max(0.35, 1 - (offCentre / radius) * 0.6);
        const travel = distance * power;
        const spin = (dx >= 0 ? 1 : -1) * (420 + Math.random() * 240) * power;

        try {
            // Fast launch that decays like rolling friction…
            await controls.start({
                x: dx * travel,
                y: dy * travel,
                rotate: spin,
                transition: { duration: 0.6, ease: [0.13, 0.9, 0.3, 1] },
            });
            // …then a lazy roll back to the resting spot.
            await controls.start({
                x: 0,
                y: 0,
                rotate: 0,
                transition: { type: 'spring', stiffness: 45, damping: 14, mass: 1.1 },
            });
        } finally {
            striking.current = false;
            setFlying(false);
        }
    };

    return (
        <motion.div
            animate={controls}
            onPointerDown={handleStrike}
            aria-hidden="true"
            tabIndex={-1}
            style={{
                display: 'inline-flex',
                cursor: 'pointer',
                touchAction: 'manipulation',
                position: 'relative',
                zIndex: flying ? 20 : undefined,
                ...style,
            }}
        >
            {children}
        </motion.div>
    );
}
