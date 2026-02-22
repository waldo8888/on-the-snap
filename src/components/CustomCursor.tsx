'use client';

import { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
    const dotRef = useRef<HTMLDivElement>(null);
    const ringWrapRef = useRef<HTMLDivElement>(null);
    const mousePos = useRef({ x: -200, y: -200 });
    const ringPos = useRef({ x: -200, y: -200 });
    const rafRef = useRef<number>(0);

    const [hovering, setHovering] = useState(false);
    const [clicking, setClicking] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Only activate on mouse/trackpad devices — skip touch
        if (window.matchMedia('(pointer: coarse)').matches) return;

        const INTERACTIVE = 'a, button, [role="button"], input, select, textarea, label, [tabindex]';

        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

        let active = true;
        const tick = () => {
            if (!active) return;
            ringPos.current.x = lerp(ringPos.current.x, mousePos.current.x, 0.1);
            ringPos.current.y = lerp(ringPos.current.y, mousePos.current.y, 0.1);
            if (ringWrapRef.current) {
                ringWrapRef.current.style.transform = `translate(${ringPos.current.x}px, ${ringPos.current.y}px)`;
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);

        const onMove = (e: MouseEvent) => {
            mousePos.current = { x: e.clientX, y: e.clientY };
            if (dotRef.current) {
                dotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
            }
            setVisible(true);
        };

        // Event delegation — no need to attach per-element or use MutationObserver
        const onOver = (e: MouseEvent) => {
            if ((e.target as Element).closest(INTERACTIVE)) setHovering(true);
        };
        const onOut = (e: MouseEvent) => {
            const to = e.relatedTarget as Element | null;
            if (!to?.closest(INTERACTIVE)) setHovering(false);
        };

        const onDown = () => setClicking(true);
        const onUp = () => setClicking(false);
        const onDocLeave = () => setVisible(false);
        const onDocEnter = () => setVisible(true);

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseover', onOver);
        document.addEventListener('mouseout', onOut);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('mouseleave', onDocLeave);
        document.addEventListener('mouseenter', onDocEnter);

        return () => {
            active = false;
            cancelAnimationFrame(rafRef.current);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseover', onOver);
            document.removeEventListener('mouseout', onOut);
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('mouseleave', onDocLeave);
            document.removeEventListener('mouseenter', onDocEnter);
        };
    }, []);

    return (
        <>
            {/* Gold dot — snaps instantly to cursor position */}
            <div
                ref={dotRef}
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#D4AF37',
                    pointerEvents: 'none',
                    zIndex: 99999,
                    opacity: visible ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    willChange: 'transform',
                }}
            />

            {/* Ring outer wrapper — position driven by JS lerp */}
            <div
                ref={ringWrapRef}
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    pointerEvents: 'none',
                    zIndex: 99998,
                    willChange: 'transform',
                }}
            >
                {/* Visual ring — all size/style transitions handled via CSS */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: hovering ? 54 : 34,
                        height: hovering ? 54 : 34,
                        transform: `translate(-50%, -50%) scale(${clicking ? 0.78 : 1})`,
                        borderRadius: '50%',
                        border: `1.5px solid rgba(212,175,55,${hovering ? 0.9 : 0.55})`,
                        backgroundColor: hovering ? 'rgba(212,175,55,0.07)' : 'transparent',
                        opacity: visible ? 1 : 0,
                        transition: [
                            'width 0.42s cubic-bezier(0.16,1,0.3,1)',
                            'height 0.42s cubic-bezier(0.16,1,0.3,1)',
                            'border-color 0.3s ease',
                            'background-color 0.3s ease',
                            'opacity 0.3s ease',
                            'transform 0.12s ease',
                        ].join(', '),
                    }}
                >
                    {/* Crosshair — horizontal line, suggests billiards aiming */}
                    <span
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: 8,
                            right: 8,
                            height: 1,
                            backgroundColor: 'rgba(212,175,55,0.4)',
                            transform: 'translateY(-50%)',
                            opacity: hovering ? 1 : 0,
                            transition: 'opacity 0.25s ease',
                        }}
                    />
                    {/* Crosshair — vertical line */}
                    <span
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: 8,
                            bottom: 8,
                            width: 1,
                            backgroundColor: 'rgba(212,175,55,0.4)',
                            transform: 'translateX(-50%)',
                            opacity: hovering ? 1 : 0,
                            transition: 'opacity 0.25s ease',
                        }}
                    />
                </div>
            </div>
        </>
    );
}
