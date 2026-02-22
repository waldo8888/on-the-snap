import React from 'react';
import MenuUI from '@/components/MenuUI';
import Navbar from '@/components/Navbar';

export const metadata = {
    title: 'Menu - On The Snap',
    description: 'View our delicious food, drinks, and student specials at On The Snap pool hall in Hamilton.',
};

export default function MenuPage() {
    return (
        <main>
            <Navbar />
            <MenuUI />
        </main>
    );
}
