import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation } from "lucide-react";

interface LocationPickerProps {
  lat: number;
  lng: number;
  governorate?: string;
  language: string;
  onChange: (lat: number, lng: number) => void;
}

function createPickerIcon() {
  return L.divIcon({
    className: "location-picker-icon",
    html: `
      <div style="position:relative;width:36px;height:44px;">
        <div style="
          width:36px;height:36px;
          background:linear-gradient(135deg,#D4AF37 0%,#F4E5A1 100%);
          border:3px solid white;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 4px 12px rgba(212,175,55,0.6);
          display:flex;align-items:center;justify-content:center;
        ">
          <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;">
            <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'>
              <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'/><circle cx='12' cy='10' r='3'/>
            </svg>
          </div>
        </div>
        <div style="
          position:absolute;bottom:0;left:50%;transform:translateX(-50%);
          width:6px;height:6px;border-radius:50%;
          background:rgba(212,175,55,0.5);
        "></div>
      </div>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
  });
}

export default function LocationPicker({
  lat,
  lng,
  governorate,
  language,
  onChange,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [currentLat, setCurrentLat] = useState(lat);
  const [currentLng, setCurrentLng] = useState(lng);
  const ar = language === "ar";

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, { zoomControl: false }).setView([lat, lng], 12);
    mapInstanceRef.current = map;

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const icon = createPickerIcon();
    const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
    markerRef.current = marker;

    // Click on map to move marker
    map.on("click", (e) => {
      const { lat: newLat, lng: newLng } = e.latlng;
      marker.setLatLng([newLat, newLng]);
      setCurrentLat(parseFloat(newLat.toFixed(6)));
      setCurrentLng(parseFloat(newLng.toFixed(6)));
      onChange(parseFloat(newLat.toFixed(6)), parseFloat(newLng.toFixed(6)));
    });

    // Drag marker
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setCurrentLat(parseFloat(pos.lat.toFixed(6)));
      setCurrentLng(parseFloat(pos.lng.toFixed(6)));
      onChange(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng]);

  const resetToCenter = () => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    mapInstanceRef.current.setView([lat, lng], 12);
    setCurrentLat(lat);
    setCurrentLng(lng);
    onChange(lat, lng);
  };

  return (
    <div className="space-y-3">
      {/* Map instruction banner */}
      <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
        <Navigation className="w-4 h-4 text-accent shrink-0" />
        <p className="text-sm text-accent font-medium">
          {ar
            ? "انقر على الخريطة أو اسحب العلامة لتحديد الموقع الدقيق للعقار"
            : "Click on the map or drag the pin to set the exact property location"}
        </p>
      </div>

      {/* Leaflet Map */}
      <div
        ref={mapRef}
        className="w-full rounded-2xl overflow-hidden border-2 border-accent/30 shadow-lg cursor-crosshair"
        style={{ height: 320 }}
      />

      {/* Coordinates display */}
      <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-muted-foreground">
            {ar ? "الإحداثيات المحددة:" : "Selected coordinates:"}
          </span>
          <span className="font-mono text-sm font-bold text-primary" dir="ltr">
            {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
          </span>
        </div>
        <button
          onClick={resetToCenter}
          className="text-xs px-3 py-1 bg-accent/10 text-accent hover:bg-accent/20 rounded-lg transition-colors font-bold"
        >
          {ar ? "إعادة ضبط" : "Reset"}
        </button>
      </div>
    </div>
  );
}
