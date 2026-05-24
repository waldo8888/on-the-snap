import React from 'react';
import MenuUI from '@/components/MenuUI';
import Navbar from '@/components/Navbar';

export const metadata = {
    title: 'Menu - On The Snap',
    description: 'View our delicious food, drinks, and student specials at On The Snap pool hall in Hamilton.',
    alternates: {
        canonical: 'https://onthesnap.ca/menu',
    },
    openGraph: {
        title: 'Menu - On The Snap',
        description: 'View our delicious food, drinks, and student specials at On The Snap pool hall in Hamilton.',
        url: 'https://onthesnap.ca/menu',
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
};

export default function MenuPage() {
    return (
        <main>
            <Navbar />
            <MenuUI />
        </main>
    );
}
