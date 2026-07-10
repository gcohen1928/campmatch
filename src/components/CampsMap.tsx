"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Camp } from "@/lib/types";
import { CampMeta } from "./CampCard";

const US_CENTER: [number, number] = [39.5, -98.35];

function pinIcon(color: string) {
  return L.divIcon({
    className: "camp-pin",
    html: `<svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 37C15 37 28 23.6 28 14A13 13 0 1 0 2 14c0 9.6 13 23 13 23Z" fill="${color}" stroke="#f8f5ee" stroke-width="2"/>
      <path d="M15 5.5c.9 4 3.6 6.7 7.5 7.5-3.9.8-6.6 3.5-7.5 7.5-.9-4-3.6-6.7-7.5-7.5 3.9-.8 6.6-3.5 7.5-7.5Z" fill="#c0a062"/>
    </svg>`,
    iconSize: [30, 38],
    iconAnchor: [15, 37],
    popupAnchor: [0, -34],
  });
}

const ICONS = {
  sleepaway: pinIcon("#0f2f23"),
  day: pinIcon("#7c2d3a"),
};

function FitToCamps({ camps }: { camps: Camp[] }) {
  const map = useMap();
  useEffect(() => {
    if (camps.length === 0) return;
    const bounds = L.latLngBounds(camps.map((c) => [c.lat, c.lng]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 9 });
  }, [map, camps]);
  return null;
}

export default function CampsMap({ camps }: { camps: Camp[] }) {
  const positions = useMemo(
    () => camps.map((c) => ({ camp: c, pos: [c.lat, c.lng] as [number, number] })),
    [camps],
  );

  return (
    <MapContainer
      center={US_CENTER}
      zoom={4}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToCamps camps={camps} />
      {positions.map(({ camp, pos }) => (
        <Marker key={camp.slug} position={pos} icon={ICONS[camp.type]}>
          <Popup>
            <div className="min-w-56 font-body">
              <h3 className="font-display text-base font-semibold leading-snug text-ink">
                {camp.name}
              </h3>
              <div className="mt-1.5">
                <CampMeta camp={camp} />
              </div>
              <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-ink-soft">
                {camp.description}
              </p>
              <Link
                href={`/camps/${camp.slug}`}
                className="mt-2.5 inline-block text-sm font-semibold text-ember hover:text-ember-deep"
              >
                See camp details →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
