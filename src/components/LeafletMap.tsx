'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const LAT = 43.2185;
const LNG = -79.7174;

export default function LeafletMap() {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const map = L.map(mapRef.current, {
            center: [LAT, LNG],
            zoom: 15,
            zoomControl: false,
            attributionControl: false,
        });

        // CartoDB Dark Matter tiles — free, no API key
        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            {
                subdomains: 'abcd',
                maxZoom: 19,
            }
        ).addTo(map);

        // Attribution in bottom-right (required by OSM/Carto)
        L.control.attribution({ position: 'bottomright' })
            .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>')
            .addTo(map);

        // Zoom control on the right
        L.control.zoom({ position: 'topright' }).addTo(map);

        // Gold marker
        const goldIcon = L.divIcon({
            className: '',
            html: `<div style="
                width: 18px; height: 18px;
                background: #D4AF37;
                border: 3px solid #F0CF70;
                border-radius: 50%;
                box-shadow: 0 0 12px rgba(212,175,55,0.7), 0 0 24px rgba(212,175,55,0.3);
            "></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
        });

        L.marker([LAT, LNG], { icon: goldIcon })
            .addTo(map)
            .bindPopup(
                `<div style="font-family:sans-serif;text-align:center;padding:4px 0;">
                    <strong style="font-size:14px;">On The Snap</strong><br/>
                    <span style="font-size:12px;color:#666;">152 Gray Rd, Stoney Creek</span>
                </div>`,
                { closeButton: false, offset: [0, -4] }
            );

        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    return (
        <div
            ref={mapRef}
            style={{ width: '100%', height: '100%' }}
        />
    );
}
