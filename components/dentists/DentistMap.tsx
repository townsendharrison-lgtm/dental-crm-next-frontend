"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import type { Dentist } from "@/lib/types";

// Import Leaflet styles directly
import "leaflet/dist/leaflet.css";

// Configure default marker icons
const DEFAULT_DENTIST_ICON = L.icon({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Fix default icon issue with bundlers
if (typeof window !== "undefined") {
  // @ts-ignore
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

interface FitBoundsToMarkersProps {
  points: Array<[number, number]>;
}

const FitBoundsToMarkers: React.FC<FitBoundsToMarkersProps> = ({ points }) => {
  const map = useMap();
  const pointsKey = JSON.stringify(points);

  useEffect(() => {
    // Invalidate size immediately so Leaflet container centers correctly
    setTimeout(() => {
      map.invalidateSize();
    }, 50);

    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [pointsKey, map]);

  return null;
};

interface DentistMapProps {
  sortedDentists: Dentist[];
  searchOrigin: { lat: number; lng: number; label: string } | null;
  userLocation: { lat: number; lng: number } | null;
  locationEnabled: boolean;
  onReportDentist: (dentist: Dentist) => void;
}

export default function DentistMap({
  sortedDentists,
  searchOrigin,
  userLocation,
  locationEnabled,
  onReportDentist,
}: DentistMapProps) {
  const mapDentists = sortedDentists.filter((d) => d.latitude && d.longitude);

  // Offset overlapping markers so ALL pins are visible.
  // Multiple dentists at the same address share identical coordinates — their pins stack.
  // We spread them in a small circle around the actual coordinate.
  const positionMap = new Map<string, Array<{ npi: string; lat: number; lng: number }>>();
  mapDentists.forEach((d) => {
    const key = `${d.latitude!.toFixed(5)},${d.longitude!.toFixed(5)}`;
    if (!positionMap.has(key)) positionMap.set(key, []);
    positionMap.get(key)!.push({ npi: d.npi, lat: d.latitude!, lng: d.longitude! });
  });

  const adjustedPositions = new Map<string, [number, number]>();
  positionMap.forEach((group) => {
    if (group.length === 1) {
      adjustedPositions.set(group[0].npi, [group[0].lat, group[0].lng]);
    } else {
      const angleStep = (2 * Math.PI) / group.length;
      const offsetRadius = 0.0004; // ~40 meters
      group.forEach((item, i) => {
        adjustedPositions.set(item.npi, [
          item.lat + offsetRadius * Math.cos(angleStep * i),
          item.lng + offsetRadius * Math.sin(angleStep * i),
        ]);
      });
    }
  });

  const points: Array<[number, number]> = Array.from(adjustedPositions.values());
  if (searchOrigin) points.push([searchOrigin.lat, searchOrigin.lng]);

  const initialCenter: [number, number] = searchOrigin
    ? [searchOrigin.lat, searchOrigin.lng]
    : userLocation
    ? [userLocation.lat, userLocation.lng]
    : [37.0902, -95.7129];

  return (
    <MapContainer
      center={initialCenter}
      zoom={searchOrigin || userLocation ? 11 : 4}
      style={{ height: "100%", width: "100%" }}
      className="z-10"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <FitBoundsToMarkers points={points} />
      {searchOrigin && (
        <CircleMarker
          center={[searchOrigin.lat, searchOrigin.lng]}
          radius={8}
          pathOptions={{
            color: "#6366f1",
            fillColor: "#6366f1",
            fillOpacity: 0.6,
            weight: 2,
          }}
        >
          <Popup>
            <div className="p-1 text-slate-900 font-sans">
              <p className="text-xs font-bold">Search location</p>
              <p className="text-[10px] text-slate-600">{searchOrigin.label}</p>
            </div>
          </Popup>
        </CircleMarker>
      )}
      {mapDentists.map((dentist) => {
        const pos = adjustedPositions.get(dentist.npi) || [
          dentist.latitude!,
          dentist.longitude!,
        ];
        return (
          <Marker key={dentist.npi} position={pos} icon={DEFAULT_DENTIST_ICON}>
            <Popup>
              <div className="p-2 min-w-[200px] text-slate-900 font-sans">
                <p className="font-bold text-sm mb-0.5">{dentist.name}</p>
                <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">
                  {dentist.specialty}
                </p>
                <p className="text-xs text-slate-600 mb-1 leading-normal">
                  {dentist.address}, {dentist.city}, {dentist.state} {dentist.zip}
                </p>
                {locationEnabled && dentist.distance !== undefined && (
                  <p className="text-[10px] font-bold text-indigo-500 mb-2">
                    {dentist.distance.toFixed(1)} mi{userLocation ? " from you" : ""}
                  </p>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                  <span className="text-[10px] font-bold text-emerald-600">
                    {dentist.shadowStats?.totalReports
                      ? `${dentist.shadowStats.allowedPercentage}%`
                      : "0%"} Shadow-Friendly
                  </span>
                  <button
                    type="button"
                    onClick={() => onReportDentist(dentist)}
                    className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Report
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
