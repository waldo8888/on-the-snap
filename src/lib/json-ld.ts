import type { Tournament } from './tournament-engine/types';

export function LocalBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    '@id': 'https://onthesnap.ca/#business',
    name: 'On The Snap Billiards & Lounge',
    alternateName: 'On The Snap',
    url: 'https://onthesnap.ca',
    telephone: '+19059307688',
    image: 'https://onthesnap.ca/images/venue_tables_1.jpg',
    logo: 'https://onthesnap.ca/images/onthesnap_logo.png',
    description:
      "Hamilton's premier pool hall and lounge. 15 tournament-grade tables, darts, craft cocktails, live streaming, and competitive leagues.",
    address: {
      '@type': 'PostalAddress',
      streetAddress: '152 Gray Rd',
      addressLocality: 'Stoney Creek',
      addressRegion: 'ON',
      postalCode: 'L8G 3V2',
      addressCountry: 'CA',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 43.2185,
      longitude: -79.7174,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '16:00',
        closes: '02:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday', 'Sunday'],
        opens: '11:00',
        closes: '02:00',
      },
    ],
    sameAs: [
      'https://www.facebook.com/profile.php?id=100082684215769',
      'https://www.instagram.com/onthesnap_inthecreek',
      'https://youtube.com/@onthesnap',
    ],
    priceRange: '$$',
    currenciesAccepted: 'CAD',
    paymentAccepted: 'Cash, Credit Card, Debit Card',
  };
}

export function SportsEventJsonLd(tournament: Tournament) {
  const statusMap: Record<string, string> = {
    cancelled: 'https://schema.org/EventCancelled',
    completed: 'https://schema.org/EventPostponed',
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: tournament.title,
    description:
      tournament.description ||
      `${tournament.title} — ${tournament.game_type.replace(/_/g, ' ')} tournament at On The Snap`,
    url: `https://onthesnap.ca/tournaments/${tournament.slug}`,
    startDate: tournament.tournament_start_at,
    eventStatus: statusMap[tournament.status] || 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: tournament.venue_name || 'On The Snap Billiards & Lounge',
      address: {
        '@type': 'PostalAddress',
        streetAddress: tournament.venue_address || '152 Gray Rd',
        addressLocality: 'Stoney Creek',
        addressRegion: 'ON',
        postalCode: 'L8G 3V2',
        addressCountry: 'CA',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'On The Snap Billiards & Lounge',
      url: 'https://onthesnap.ca',
    },
    ...(tournament.entry_fee > 0
      ? {
          offers: {
            '@type': 'Offer',
            price: tournament.entry_fee,
            priceCurrency: 'CAD',
            availability:
              tournament.status === 'open'
                ? 'https://schema.org/InStock'
                : 'https://schema.org/SoldOut',
          },
        }
      : {}),
    sport: 'Billiards',
  };
}

export function BreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
