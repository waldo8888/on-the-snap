import type { TouchEvent as ReactTouchEvent, WheelEvent as ReactWheelEvent } from 'react';

// ============================================================
// Constants
// ============================================================

export const GOLD = '#D4AF37';
export const BG_DARK = '#050505';
export const BG_CARD = '#0a0a0a';
export const BORDER = 'rgba(212,175,55,0.15)';

export const DIALOG_PAPER_SX = {
  bgcolor: '#111111',
  border: `1px solid ${BORDER}`,
  borderRadius: 2,
  backgroundImage: 'none',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
} as const;

/** Prevents trackpad/touch scroll from leaking through dialogs to the page behind.
 *  - flex + minHeight: 0 ensures the DialogContent shrinks and scrolls inside the flex Paper
 *  - overscrollBehavior: contain stops scroll events from leaking to the page */
export const DIALOG_CONTENT_SX = {
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto' as const,
  overscrollBehavior: 'contain',
  WebkitOverflowScrolling: 'touch',
};

function stopScrollPropagation(event: ReactWheelEvent<HTMLElement> | ReactTouchEvent<HTMLElement>) {
  event.stopPropagation();
}

export const DIALOG_SCROLL_CONTAIN_PROPS = {
  onWheelCapture: stopScrollPropagation,
  onTouchMoveCapture: stopScrollPropagation,
} as const;

// ============================================================
// Form State
// ============================================================

export interface PlayerFormData {
  name: string;
  email: string;
  phone: string;
  handicap: number;
  notes: string;
  seed: number | null;
}

export const emptyForm: PlayerFormData = {
  name: '',
  email: '',
  phone: '',
  handicap: 0,
  notes: '',
  seed: null,
};
