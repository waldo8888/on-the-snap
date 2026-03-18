import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'On The Snap | Billiards & Lounge',
    short_name: 'On The Snap',
    description:
      "Hamilton's premier pool hall and lounge. Tournament-grade tables, darts, craft cocktails, and competitive leagues in Stoney Creek, ON.",
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#D4AF37',
    icons: [
      {
        src: '/images/onthesnap_logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
