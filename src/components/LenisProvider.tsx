'use client';

import { ReactLenis } from 'lenis/react';
import type { ReactNode } from 'react';

export default function LenisProvider({ children }: { children: ReactNode }) {
    return (
        <ReactLenis
            root
            options={{
                duration: 0.9,
                easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothWheel: true,
                touchMultiplier: 1.25,
            }}
        >
            {children}
        </ReactLenis>
    );
}
