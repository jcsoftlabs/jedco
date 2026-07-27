"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

export type Ville = {
  nom: string;
  lat: number;
  lng: number;
  description: string;
};

// Icône personnalisée aux couleurs JEDCO plutôt que le marqueur bleu/rouge
// par défaut de Leaflet — dont les images (marker-icon.png) ne se
// chargeraient de toute façon pas correctement une fois passées par le
// bundler Next.js sans configuration supplémentaire.
function icone(numero: number, actif: boolean): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;border-radius:9999px;
      background:${actif ? "#0F2F52" : "#1A4F8A"};
      border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
      color:white;font:700 12px system-ui,sans-serif;
    ">${numero}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

// Cadre la carte pour que les 5 villes soient toutes visibles au chargement,
// sans centre/zoom fixé à la main — si une ville est ajoutée plus tard, la
// carte s'ajuste d'elle-même.
function CadrerSurVilles({ villes }: { villes: Ville[] }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(villes.map((v) => [v.lat, v.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [map, villes]);
  return null;
}

export default function CoverageMap({
  villes,
  survole,
  onSurvol,
  onChoisir,
}: {
  villes: Ville[];
  survole: string | null;
  onSurvol: (nom: string | null) => void;
  onChoisir: (nom: string) => void;
}) {
  return (
    <MapContainer
      center={[19.0, -72.7]}
      zoom={8}
      scrollWheelZoom={false}
      className="h-[420px] w-full rounded-xl border border-slate-200"
      attributionControl={true}
    >
      {/* Tuiles OpenStreetMap standard — gratuites, sans clé API. L'attribution
          ci-dessous est une obligation de la licence ODbL, pas une option. */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <CadrerSurVilles villes={villes} />
      {villes.map((v, i) => (
        <Marker
          key={v.nom}
          position={[v.lat, v.lng]}
          icon={icone(i + 1, survole === v.nom)}
          eventHandlers={{
            mouseover: () => onSurvol(v.nom),
            mouseout: () => onSurvol(null),
            click: () => onChoisir(v.nom),
          }}
        >
          <Popup>
            <strong>{v.nom}</strong>
            <br />
            {v.description}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
