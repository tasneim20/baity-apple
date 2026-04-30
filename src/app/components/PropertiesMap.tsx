import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import L from "leaflet";
// @ts-ignore
import "leaflet/dist/leaflet.css";
import { MapPin, Home, DollarSign, X, Bed, Bath, Maximize, Eye, Heart, ArrowRight } from "lucide-react";
import { useApp } from "../context/AppContext";
import { governorates } from "../data/mockData";
import { normalizeGov } from "../utils/governorateUtils";

// ─── Real Jordan Governorate Coordinates ───────────────────────────────────
const GOV_COORDS: Record<string, { lat: number; lng: number }> = {
  amman:   { lat: 31.9539, lng: 35.9106 },
  zarqa:   { lat: 32.0728, lng: 36.0879 },
  irbid:   { lat: 32.5568, lng: 35.8469 },
  aqaba:   { lat: 29.5326, lng: 35.0063 },
  mafraq:  { lat: 32.3411, lng: 36.2036 },
  balqa:   { lat: 32.0318, lng: 35.7314 },
  karak:   { lat: 31.1847, lng: 35.7024 },
  madaba:  { lat: 31.7168, lng: 35.7935 },
  jerash:  { lat: 32.2797, lng: 35.8993 },
  ajloun:  { lat: 32.3261, lng: 35.7523 },
  maan:    { lat: 30.1928, lng: 35.7364 },
  tafilah: { lat: 30.8394, lng: 35.6055 },
};

// Arabic name → English id mapping
const GOV_AR_TO_ID: Record<string, string> = {
  "عمان": "amman", "عمّان": "amman", "الزرقاء": "zarqa", "إربد": "irbid",
  "العقبة": "aqaba", "المفرق": "mafraq", "البلقاء": "balqa",
  "الكرك": "karak", "مادبا": "madaba", "مأدبا": "madaba", "جرش": "jerash",
  "عجلون": "ajloun", "معان": "maan", "الطفيلة": "tafilah",
};

interface Property {
  id: string;
  title: string;
  type: string;
  category: string;
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  governorate: string;
  location: { lat: number; lng: number };
  image: string;
  description: string;
  views: number;
  inquiries: number;
}

interface PropertiesMapProps {
  properties: Property[];
  language: string;
  onPropertyClick?: (propertyId: string) => void;
}

interface PopupState {
  property: Property;
  x: number;
  y: number;
}

const CARD_W = 300;
const CARD_H = 370;
const ARROW_H = 12;

// ─── Skeleton loader ───────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="absolute bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-border z-[1000] flex flex-col animate-pulse"
      style={{ width: CARD_W, left: 0, top: 0, opacity: 0.95 }}>
      <div className="w-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" style={{ height: 150 }} />
      <div className="p-3 flex flex-col gap-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/2" />
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-2/3" />
        <div className="flex gap-3 pt-2 border-t border-border">
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-10" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-10" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-14 ms-auto" />
        </div>
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Popup card ────────────────────────────────────────────────────────────
function PropertyPopupCard({
  popup, language, mapSize, onClose, onViewDetails,
}: {
  popup: PopupState;
  language: string;
  mapSize: { w: number; h: number };
  onClose: () => void;
  onViewDetails: () => void;
}) {
  const { toggleFavorite, isFavorite } = useApp();
  const wishlisted = isFavorite(popup.property.id);
  const [imgLoaded, setImgLoaded] = useState(false);

  let left = popup.x - CARD_W / 2;
  let top = popup.y - CARD_H - ARROW_H - 4;
  let arrowBelow = false;

  left = Math.max(8, Math.min(left, mapSize.w - CARD_W - 8));

  if (top < 8) {
    top = popup.y + 20;
    arrowBelow = false;
  }
  top = Math.min(top, mapSize.h - CARD_H - 8);

  const arrowLeft = Math.min(Math.max(popup.x - left, 20), CARD_W - 20);
  const property = popup.property;

  return (
    <motion.div
      key={property.id}
      initial={{ opacity: 0, scale: 0.88, y: arrowBelow ? -8 : 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: arrowBelow ? -8 : 8 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="absolute bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-visible border border-border z-[1000] flex flex-col"
      style={{ width: CARD_W, left, top, pointerEvents: "auto" }}
      onClick={(e) => e.stopPropagation()}
    >
      {!arrowBelow && (
        <div className="absolute z-10 pointer-events-none" style={{ bottom: -ARROW_H, left: arrowLeft - 10, width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "12px solid white", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.12))" }} />
      )}
      {arrowBelow && (
        <div className="absolute z-10 pointer-events-none" style={{ top: -ARROW_H, left: arrowLeft - 10, width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderBottom: "12px solid white", filter: "drop-shadow(0 -2px 4px rgba(0,0,0,0.12))" }} />
      )}

      <div className="rounded-2xl overflow-hidden flex flex-col">
        <div className="relative overflow-hidden flex-shrink-0" style={{ height: 150 }}>
          {!imgLoaded && <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" />}
          <img src={property.image} alt={property.title} loading="lazy"
            className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute top-2.5 end-2.5 flex flex-col items-end gap-1">
            <span className="px-2.5 py-0.5 bg-accent text-white rounded-full text-[11px] font-bold shadow">
              {property.category === "بيع" ? (language === "ar" ? "بيع" : "Sale") : (language === "ar" ? "إيجار" : "Rent")}
            </span>
            <span className="px-2.5 py-0.5 bg-primary/80 text-white rounded-full text-[11px] font-bold shadow">{property.type}</span>
          </div>
          <motion.button onClick={(e) => { e.stopPropagation(); toggleFavorite(property.id); }} whileTap={{ scale: 0.82 }}
            className="absolute top-2.5 start-2.5 w-7 h-7 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:bg-white transition-colors">
            <Heart className={`w-3.5 h-3.5 transition-colors ${wishlisted ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
          </motion.button>
          <motion.button onClick={onClose} whileTap={{ scale: 0.9 }}
            className="absolute bottom-2.5 start-2.5 w-6 h-6 bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors">
            <X className="w-3 h-3" />
          </motion.button>
          <div className="absolute bottom-2.5 end-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-lg text-[10px]">
            <Eye className="w-3 h-3" /><span>{property.views}</span>
          </div>
        </div>
        <div className="p-3 flex flex-col gap-2">
          <div>
            <h3 className="font-bold text-sm text-primary line-clamp-1 leading-tight">{property.title}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-accent flex-shrink-0" />
              <span className="text-xs text-muted-foreground">{property.governorate}</span>
            </div>
          </div>
          <div className="text-lg font-bold text-accent leading-tight">
            {property.price.toLocaleString()} <span className="text-sm">{language === "ar" ? "د.أ" : "JD"}</span>
            {property.category === "إيجار" && (
              <span className="text-xs font-normal text-muted-foreground ms-1">{language === "ar" ? "/شهر" : "/mo"}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border pt-2">
            {property.bedrooms > 0 && <div className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" /><span>{property.bedrooms}</span></div>}
            {property.bathrooms > 0 && <div className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" /><span>{property.bathrooms}</span></div>}
            <div className="flex items-center gap-1 ms-auto"><Maximize className="w-3.5 h-3.5" /><span>{property.area} {language === "ar" ? "م²" : "m²"}</span></div>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }} onClick={onViewDetails}
            className="w-full bg-gradient-to-r from-accent to-amber-500 text-white py-2 rounded-xl font-bold text-xs shadow shadow-accent/20 flex items-center justify-center gap-1.5 transition-shadow hover:shadow-md hover:shadow-accent/30">
            {language === "ar" ? "عرض التفاصيل" : "View Details"}
            <ArrowRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
          </motion.button>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-accent to-amber-500 flex-shrink-0" />
      </div>
    </motion.div>
  );
}

// ─── Cluster icon factory ──────────────────────────────────────────────────
function createClusterIcon(count: number) {
  const size = count > 9 ? 44 : 38;
  return L.divIcon({
    className: "custom-cluster-icon",
    html: `
      <div style="width:${size}px;height:${size}px;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(37,99,235,0.45);color:white;font-weight:800;font-size:${count > 9 ? 13 : 14}px;font-family:Tahoma,sans-serif;position:relative;">
        ${count}
        <div style="position:absolute;inset:-5px;border-radius:50%;border:2px solid rgba(37,99,235,0.35);animation:pulse-ring 2s ease-out infinite;"></div>
      </div>
      <style>@keyframes pulse-ring{0%{transform:scale(1);opacity:0.8;}100%{transform:scale(1.5);opacity:0;}}</style>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ─── Property marker icon ──────────────────────────────────────────────────
function createPropertyIcon() {
  return L.divIcon({
    className: "custom-marker-icon",
    html: `
      <div style="position:relative;width:40px;height:48px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#D4AF37 0%,#F4E5A1 100%);border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(212,175,55,0.5);display:flex;align-items:center;justify-content:center;transition:transform 0.2s ease;">
          <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;">
            <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22'/></svg>
          </div>
        </div>
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:6px;height:6px;border-radius:50%;background:rgba(212,175,55,0.6);"></div>
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 48],
  });
}

// ─── Governorate marker icon (always visible, shows count) ────────────────
function createGovernorateIcon(name: string, count: number, lang: string) {
  const bgColor = count > 0 ? "linear-gradient(135deg,#0F172A 0%,#1e3a5f 100%)" : "linear-gradient(135deg,#64748B 0%,#94A3B8 100%)";
  const countBg = count > 0 ? "#D4AF37" : "#94A3B8";
  const displayName = lang === "ar" ? name : (governorates.find(g => g.name === name)?.nameEn || name);
  return L.divIcon({
    className: "gov-marker-icon",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        <div style="background:${bgColor};border:2.5px solid white;border-radius:12px;padding:6px 10px;box-shadow:0 4px 16px rgba(0,0,0,0.3);position:relative;min-width:60px;text-align:center;">
          <div style="color:white;font-weight:800;font-size:11px;font-family:Tahoma,Arial,sans-serif;white-space:nowrap;">${displayName}</div>
          <div style="position:absolute;top:-8px;end:6px;background:${countBg};color:white;border-radius:10px;padding:1px 6px;font-size:10px;font-weight:900;font-family:Tahoma,sans-serif;border:1.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2);">${count}</div>
        </div>
        <div style="width:2px;height:8px;background:${count > 0 ? '#D4AF37' : '#94A3B8'};"></div>
        <div style="width:6px;height:6px;border-radius:50%;background:${count > 0 ? '#D4AF37' : '#94A3B8'};"></div>
      </div>
    `,
    iconSize: [80, 52],
    iconAnchor: [40, 52],
  });
}

// ─── Simple clustering logic ───────────────────────────────────────────────
function clusterProperties(properties: Property[], zoom: number) {
  const threshold = zoom >= 12 ? 0.01 : zoom >= 10 ? 0.04 : zoom >= 8 ? 0.12 : 0.3;
  const clusters: { center: { lat: number; lng: number }; items: Property[] }[] = [];
  properties.forEach((prop) => {
    if (!prop.location?.lat || !prop.location?.lng) return;
    const existing = clusters.find((c) =>
      Math.abs(c.center.lat - prop.location.lat) < threshold &&
      Math.abs(c.center.lng - prop.location.lng) < threshold
    );
    if (existing) {
      existing.items.push(prop);
      existing.center.lat = existing.items.reduce((s, p) => s + p.location.lat, 0) / existing.items.length;
      existing.center.lng = existing.items.reduce((s, p) => s + p.location.lng, 0) / existing.items.length;
    } else {
      clusters.push({ center: { lat: prop.location.lat, lng: prop.location.lng }, items: [prop] });
    }
  });
  return clusters;
}

// ─── Count properties per governorate ─────────────────────────────────────
function countByGovernorate(properties: Property[]): Record<string, number> {
  const counts: Record<string, number> = {};
  governorates.forEach((g) => { counts[g.id] = 0; });

  properties.forEach((p) => {
    // Use normalizeGov for cross-language matching:
    // CSV properties store English IDs ("amman"), user properties store Arabic names ("عمان")
    const govId = normalizeGov(p.governorate);
    if (govId && counts[govId] !== undefined) {
      counts[govId]++;
    } else if (govId) {
      // Fallback for any unrecognised canonical ID
      counts[govId] = (counts[govId] || 0) + 1;
    }
  });
  return counts;
}

// ─── Main component ────────────────────────────────────────────────────────
export default function PropertiesMap({ properties, language, onPropertyClick }: PropertiesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]);
  const govMarkersRef = useRef<L.Layer[]>([]);
  const navigate = useNavigate();
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [mapSize, setMapSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(8);

  const handlePropertyClick = (propertyId: string) => {
    if (onPropertyClick) onPropertyClick(propertyId);
    else navigate(`/property/${propertyId}`);
  };

  // Track map container size
  useEffect(() => {
    if (!mapRef.current) return;
    const update = () => {
      if (mapRef.current) setMapSize({ w: mapRef.current.offsetWidth, h: mapRef.current.offsetHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(mapRef.current);
    return () => ro.disconnect();
  }, []);

  // Render governorate markers (shown at all zoom levels)
  const renderGovernorateMarkers = useCallback(
    (map: L.Map, currentZoom: number) => {
      govMarkersRef.current.forEach((m) => map.removeLayer(m));
      govMarkersRef.current = [];

      // Only show governorate markers at zoom ≤ 10
      if (currentZoom > 10) return;

      const counts = countByGovernorate(properties);

      governorates.forEach((gov) => {
        const coords = GOV_COORDS[gov.id];
        if (!coords) return;
        const count = counts[gov.id] || 0;
        const icon = createGovernorateIcon(gov.name, count, language);
        const marker = L.marker([coords.lat, coords.lng], { icon, zIndexOffset: -100 }).addTo(map);
        govMarkersRef.current.push(marker);

        marker.on("click", () => {
          navigate(`/properties?governorate=${gov.id}`);
        });
      });
    },
    [properties, language, navigate]
  );

  // Render property markers
  const renderMarkers = useCallback(
    (map: L.Map, currentZoom: number) => {
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      // Don't show individual property markers at very low zoom
      if (currentZoom < 9) return;

      const validProperties = properties.filter((p) => p.location?.lat && p.location?.lng);
      const clusters = clusterProperties(validProperties, currentZoom);
      const propertyIcon = createPropertyIcon();

      clusters.forEach((cluster) => {
        if (cluster.items.length === 1) {
          const prop = cluster.items[0];
          const marker = L.marker([prop.location.lat, prop.location.lng], { icon: propertyIcon }).addTo(map);
          markersRef.current.push(marker);
          marker.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            map.flyTo([prop.location.lat, prop.location.lng], Math.max(map.getZoom(), 11), { duration: 0.8, easeLinearity: 0.5 });
            setTimeout(() => {
              const containerPoint = map.latLngToContainerPoint([prop.location.lat, prop.location.lng]);
              setPopup({ property: prop, x: containerPoint.x, y: containerPoint.y - 48 });
            }, 850);
          });
        } else {
          const clusterIcon = createClusterIcon(cluster.items.length);
          const marker = L.marker([cluster.center.lat, cluster.center.lng], { icon: clusterIcon }).addTo(map);
          markersRef.current.push(marker);
          marker.on("click", () => {
            map.flyTo([cluster.center.lat, cluster.center.lng], Math.min(map.getZoom() + 2, 14), { duration: 0.7 });
          });
        }
      });
    },
    [properties]
  );

  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, { zoomControl: false }).setView([31.5, 36.2], 8);
    mapInstanceRef.current = map;

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    renderGovernorateMarkers(map, 8);
    renderMarkers(map, 8);

    const updatePopupPos = () => {
      setPopup((prev) => {
        if (!prev || !prev.property.location?.lat) return null;
        const pt = map.latLngToContainerPoint([prev.property.location.lat, prev.property.location.lng]);
        return { ...prev, x: pt.x, y: pt.y - 48 };
      });
    };

    map.on("move zoom", updatePopupPos);
    map.on("click", () => setPopup(null));
    map.on("zoomend", () => {
      const z = map.getZoom();
      setZoom(z);
      renderGovernorateMarkers(map, z);
      renderMarkers(map, z);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [properties, renderMarkers, renderGovernorateMarkers]);

  // Compute stats
  const govCounts = countByGovernorate(properties);
  const activeGovs = Object.values(govCounts).filter((c) => c > 0).length;

  return (
    <div className="relative w-full h-[700px] sm:h-[800px] rounded-2xl shadow-2xl overflow-hidden border border-border/50">
      {/* Map */}
      <div ref={mapRef} className="w-full h-full rounded-2xl" />

      {/* Popup */}
      <AnimatePresence>
        {popup && (
          <PropertyPopupCard
            popup={popup}
            language={language}
            mapSize={mapSize}
            onClose={() => setPopup(null)}
            onViewDetails={() => handlePropertyClick(popup.property.id)}
          />
        )}
      </AnimatePresence>

      {/* Map Stats */}
      <div className="absolute bottom-6 start-6 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800/95 dark:to-slate-900/95 backdrop-blur-xl rounded-2xl p-5 shadow-2xl z-[999] border border-accent/10 dark:border-accent/20 min-w-[220px]">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-accent/10 dark:border-accent/20">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-amber-600 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <h4 className="text-base font-bold text-primary">
            {language === "ar" ? "إحصائيات الخريطة" : "Map Stats"}
          </h4>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">{language === "ar" ? "إجمالي العقارات" : "Total Properties"}</span>
            </div>
            <span className="text-xl font-bold text-accent">{properties.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">{language === "ar" ? "المحافظات النشطة" : "Active Governorates"}</span>
            </div>
            <span className="text-xl font-bold text-primary">{activeGovs} / 12</span>
          </div>
          {properties.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-accent/10">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-accent" />
                <span className="text-sm text-muted-foreground">{language === "ar" ? "متوسط السعر" : "Avg Price"}</span>
              </div>
              <div className="text-end">
                <div className="text-base font-bold text-accent">
                  {Math.round(properties.reduce((sum, p) => sum + p.price, 0) / properties.length).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">{language === "ar" ? "د.أ" : "JOD"}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="absolute top-6 start-1/2 -translate-x-1/2 bg-gradient-to-r from-primary/95 to-accent-blue/95 backdrop-blur-xl border border-white/20 rounded-full px-5 py-2.5 flex items-center gap-3 shadow-2xl z-[999] whitespace-nowrap">
        <div className="relative">
          <MapPin className="w-4 h-4 text-white animate-pulse" />
        </div>
        <span className="text-xs font-bold text-white">
          {language === "ar"
            ? `🗺️ ${governorates.length} محافظة أردنية — ${properties.length} عقار`
            : `🗺️ ${governorates.length} Jordanian Governorates — ${properties.length} Properties`}
        </span>
      </div>
    </div>
  );
}