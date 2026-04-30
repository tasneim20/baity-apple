import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Upload, Download, FileText, CheckCircle, AlertCircle, X,
  Calendar, User, Database, Trash2, ArrowRight, MapPin, Home,
  Zap, Clock, BarChart3, ChevronDown, AlertTriangle, Eye,
} from "lucide-react";
import AdminNavbar from "../components/AdminNavbar";
import BackButton from "../components/BackButton";
import { useApp, getValidToken } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

// ─── API endpoint ─────────────────────────────────────────────────────────────
const API = `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b`;

// ─── Constants ────────────────────────────────────────────────────────────────
const GOVERNORATES = [
  "amman", "zarqa", "irbid", "aqaba",
  "mafraq", "balqa", "karak", "madaba",
  "jerash", "ajloun", "maan", "tafilah",
] as const;

type Governorate = typeof GOVERNORATES[number];

const GOV_LABELS: Record<Governorate, string> = {
  amman: "عمّان", zarqa: "الزرقاء", irbid: "إربد", aqaba: "العقبة",
  mafraq: "المفرق", balqa: "البلقاء", karak: "الكرك", madaba: "مأدبا",
  jerash: "جرش", ajloun: "عجلون", maan: "معان", tafilah: "الطفيلة",
};

const GOV_BOUNDS: Record<Governorate, { latMin: number; latMax: number; lngMin: number; lngMax: number }> = {
  amman:   { latMin: 31.70, latMax: 32.10, lngMin: 35.75, lngMax: 36.10 },
  zarqa:   { latMin: 31.90, latMax: 32.20, lngMin: 36.00, lngMax: 36.50 },
  irbid:   { latMin: 32.45, latMax: 32.65, lngMin: 35.75, lngMax: 36.10 },
  aqaba:   { latMin: 29.45, latMax: 29.60, lngMin: 34.95, lngMax: 35.10 },
  mafraq:  { latMin: 32.20, latMax: 32.60, lngMin: 36.10, lngMax: 37.00 },
  balqa:   { latMin: 31.90, latMax: 32.15, lngMin: 35.60, lngMax: 36.00 },
  karak:   { latMin: 31.10, latMax: 31.40, lngMin: 35.65, lngMax: 36.00 },
  madaba:  { latMin: 31.60, latMax: 31.80, lngMin: 35.75, lngMax: 36.00 },
  jerash:  { latMin: 32.25, latMax: 32.40, lngMin: 35.85, lngMax: 36.10 },
  ajloun:  { latMin: 32.30, latMax: 32.45, lngMin: 35.70, lngMax: 35.90 },
  maan:    { latMin: 29.90, latMax: 30.30, lngMin: 35.50, lngMax: 36.00 },
  tafilah: { latMin: 30.70, latMax: 30.95, lngMin: 35.55, lngMax: 35.80 },
};

const PER_GOV  = 50;
const FIXED_DESC = "شقة تقع في منطقة مميزة بإطلالة جميلة وقريبة من جميع الخدمات.";

// العمود الأول (Type) هو الذي يحدد بيع أو إيجار
// Price_annualy = التهجئة الفعلية في الملفات (l واحدة)
const TEMPLATE_CSV =
`Type,Sale_price,Price_annualy,Bedrooms,Bathrooms,Area,Image_1,Image_2,Image_3
sale,85000,,3,2,120,https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800,,
rent,,4200,2,1,85,https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800,,
sale,120000,,4,3,180,https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800,https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800,
rent,,3600,1,1,65,https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800,,
sale,95000,,3,2,135,,,
rent,,6600,3,2,110,,,
sale,75000,,2,1,95,,,
rent,,7800,4,3,160,,,`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface UploadRecord {
  id: string;
  filename: string;
  adminName: string;
  adminEmail: string;
  uploadDate: string;
  rowCount: number;
  successCount: number;
  failCount: number;
  status: "success" | "partial" | "failed";
  distribution: Record<string, number>;
  elapsedSec: number;
}

interface ParsedRow {
  price:     string;
  category:  string;         // "بيع" | "إيجار"
  bedrooms:  string;
  bathrooms: string;
  area:      string;
  images:    string[];       // روابط الصور من CSV
  _gov:      Governorate;
  _title:    string;
}

interface LiveItem {
  title: string;
  gov: string;
  price: number;
  cat: string;
  area: number;
  images: number;
  ok: boolean;
  err?: string;
}

// ─── CSV Parsers ──────────────────────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const COL_ALIAS: Record<string, string> = {
  // ── السعر العام ──────────────────────────────────────────
  price: "price", "السعر": "price", "سعر": "price",
  // ── سعر البيع ────────────────────────────────────────────
  sale_price: "sale_price",    "سعر_البيع": "sale_price",
  "sale price": "sale_price",  selling_price: "sale_price",
  "سعر البيع": "sale_price",
  // ── سعر الإيجار السنوي (يدعم التهجئة الصحيحة والخطأ الشائع)
  price_annually:  "price_annually",
  price_annualy:   "price_annually",   // ← التهجئة الشائعة في الملفات (l واحدة)
  "price annually":  "price_annually",
  "price annualy":   "price_annually",
  annual_price:    "price_annually",
  annualy_price:   "price_annually",
  yearly_price:    "price_annually",
  "السعر_السنوي":  "price_annually",
  "الإيجار_السنوي": "price_annually",
  "سعر_الإيجار":   "price_annually",
  "الإيجار":       "price_annually",
  // ── الصور (تصل إلى 10 صور) ───────────────────────────────
  image: "img_1",     image_url: "img_1", photo: "img_1",
  "صورة": "img_1",    "الصورة": "img_1",
  image_1: "img_1",   image_2: "img_2",   image_3: "img_3",
  image_4: "img_4",   image_5: "img_5",   image_6: "img_6",
  image_7: "img_7",   image_8: "img_8",   image_9: "img_9",  image_10: "img_10",
  photo_1: "img_1",   photo_2: "img_2",   photo_3: "img_3",
  img_1: "img_1",     img_2: "img_2",     img_3: "img_3",
  "صورة_1": "img_1",  "صورة_2": "img_2",  "صورة_3": "img_3",
  // ── باقي الأعمدة ─────────────────────────────────────────
  category: "category",   "نوع_العملية": "category", "نوع_العقد": "category",
  operation: "category",  "نوع_العملية_(sale/rent)": "category",
  bedrooms: "bedrooms",   "غرف_النوم": "bedrooms", "الغرف": "bedrooms", rooms: "bedrooms",
  bathrooms: "bathrooms", "الحمامات": "bathrooms",
  area: "area",           "المساحة": "area", "المساحة_(م²)": "area",
  // ── مساحة بالمتر المربع — Area_sqm وكل مرادفاتها ──────────────────────────
  area_sqm: "area",       "area_(sqm)": "area",   area_m2: "area",
  sqm: "area",            "مساحة_م2": "area",     "المساحة_م2": "area",
  "مساحة_متر": "area",    area_square_meters: "area",
  floor_area: "area",     "floor_area_(sqm)": "area",
};

/**
 * منطق السعر والتصنيف — قاعدة ذهبية:
 *  كل صف ينتج عقاراً واحداً بحقل تصنيف واحد (category).
 *
 *  العمود الأول (vals[0] → row._type) يحدد النوع دائماً:
 *  ─ "rent"  → السعر من Price_annualy (l واحدة)  | غياب القيمة → 1,000 د.أ افتراضي
 *  ─ "sale"  → السعر من Sale_price               | غياب القيمة → 50,000 د.أ افتراضي
 *
 *  لا يُنشأ إدخالان منفصلان لنفس الصف أبداً.
 */
function resolvePriceAndCategory(row: any): { price: string; category: string } {
  const clean = (v: any) => (v ?? "").toString().replace(/,/g, "").trim();
  const isPos = (v: string) => v !== "" && !isNaN(parseFloat(v)) && parseFloat(v) > 0;

  // العمود الأول هو المرجع الوحيد لتحديد النوع — لا استثناء
  const category = normalizeCategory(clean(row._type));

  if (category === "إيجار") {
    // Price_annualy — التهجئة الفعلية في الملفات (l واحدة)؛ السعر يُستخرج من هذا العمود فقط
    const annualRaw = clean(row.price_annually);
    const price = isPos(annualRaw) ? annualRaw : "1000";   // افتراضي: 1,000 د.أ/سنة
    return { price, category: "إيجار" };
  } else {
    // Sale_price — السعر يُستخرج من هذا العمود فقط
    const saleRaw = clean(row.sale_price);
    const price = isPos(saleRaw) ? saleRaw : "50000";      // افتراضي: 50,000 د.أ
    return { price, category: "بيع" };
  }
}

function parseCSV(text: string): Omit<ParsedRow, "_gov" | "_title">[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  if (lines.length < 2) return [];
  const rawHdr = parseCSVLine(lines[0]).map(h =>
    h.toLowerCase().replace(/\s+/g, "_").replace(/[()²]/g, "")
  );
  const fmap: Record<number, string> = {};
  rawHdr.forEach((h, i) => { fmap[i] = COL_ALIAS[h] || h; });

  return lines.slice(1).flatMap((line) => {
    const l = line.trim(); if (!l) return [];
    const vals = parseCSVLine(l);
    const row: any = {};
    vals.forEach((v, i) => { if (fmap[i]) row[fmap[i]] = v; });
    // العمود الأول دائماً هو محدد النوع (rent/sale)
    row._type = vals[0] ?? "";

    const { price, category } = resolvePriceAndCategory(row);

    // جمع روابط الصور (img_1 → img_10) وتصفية الفارغة
    const images = [
      row.img_1, row.img_2, row.img_3, row.img_4, row.img_5,
      row.img_6, row.img_7, row.img_8, row.img_9, row.img_10,
    ].filter((v: any): v is string =>
      typeof v === "string" && v.trim().length > 4 &&
      (v.trim().startsWith("http") || v.trim().startsWith("//"))
    ).map((v: string) => v.trim());

    return [{
      price, category, images,
      bedrooms:  row.bedrooms  || "0",
      bathrooms: row.bathrooms || "0",
      area:      row.area      || "0",
    }];
  });
}

function normalizeCategory(raw: string): "بيع" | "إيجار" {
  const l = raw.trim().toLowerCase();
  if (l.includes("إيجار") || l.includes("rent") || l.includes("ايجار")) return "إيجار";
  return "بيع";
}

// ─── Deduplication ────────────────────────────────────────────────────────────
/**
 * يزيل الصفوف المكررة تماماً قبل توزيع المحافظات.
 * المفتاح الفريد: category + price + bedrooms + bathrooms + area + أول صورة
 * يضمن إنشاء كل عقار مرة واحدة فقط.
 */
function deduplicateRows(
  rows: Omit<ParsedRow, "_gov" | "_title">[]
): { unique: Omit<ParsedRow, "_gov" | "_title">[]; removedCount: number } {
  const seen = new Set<string>();
  const unique: Omit<ParsedRow, "_gov" | "_title">[] = [];
  let removedCount = 0;

  for (const row of rows) {
    const key = [
      row.category,
      row.price,
      row.bedrooms,
      row.bathrooms,
      row.area,
      row.images[0] || "",
    ].join("|");

    if (seen.has(key)) {
      removedCount++;
    } else {
      seen.add(key);
      unique.push(row);
    }
  }

  return { unique, removedCount };
}

function randomCoord(gov: Governorate) {
  const b = GOV_BOUNDS[gov];
  return {
    lat: parseFloat((b.latMin + Math.random() * (b.latMax - b.latMin)).toFixed(5)),
    lng: parseFloat((b.lngMin + Math.random() * (b.lngMax - b.lngMin)).toFixed(5)),
  };
}

function assignGovernorates(rows: Omit<ParsedRow, "_gov" | "_title">[]): ParsedRow[] {
  return rows.map((row, idx) => {
    const gov  = GOVERNORATES[Math.floor(idx / PER_GOV) % GOVERNORATES.length];
    const beds = parseInt(row.bedrooms) || 1;
    const cat  = normalizeCategory(row.category);
    return {
      ...row,
      _gov:   gov,
      _title: `شقة ${beds} غرف ${cat === "إيجار" ? "للإيجار" : "للبيع"} في ${GOV_LABELS[gov]}`,
    };
  });
}

// ─── API helpers ──────────────────────────────────────────────────────────────
async function pushOneProperty(
  property: any,
  token: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch(`${API}/properties`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${publicAnonKey}`,
        "X-User-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(property),
    });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch {}

    if (!res.ok) {
      return { ok: false, error: data?.error || data?.message || `HTTP ${res.status}: ${res.statusText}` };
    }
    if (!data?.success) {
      return { ok: false, error: data?.error || data?.message || "الخادم لم يُعيد success=true" };
    }
    const id = data?.data?.id ?? data?.id ?? data?.property?.id;
    return { ok: true, id };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Network error" };
  }
}

async function autoApproveProperty(id: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API}/admin/approve/${id}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${publicAnonKey}`,
        "X-User-Token": token,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data?.success;
  } catch {
    return false;
  }
}

// ─── Sticky Progress Bar ──────────────────────────────────────────────────────
type StickyUploadBarProps = {
  stage: string; uploadProgress: number; doneCount: number; total: number;
  successCount: number; failCount: number; elapsedSec: number; fileName: string;
  currentGov: string; onCancel: () => void; onScrollToProgress: () => void;
};
const StickyUploadBar = React.forwardRef<HTMLDivElement, StickyUploadBarProps>(
  ({ stage, uploadProgress, doneCount, total, successCount, failCount,
     elapsedSec, fileName, currentGov, onCancel, onScrollToProgress }, ref) => {
  if (stage !== "uploading") return null;
  const pct   = uploadProgress;
  const speed = elapsedSec > 0 ? (doneCount / elapsedSec).toFixed(1) : "—";

  return (
    <motion.div
      initial={{ y: -90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -90, opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="fixed top-0 inset-x-0 z-[200]"
    >
      <div className="relative bg-slate-900 border-b-2 border-amber-500/70 overflow-hidden shadow-2xl shadow-black/40">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-amber-500/15 to-orange-400/10 pointer-events-none"
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ transformOrigin: "0% 50%" }}
        />
        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-3 flex-wrap">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="flex-1 min-w-0 hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-sm truncate max-w-[160px]">{fileName}</span>
              {currentGov && (
                <span className="flex items-center gap-1 text-amber-300 text-[11px] font-black bg-amber-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                  <MapPin className="w-2.5 h-2.5" /> {currentGov}
                </span>
              )}
            </div>
            <div className="mt-1 h-1.5 bg-slate-700/80 rounded-full overflow-hidden w-full max-w-[240px]">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <span className="bg-amber-500 text-white text-sm font-black px-3 py-1 rounded-lg tabular-nums shadow-lg shadow-amber-500/30">
              {pct}%
            </span>
            <span className="bg-white/10 text-white text-xs font-black px-2.5 py-1 rounded-lg tabular-nums">
              {doneCount.toLocaleString()} / {total.toLocaleString()}
            </span>
            <span className="bg-green-500/20 text-green-300 text-xs font-black px-2.5 py-1 rounded-lg">
              ✓ {successCount.toLocaleString()}
            </span>
            {failCount > 0 && (
              <span className="bg-red-500/20 text-red-300 text-xs font-black px-2.5 py-1 rounded-lg">
                ✗ {failCount}
              </span>
            )}
            <span className="hidden md:flex items-center gap-1 bg-blue-500/20 text-blue-300 text-xs font-black px-2.5 py-1 rounded-lg">
              <Zap className="w-3 h-3" /> {speed}/ث
            </span>
            <span className="hidden md:flex items-center gap-1 bg-white/8 text-slate-400 text-xs font-bold px-2.5 py-1 rounded-lg">
              <Clock className="w-3 h-3" /> {elapsedSec}s
            </span>
          </div>
          <button
            onClick={onScrollToProgress}
            title="انتقل لتفاصيل الرفع"
            className="hidden sm:flex w-8 h-8 rounded-xl bg-white/8 hover:bg-white/15 items-center justify-center text-slate-400 hover:text-white transition-all shrink-0"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={onCancel}
            className="shrink-0 flex items-center gap-1.5 bg-red-600/20 hover:bg-red-500/40 border border-red-500/40 text-red-300 hover:text-white text-xs font-black px-3 py-1.5 rounded-lg transition-all"
          >
            <X className="w-3.5 h-3.5" /> إلغاء
          </button>
        </div>
        <div className="h-[3px] bg-slate-800">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
});

// ─── Live Feed Item ───────────────────────────────────────────────────────────
const LiveFeedItem = React.forwardRef<HTMLDivElement, { item: LiveItem; index: number }>(
  ({ item, index }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.02 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
        item.ok
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
      }`}
    >
      {item.ok
        ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
        : <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
      <span className="font-medium text-primary dark:text-white truncate flex-1">{item.title}</span>
      <span className={`font-black text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
        item.cat === "إيجار"
          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
          : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
      }`}>{item.cat}</span>
      {item.area > 0 && (
        <span className="text-muted-foreground text-[10px] shrink-0">{item.area}م²</span>
      )}
      {item.images > 0 && (
        <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0">
          📷{item.images}
        </span>
      )}
      <span className="flex items-center gap-1 text-muted-foreground shrink-0">
        <MapPin className="w-2.5 h-2.5" />{item.gov}
      </span>
      <span className={`font-black shrink-0 tabular-nums ${item.ok ? "text-amber-600 dark:text-amber-400" : "text-red-500"}`}>
        {item.ok
          ? `${item.price.toLocaleString()} ${item.cat === "إيجار" ? "د.أ/سنة" : "د.أ"}`
          : `✗ ${item.err?.slice(0, 20) || "فشل"}`}
      </span>
    </motion.div>
  )
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminCSV() {
  const navigate = useNavigate();
  const { user, authReady, properties, refreshProperties } = useApp();
  const isAdmin = user?.email === "admin@baity.com";

  const [isDragging, setIsDragging]   = useState(false);
  const [parsedRows, setParsedRows]   = useState<ParsedRow[]>([]);
  const [fileName, setFileName]       = useState("");
  const [stage, setStage]             = useState<"idle" | "preview" | "uploading" | "done">("idle");

  const [uploadProgress, setUploadProgress]   = useState(0);
  const [doneCount, setDoneCount]             = useState(0);
  const [successCount, setSuccessCount]       = useState(0);
  const [failCount, setFailCount]             = useState(0);
  const [elapsedSec, setElapsedSec]           = useState(0);
  const [currentTitle, setCurrentTitle]       = useState("");
  const [currentGovLabel, setCurrentGovLabel] = useState("");
  const [liveFeed, setLiveFeed]               = useState<LiveItem[]>([]);
  const [lastError, setLastError]             = useState("");

  const [flashMsg, setFlashMsg]             = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [history, setHistory]               = useState<UploadRecord[]>([]);
  const [filterAdmin, setFilterAdmin]       = useState("");
  const [filterDate, setFilterDate]         = useState("");
  const [showDistModal, setShowDistModal]   = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UploadRecord | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const startTimeRef = useRef(0);
  const progressRef  = useRef<HTMLDivElement>(null);
  const okRef        = useRef(0);
  const failRef      = useRef(0);

  useEffect(() => {
    try {
      const s = localStorage.getItem("baity_csv_history");
      if (s) setHistory(JSON.parse(s));
    } catch {}
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user) { navigate("/admin/login", { replace: true }); return; }
    if (!isAdmin) navigate("/", { replace: true });
  }, [user, isAdmin, authReady, navigate]);

  const flash = (type: "success" | "error", text: string) => {
    setFlashMsg({ type, text });
    setTimeout(() => setFlashMsg(null), 7000);
  };

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      flash("error", "الرجاء اختيار ملف بصيغة .csv فقط");
      return;
    }
    setFileName(file.name);
    setParsedRows([]);
    setLiveFeed([]);
    setLastError("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) { flash("error", "الملف فارغ أو لا يمكن قراءته"); return; }
      const raw = parseCSV(text);
      if (!raw.length) {
        flash("error", "لم يُعثر على بيانات صالحة. تأكّد من وجود عمود Sale_price أو Price_annualy.");
        return;
      }
      // ── إزالة الصفوف المكررة قبل توزيع المحافظات ──────────────────────────
      const { unique, removedCount } = deduplicateRows(raw);
      if (removedCount > 0) {
        flash("error", `⚠️ تم حذف ${removedCount} صف مكرر — سيُضاف ${unique.length} عقار فريد فقط`);
      }
      if (!unique.length) {
        flash("error", "جميع الصفوف مكررة أو فارغة.");
        return;
      }
      const distributed = assignGovernorates(unique);
      setParsedRows(distributed);
      setStage("preview");
    };
    reader.onerror = () => flash("error", "تعذّرت قراءة الملف. جرّب تحويله إلى UTF-8.");
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // ── Sequential upload — ONE at a time ────────────────────────────────────
  const handleSubmitUpload = async () => {
    if (!parsedRows.length || stage === "uploading") return;

    let token: string | null = null;
    try { token = await getValidToken(); } catch (e: any) {
      flash("error", `❌ خطأ في التحقق من الجلسة: ${e?.message || "أعد تسجيل الدخول"}`);
      return;
    }
    if (!token) {
      flash("error", "❌ انتهت جلستك. أعد تسجيل الدخول من /admin/login");
      return;
    }

    cancelledRef.current = false;
    okRef.current   = 0;
    failRef.current = 0;

    setStage("uploading");
    setUploadProgress(0);
    setDoneCount(0);
    setSuccessCount(0);
    setFailCount(0);
    setElapsedSec(0);
    setLiveFeed([]);
    setLastError("");
    setCurrentTitle("");
    setCurrentGovLabel("");
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    const total = parsedRows.length;

    for (let i = 0; i < total; i++) {
      if (cancelledRef.current) break;

      const row   = parsedRows[i];
      const govAr = GOV_LABELS[row._gov];
      const cat   = normalizeCategory(row.category);

      setCurrentTitle(row._title);
      setCurrentGovLabel(govAr);

      const price = parseFloat(row.price.replace(/,/g, "")) || 1000;

      // صور الصف — تُرسَل كـ array وأيضاً كـ image (الأولى)
      const rowImages = Array.isArray(row.images) ? row.images : [];

      // ── بناء كائن العقار — حقل واحد فقط للتصنيف (category) ─────────────────
      // لا يُرسَل عمودا السعر (Sale_price / Price_annualy) منفصلَين؛
      // بدلاً منهما يُرسَل قيمة واحدة محلولة في "price" وتصنيف واحد في "category".
      const propObj = {
        title:           row._title,
        price,                          // قيمة واحدة فقط (بيع: Sale_price | إيجار: Price_annualy)
        governorate:     row._gov,
        category:        cat,           // حقل وحيد: "بيع" | "إيجار" — لا تصنيفَين
        type:            "شقة",         // نوع العقار (apartment)
        description:     FIXED_DESC,
        images:          rowImages,
        image:           rowImages[0] || "",
        area:            parseFloat(row.area)   || 0,
        bedrooms:        parseInt(row.bedrooms)  || 0,
        bathrooms:       parseInt(row.bathrooms) || 0,
        location:        randomCoord(row._gov),
        uploadedBy:      user?.name  || "Admin",
        uploadedByEmail: user?.email || "admin@baity.com",
        uploadDate:      new Date().toISOString(),
        status:          "approved",
      };

      const result = await pushOneProperty(propObj, token);

      const liveItem: LiveItem = {
        title:  row._title,
        gov:    govAr,
        price,
        cat,
        area:   parseFloat(row.area) || 0,
        images: rowImages.length,
        ok:     result.ok,
        err:    result.error,
      };

      if (result.ok) {
        okRef.current += 1;
        if (result.id) autoApproveProperty(result.id, token).catch(() => {});
      } else {
        failRef.current += 1;
        setLastError(result.error || "خطأ غير معروف");
      }

      const done = i + 1;
      setDoneCount(done);
      setSuccessCount(okRef.current);
      setFailCount(failRef.current);
      setUploadProgress(Math.round((done / total) * 100));
      setLiveFeed(prev => [liveItem, ...prev].slice(0, 15));

      await new Promise(r => setTimeout(r, 30));
    }

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setElapsedSec(elapsed);
    setCurrentTitle("");
    setCurrentGovLabel("");

    try { await refreshProperties?.(); } catch {}

    const distribution: Record<string, number> = {};
    parsedRows.forEach(r => { distribution[r._gov] = (distribution[r._gov] || 0) + 1; });

    const ok   = okRef.current;
    const fail = failRef.current;

    const record: UploadRecord = {
      id:           Date.now().toString(),
      filename:     fileName,
      adminName:    user?.name  || "Admin",
      adminEmail:   user?.email || "",
      uploadDate:   new Date().toISOString(),
      rowCount:     parsedRows.length,
      successCount: ok,
      failCount:    fail,
      status:       ok === parsedRows.length ? "success" : ok > 0 ? "partial" : "failed",
      distribution,
      elapsedSec:   elapsed,
    };

    const newHistory = [record, ...history];
    setHistory(newHistory);
    try { localStorage.setItem("baity_csv_history", JSON.stringify(newHistory)); } catch {}

    setStage("done");

    if (ok > 0) {
      flash("success",
        `✅ تمت إضافة ${ok.toLocaleString()} شقة (كل منها مرة واحدة) في ${elapsed}s` +
        (fail > 0 ? ` • فشل: ${fail}` : "")
      );
    } else {
      flash("error", `❌ لم تُضَف أي شقة. آخر خطأ: ${lastError || "تحقق من الاتصال."}`);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    flash("error", `تم إلغاء الرفع. أُضيف ${okRef.current} شقة قبل الإلغاء.`);
    setStage("done");
  };

  const blobDownload = (content: string, name: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCurrentCSV = () => {
    const hdrs = ["Title","Sale_price","Price_annually","Governorate","Type","Area","Bedrooms","Bathrooms"];
    const rows = properties.map((p: any) => [
      `"${(p.title||"").replace(/"/g,"'")}"`,
      p.category === "بيع"   ? (p.price || 0) : "",
      p.category === "إيجار" ? (p.price || 0) : "",
      p.governorate||"", "شقة",
      p.area||0, p.bedrooms||0, p.bathrooms||0,
    ]);
    const csv = [hdrs.join(","), ...rows.map(r => r.join(","))].join("\n");
    blobDownload("\uFEFF" + csv, `baity-apartments-${new Date().toISOString().slice(0,10)}.csv`);
  };

  const downloadTemplate = () => blobDownload("\uFEFF" + TEMPLATE_CSV, "baity-csv-template.csv");

  const resetUpload = () => {
    setStage("idle"); setParsedRows([]); setFileName("");
    setUploadProgress(0); setDoneCount(0); setSuccessCount(0); setFailCount(0);
    setLiveFeed([]); setLastError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearHistory = () => {
    setHistory([]); localStorage.removeItem("baity_csv_history");
    flash("success", "تم مسح سجل الرفع");
  };

  const previewDist = parsedRows.reduce<Record<string,number>>((acc, r) => {
    acc[r._gov] = (acc[r._gov] || 0) + 1; return acc;
  }, {});

  // إحصاء بيع/إيجار/صور في الـ preview
  const previewSaleCount   = parsedRows.filter(r => normalizeCategory(r.category) === "بيع").length;
  const previewRentCount   = parsedRows.filter(r => normalizeCategory(r.category) === "إيجار").length;
  const previewWithImages  = parsedRows.filter(r => r.images.length > 0).length;
  const previewTotalImages = parsedRows.reduce((s, r) => s + r.images.length, 0);

  const filteredHistory = history.filter(r => {
    if (filterAdmin && !r.adminName.toLowerCase().includes(filterAdmin.toLowerCase())) return false;
    if (filterDate  && !r.uploadDate.startsWith(filterDate)) return false;
    return true;
  });

  const uploadsPerSec = elapsedSec > 0 ? (doneCount / elapsedSec).toFixed(1) : "—";
  const scrollToProgress = () => progressRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  if (!authReady || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400">جارٍ التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/10 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">

      <AnimatePresence>
        {stage === "uploading" && (
          <StickyUploadBar
            stage={stage} uploadProgress={uploadProgress}
            doneCount={doneCount} total={parsedRows.length}
            successCount={successCount} failCount={failCount}
            elapsedSec={elapsedSec} fileName={fileName}
            currentGov={currentGovLabel}
            onCancel={handleCancel} onScrollToProgress={scrollToProgress}
          />
        )}
      </AnimatePresence>

      <AdminNavbar pendingCount={0} />

      <div className={`pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto transition-all duration-300 ${stage === "uploading" ? "pt-36" : "pt-24"}`}>
        <BackButton />

        {/* Flash */}
        <AnimatePresence>
          {flashMsg && (
            <motion.div
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className={`mb-6 flex items-center gap-3 px-5 py-4 rounded-2xl border-2 ${
                flashMsg.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200"
                  : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200"
              }`}
            >
              {flashMsg.type === "success"
                ? <CheckCircle className="w-5 h-5 shrink-0" />
                : <AlertCircle className="w-5 h-5 shrink-0" />}
              <p className="font-bold text-sm flex-1">{flashMsg.text}</p>
              <button onClick={() => setFlashMsg(null)}><X className="w-4 h-4 opacity-60" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 rounded-3xl p-6 border border-slate-700/50 shadow-2xl">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl">
                  <Database className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-amber-400 text-xs font-black uppercase tracking-widest mb-1">إدارة بيانات العقارات</p>
                  <h1 className="text-2xl font-black text-white">رفع شقق جماعي عبر CSV</h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-slate-400 text-xs"><Zap className="w-3 h-3 text-amber-400" /> معالجة تسلسلية فورية</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 text-xs">Round-Robin 12 محافظة</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 text-xs">نشر تلقائي فوري</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/20 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all text-sm font-bold">
                  <FileText className="w-4 h-4" /> قالب CSV
                </button>
                <button onClick={downloadCurrentCSV}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-amber-500/25">
                  <Download className="w-4 h-4" /> تصدير ({properties.length})
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Rules banners */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          {[
            {
              icon: Home, color: "blue",
              title: "شقق فقط",
              desc: "كل صف في CSV = شقة سكنية تلقائياً",
            },
            {
              icon: MapPin, color: "amber",
              title: "Round-Robin",
              desc: "50 شقة/محافظة ← تكرار دوري على 12",
            },
            {
              icon: CheckCircle, color: "green",
              title: "نشر فوري",
              desc: "تظهر في الموقع مباشرةً بعد الرفع",
            },
          ].map((item) => {
            const Icon = item.icon;
            const bg = item.color === "blue"  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                     : item.color === "amber" ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                     : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300";
            const ibg = item.color === "blue"  ? "bg-blue-100 dark:bg-blue-900/40"
                      : item.color === "amber" ? "bg-amber-100 dark:bg-amber-900/40"
                      : "bg-green-100 dark:bg-green-900/40";
            return (
              <div key={item.title} className={`rounded-2xl border p-4 flex items-start gap-3 ${bg}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ibg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-sm">{item.title}</p>
                  <p className="text-xs opacity-70 mt-0.5">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: "إجمالي الشقق", value: properties.length, icon: Home, cls: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300" },
            { label: "عمليات الرفع", value: history.length, icon: Upload, cls: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300" },
            { label: "مضافة بـ CSV", value: history.reduce((s,r)=>s+r.successCount,0), icon: CheckCircle, cls: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300" },
            { label: "آخر رفع", value: history[0] ? new Date(history[0].uploadDate).toLocaleDateString("ar-JO") : "—", icon: Calendar, cls: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.04 * i }}
                className={`rounded-2xl border p-4 ${s.cls}`}>
                <Icon className="w-5 h-5 mb-2 opacity-70" />
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-xs font-bold mt-1 opacity-70">{s.label}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Upload Card ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="bg-white dark:bg-slate-800 rounded-3xl border border-border shadow-lg p-6 mb-8"
        >
          <h2 className="text-xl font-black text-primary dark:text-white mb-5 flex items-center gap-2">
            <Upload className="w-5 h-5 text-amber-500" />
            رفع ملف CSV
            {parsedRows.length > 0 && stage === "preview" && (
              <span className="ms-2 text-sm font-normal bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full">
                {parsedRows.length.toLocaleString()} شقة
              </span>
            )}
          </h2>

          {/* ── IDLE ─────────────────────────────────────────────────────── */}
          {stage === "idle" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all select-none ${
                isDragging
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 scale-[1.01]"
                  : "border-slate-300 dark:border-slate-600 hover:border-amber-400 hover:bg-amber-50/40 dark:hover:bg-amber-900/10"
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".csv"
                className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

              <motion.div
                animate={isDragging ? { scale: 1.12, rotate: -4 } : { scale: 1, rotate: 0 }}
                transition={{ duration: 0.2 }}
                className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-amber-400/30"
              >
                <Upload className="w-10 h-10 text-white" />
              </motion.div>

              <p className="text-xl font-black text-primary dark:text-white mb-1">
                {isDragging ? "أفلت الملف هنا ✨" : "اسحب وأفلت ملف CSV هنا"}
              </p>
              <p className="text-muted-foreground text-sm mb-5">
                أو انقر لاختيار ملف • بدون حد للحجم
              </p>
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-lg transition-colors">
                <FileText className="w-4 h-4" /> اختيار ملف CSV
              </span>

              {/* hints */}
              <div className="mt-6 space-y-2.5">
                {/* العمود الأول */}
                <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
                  <span className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    العمود الأول دائماً:
                    <code className="bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 rounded font-mono">sale</code>
                    أو
                    <code className="bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 rounded font-mono">rent</code>
                  </span>
                </div>
                {/* منطق السعر */}
                <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
                  <span className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 font-bold px-3 py-1 rounded-xl flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    sale → Sale_price <span className="opacity-60 font-normal">(أو 50,000 افتراضي)</span>
                  </span>
                  <span className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold px-3 py-1 rounded-xl flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    rent → Price_annualy <span className="opacity-60 font-normal">(أو 1,000 افتراضي)</span>
                  </span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold px-2">📷 Image_1…10</span>
                </div>
              </div>
            </div>
          )}

          {/* ── PREVIEW ──────────────────────────────────────────────────── */}
          {stage === "preview" && parsedRows.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* File bar */}
              <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                  <span className="font-bold text-primary dark:text-white truncate max-w-[180px]">{fileName}</span>
                  {/* ── ملخص بيع / إيجار / افتراضي ── */}
                  <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-black px-2 py-0.5 rounded-full">
                    {previewSaleCount} بيع
                  </span>
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-black px-2 py-0.5 rounded-full">
                    {previewRentCount} إيجار
                  </span>

                  {previewTotalImages > 0 && (
                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-black px-2 py-0.5 rounded-full">
                      📷 {previewTotalImages} صورة ({previewWithImages} شقة)
                    </span>
                  )}
                </div>
                <button onClick={resetUpload} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Distribution grid */}
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
                <p className="text-sm font-black text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  توزيع Round-Robin على المحافظات الـ 12
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {GOVERNORATES.map(gov => {
                    const count = previewDist[gov] || 0;
                    return (
                      <div key={gov} className={`rounded-xl p-2 text-center border transition-all ${
                        count > 0
                          ? "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700"
                          : "bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-35"
                      }`}>
                        <p className="font-black text-base text-blue-700 dark:text-blue-300">{count}</p>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-tight">{GOV_LABELS[gov]}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preview table */}
              <div className="rounded-xl border border-border overflow-hidden mb-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                      <tr>
                        {["#","العنوان","المحافظة","السعر","النوع","الغرف","م²","الصور"].map(h => (
                          <th key={h} className="px-4 py-3 text-start font-black text-muted-foreground text-xs whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsedRows.slice(0, 10).map((row, i) => {
                        const cat = normalizeCategory(row.category);
                        return (
                          <tr key={i} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                            <td className="px-4 py-2.5 font-medium text-primary dark:text-white max-w-[180px] truncate">{row._title}</td>
                            <td className="px-4 py-2.5">
                              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-xs whitespace-nowrap">
                                <MapPin className="w-3 h-3" />{GOV_LABELS[row._gov]}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-black whitespace-nowrap">
                              <span className="text-amber-600 dark:text-amber-400">
                                {Number(row.price.replace(/,/g,"")).toLocaleString()} د.أ
                                {cat === "إيجار" && <span className="text-muted-foreground font-normal text-[10px]">/سنة</span>}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-black whitespace-nowrap ${
                                cat === "إيجار"
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                  : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                              }`}>{cat}</span>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">{row.bedrooms || "—"}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {row.area && parseFloat(row.area) > 0 ? `${row.area} م²` : "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              {row.images.length > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <img
                                    src={row.images[0]}
                                    alt=""
                                    className="w-8 h-8 rounded-lg object-cover border border-border"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                  />
                                  {row.images.length > 1 && (
                                    <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full">
                                      +{row.images.length - 1}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 10 && (
                  <div className="px-4 py-2 bg-muted/30 text-xs text-center text-muted-foreground border-t border-border">
                    ... و {(parsedRows.length - 10).toLocaleString()} شقة أخرى
                  </div>
                )}
              </div>

              {/* Admin tag */}
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200 font-bold">
                <User className="w-4 h-4 shrink-0" />
                سيتم الرفع باسم: <span className="font-black">{user?.name}</span>
                &nbsp;•&nbsp;{new Date().toLocaleDateString("ar-JO")}
                &nbsp;•&nbsp;<span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" />تسلسلي — واحد تلو الآخر</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubmitUpload}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white py-4 rounded-xl font-black transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 text-base"
                >
                  <Upload className="w-5 h-5" />
                  ابدأ رفع {parsedRows.length.toLocaleString()} شقة
                  &nbsp;({previewSaleCount} بيع + {previewRentCount} إيجار{previewTotalImages > 0 ? ` + 📷${previewTotalImages}` : ""})
                </button>
                <button onClick={resetUpload}
                  className="px-6 py-3 rounded-xl border-2 border-border hover:bg-muted dark:hover:bg-slate-700 transition-colors font-bold text-primary dark:text-white">
                  إلغاء
                </button>
              </div>
            </motion.div>
          )}

          {/* ── UPLOADING ─────────────────────────────────────────────────── */}
          {stage === "uploading" && (
            <motion.div ref={progressRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2 scroll-mt-28">

              {/* Current item banner */}
              <AnimatePresence mode="wait">
                {currentTitle && (
                  <motion.div
                    key={currentTitle}
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-5"
                  >
                    <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center shrink-0">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-300">جارٍ إضافة العقار...</p>
                      <p className="text-sm font-black text-primary dark:text-white truncate">{currentTitle}</p>
                    </div>
                    {currentGovLabel && (
                      <span className="flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 rounded-full shrink-0">
                        <MapPin className="w-3 h-3" /> {currentGovLabel}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: "تم رفعه",    val: `${doneCount} / ${parsedRows.length}`, icon: Upload,       cls: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
                  { label: "نجح ✓",      val: successCount.toLocaleString(),         icon: CheckCircle,  cls: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
                  { label: "فشل ✗",      val: failCount.toLocaleString(),            icon: AlertTriangle,cls: "text-red-500",                       bg: "bg-red-50 dark:bg-red-900/20"    },
                  { label: "سرعة الرفع", val: `${uploadsPerSec}/ث`,                  icon: Zap,          cls: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/20"  },
                ].map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-border`}>
                      <Icon className={`w-4 h-4 mx-auto mb-1 ${s.cls}`} />
                      <p className={`font-black text-lg tabular-nums ${s.cls}`}>{s.val}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1.5 text-sm font-bold">
                  <span className="text-primary dark:text-white flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    جارٍ رفع الشقق...
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-black tabular-nums text-base">{uploadProgress}%</span>
                </div>
                <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full relative"
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse rounded-full" />
                  </motion.div>
                  {uploadProgress > 15 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-white mix-blend-screen">
                      {doneCount.toLocaleString()} من {parsedRows.length.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  الوقت المنقضي: <span className="font-bold text-primary dark:text-white">{elapsedSec}s</span>
                </span>
                {lastError && failCount > 0 && (
                  <span className="text-red-500 font-medium max-w-[200px] truncate">⚠ {lastError}</span>
                )}
              </div>

              {/* Live feed */}
              <div className="mb-5">
                <p className="text-xs font-black text-muted-foreground mb-2 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> آخر العقارات المضافة (مباشر)
                </p>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {liveFeed.map((item, i) => (
                      <LiveFeedItem key={`${item.title}-${i}`} item={item} index={i} />
                    ))}
                  </AnimatePresence>
                  {liveFeed.length === 0 && (
                    <div className="text-center py-4 text-xs text-muted-foreground">جارٍ البدء...</div>
                  )}
                </div>
              </div>

              <button onClick={handleCancel}
                className="w-full py-2.5 rounded-xl border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-bold text-sm">
                ⛔ إلغاء الرفع
              </button>
            </motion.div>
          )}

          {/* ── DONE ─────────────────────────────────────────────────────── */}
          {stage === "done" && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl ${
                failCount === 0 ? "bg-green-100 dark:bg-green-900/40"
                : successCount > 0 ? "bg-amber-100 dark:bg-amber-900/40"
                : "bg-red-100 dark:bg-red-900/40"
              }`}>
                {failCount === 0
                  ? <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                  : successCount > 0
                    ? <AlertCircle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                    : <X className="w-10 h-10 text-red-600 dark:text-red-400" />}
              </div>

              <p className="text-2xl font-black text-primary dark:text-white mb-1">
                {failCount === 0 ? "✅ اكتمل الرفع بنجاح!" : successCount > 0 ? "⚠️ اكتمل جزئياً" : "❌ فشل الرفع"}
              </p>

              {successCount > 0 && (
                <div className="inline-flex items-center gap-4 mt-2 mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl px-5 py-3 flex-wrap justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-black text-green-700 dark:text-green-300 tabular-nums">{successCount.toLocaleString()}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">شقة أُضيفت</p>
                  </div>
                  <div className="w-px h-8 bg-green-200 dark:bg-green-800" />
                  <div className="text-center">
                    <p className="text-2xl font-black text-green-700 dark:text-green-300 tabular-nums">{elapsedSec}s</p>
                    <p className="text-xs text-green-600 dark:text-green-400">وقت الرفع</p>
                  </div>
                  <div className="w-px h-8 bg-green-200 dark:bg-green-800" />
                  <div className="text-center">
                    <p className="text-2xl font-black text-green-700 dark:text-green-300 tabular-nums">
                      {elapsedSec > 0 ? (successCount / elapsedSec).toFixed(1) : successCount}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">شقة/ثانية</p>
                  </div>
                </div>
              )}

              {failCount > 0 && (
                <p className="text-sm text-red-500 mb-2">
                  فشل: {failCount} شقة
                  {lastError && <span className="text-xs block mt-1 opacity-70">آخر خطأ: {lastError}</span>}
                </p>
              )}

              {successCount > 0 && (
                <div className="flex items-center justify-center gap-2 mb-6">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <p className="text-sm text-green-600 dark:text-green-400 font-bold">
                    الشقق ظاهرة الآن في الموقع للمستخدمين
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button onClick={resetUpload}
                  className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors">
                  <Upload className="w-4 h-4" /> رفع ملف آخر
                </button>
                <button onClick={() => navigate("/admin/added-properties?source=csv")}
                  className="flex items-center gap-2 px-6 py-2.5 border-2 border-border hover:bg-muted dark:hover:bg-slate-700 rounded-xl font-bold text-primary dark:text-white transition-colors">
                  مراجعة الشقق <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ── CSV Format ──────────────────────────────���─────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          className="bg-white dark:bg-slate-800 rounded-3xl border border-border shadow-lg p-6 mb-8"
        >
          <h2 className="text-lg font-black text-primary dark:text-white mb-1 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            هيكل ملف CSV
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            واحد من عمودَي السعر يكفي لكل صف —{" "}
            <span className="text-green-600 dark:text-green-400 font-bold">Sale_price</span> أو{" "}
            <span className="text-blue-600 dark:text-blue-400 font-bold">Price_annually</span> —
            والنظام يحدد بيع/إيجار تلقائياً
          </p>

          {/* منطق السعر */}
          <div className="mb-5 rounded-2xl border border-border overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 border-b border-border">
              <p className="text-xs font-black text-primary dark:text-white">💡 كيف يُحدَّد السعر ونوع العملية؟</p>
            </div>
            <div className="divide-y divide-border">
              {[
                {
                  step: "1",
                  col: "Sale_price",
                  has: "له قيمة موجبة",
                  result: "السعر = قيمته",
                  type: "بيع",
                  typeColor: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                  stepColor: "bg-green-500 text-white",
                },
                {
                  step: "2",
                  col: "Price_annually",
                  has: "له قيمة موجبة",
                  result: "السعر = قيمته (سنوياً)",
                  type: "إيجار",
                  typeColor: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
                  stepColor: "bg-blue-500 text-white",
                },
                {
                  step: "3",
                  col: "Price",
                  has: "له قيمة (عام)",
                  result: "السعر = قيمته + Category إن وُجد",
                  type: "بيع/إيجار",
                  typeColor: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                  stepColor: "bg-slate-400 text-white",
                },
                {
                  step: "4",
                  col: "لا يوجد سعر",
                  has: "كل الأعمدة فارغة أو صفر",
                  result: "السعر = 1,000 د.أ (افتراضي)",
                  type: "بيع",
                  typeColor: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
                  stepColor: "bg-amber-500 text-white",
                },
              ].map(row => (
                <div key={row.step} className="flex items-center gap-3 px-4 py-3 text-xs hover:bg-muted/20 transition-colors">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${row.stepColor}`}>{row.step}</span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 w-28 shrink-0">{row.col}</span>
                  <span className="text-muted-foreground flex-1">{row.has} → <span className="font-bold text-primary dark:text-white">{row.result}</span></span>
                  <span className={`font-black px-2 py-0.5 rounded-full text-[10px] shrink-0 ${row.typeColor}`}>{row.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column table */}
          <div className="overflow-x-auto rounded-xl border border-border mb-4">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  {["العمود","العمود AR","الوصف","مثال","اختياري؟"].map(h => (
                    <th key={h} className="px-4 py-3 text-start font-black text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Type",           "النوع",         "العمود الأول — يحدد بيع أو إيجار",           "sale / rent", "مطلوب ✓"],
                  ["Sale_price",     "سعر_البيع",    "سعر البيع (عند Type=sale) — بدون قيمة → 50,000","85000", "إذا sale"],
                  ["Price_annualy",  "السعر_السنوي", "الإيجار السنوي (عند Type=rent) — بدون قيمة → 1,000","4200","إذا rent"],
                  ["Bedrooms",       "غرف_النوم",    "عدد غرف النوم",                              "3",       "اختياري"],
                  ["Bathrooms",      "الحمامات",     "عدد الحمامات",                               "2",       "اختياري"],
                  ["Area",           "المساحة",      "المساحة بالمتر المربع",                      "120",     "اختياري"],
                  ["Image_1",        "صورة_1",       "رابط الصورة الأولى (http://...)",             "https://…","اختياري"],
                  ["Image_2",        "صورة_2",       "رابط الصورة الثانية (حتى Image_10)",         "https://…","اختياري"],
                ].map(([en,ar,desc,ex,req]) => (
                  <tr key={en} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono font-bold text-amber-600 dark:text-amber-400">{en}</td>
                    <td className="px-4 py-2.5 text-primary dark:text-white font-medium">{ar}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{desc}</td>
                    <td className="px-4 py-2.5 text-muted-foreground italic">{ex}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{req}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-border mb-4">
            <p className="text-xs font-black text-primary dark:text-white mb-2">🤖 حقول تُعيَّن تلقائياً (لا تكتبها):</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Home className="w-3.5 h-3.5 text-amber-500" /> نوع العقار: شقة</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-500" /> المحافظة: Round-Robin</span>
              <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-green-500" /> الوصف: موحّد</span>
              <span className="flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5 text-purple-500" /> الإحداثيات: عشوائية</span>
            </div>
          </div>

          <button onClick={downloadTemplate}
            className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 hover:underline">
            <Download className="w-4 h-4" /> تحميل ملف قالب CSV جاهز
          </button>
        </motion.div>

        {/* ── History ────────────────────────────────────────────────────��──── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-800 rounded-3xl border border-border shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h2 className="text-xl font-black text-primary dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              سجل الرفع ({filteredHistory.length})
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-muted dark:bg-slate-700 rounded-xl px-3 py-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <input type="text" value={filterAdmin} onChange={e => setFilterAdmin(e.target.value)}
                  placeholder="الاسم..." className="bg-transparent text-sm text-primary dark:text-white w-20 outline-none" />
              </div>
              <div className="flex items-center gap-1.5 bg-muted dark:bg-slate-700 rounded-xl px-3 py-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="bg-transparent text-sm text-primary dark:text-white outline-none" />
              </div>
              {(filterAdmin || filterDate) && (
                <button onClick={() => { setFilterAdmin(""); setFilterDate(""); }}
                  className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
              {history.length > 0 && (
                <button onClick={clearHistory}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors text-sm font-bold">
                  <Trash2 className="w-3.5 h-3.5" /> مسح
                </button>
              )}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground opacity-40" />
              </div>
              <p className="text-muted-foreground font-bold">لا توجد سجلات رفع بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    {["الملف","الأدمن","التاريخ","الشقق","نجح","فشل","الوقت","التوزيع","الحالة"].map(h => (
                      <th key={h} className="px-3 py-3 text-start font-black text-muted-foreground text-xs whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredHistory.map(rec => (
                    <motion.tr key={rec.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="font-medium text-primary dark:text-white truncate max-w-[120px] text-xs">{rec.filename}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                            {rec.adminName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-primary dark:text-white truncate max-w-[80px]">{rec.adminName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(rec.uploadDate).toLocaleDateString("ar-JO")}
                      </td>
                      <td className="px-3 py-3 font-black text-primary dark:text-white tabular-nums">{rec.rowCount.toLocaleString()}</td>
                      <td className="px-3 py-3 font-black text-green-600 dark:text-green-400 tabular-nums">{rec.successCount.toLocaleString()}</td>
                      <td className="px-3 py-3 font-black text-red-500 tabular-nums">{rec.failCount}</td>
                      <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {rec.elapsedSec > 0 ? `${rec.elapsedSec}s` : "—"}
                      </td>
                      <td className="px-3 py-3">
                        {rec.distribution && Object.keys(rec.distribution).length > 0 ? (
                          <button
                            onClick={() => { setSelectedRecord(rec); setShowDistModal(true); }}
                            className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 whitespace-nowrap">
                            <MapPin className="w-3 h-3" />{Object.keys(rec.distribution).length} مح.
                          </button>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black whitespace-nowrap ${
                          rec.status === "success" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : rec.status === "partial" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        }`}>
                          {rec.status === "success" ? "✅ مكتمل" : rec.status === "partial" ? "⚠️ جزئي" : "❌ فشل"}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* Distribution Modal */}
      <AnimatePresence>
        {showDistModal && selectedRecord && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDistModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full shadow-2xl border border-border p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-primary dark:text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-500" />
                  توزيع الشقق
                </h3>
                <button onClick={() => setShowDistModal(false)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{selectedRecord.filename}</p>
              <div className="grid grid-cols-2 gap-2">
                {GOVERNORATES.map(gov => {
                  const count = selectedRecord.distribution?.[gov] || 0;
                  return (
                    <div key={gov} className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                      count > 0
                        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                        : "bg-muted/30 border-border opacity-40"
                    }`}>
                      <span className="text-sm font-bold text-primary dark:text-white">{GOV_LABELS[gov]}</span>
                      <span className={`font-black text-sm tabular-nums ${count > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
                <span className="text-muted-foreground">إجمالي</span>
                <span className="font-black text-primary dark:text-white tabular-nums">{selectedRecord.successCount.toLocaleString()} شقة</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
