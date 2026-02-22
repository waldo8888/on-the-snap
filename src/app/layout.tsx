import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry';
import Footer from '@/components/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://onthesnap.ca'),
  title: 'On The Snap | Billiards & Lounge in Hamilton',
  description: "Hamilton's premier pool hall and lounge. 15 tournament-grade tables, darts, craft cocktails, live streaming, and competitive leagues. Stoney Creek, ON.",
  openGraph: {
    title: 'On The Snap | Billiards & Lounge in Hamilton',
    description: "Hamilton's premier pool hall and lounge. 15 tournament-grade tables, darts, craft cocktails, and competitive leagues in Stoney Creek, ON.",
    url: 'https://onthesnap.ca',
    siteName: 'On The Snap',
    images: [
      {
        url: '/images/venue_tables_1.jpg',
        width: 1200,
        height: 630,
        alt: 'On The Snap — Premium pool tables in Hamilton, Ontario',
      },
    ],
    locale: 'en_CA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'On The Snap | Billiards & Lounge in Hamilton',
    description: "Hamilton's premier pool hall. 15 tables, darts, leagues & live streaming.",
    images: ['/images/venue_tables_1.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased">
        <AppRouterCacheProvider>
          <ThemeRegistry>
            {children}
            <Footer />
          </ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
