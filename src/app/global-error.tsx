'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#070707', fontFamily: 'Inter, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '24px',
          }}
        >
          <h1 style={{ color: '#f5f5f0', fontFamily: '"Playfair Display", serif', fontSize: '1.5rem', margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#a0a0a0', fontSize: '0.9rem', margin: 0 }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '8px',
              padding: '8px 20px',
              color: '#D4AF37',
              backgroundColor: 'transparent',
              border: '1px solid #D4AF37',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
