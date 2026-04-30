import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { properties as mockProperties } from "../data/mockData";

type Language = "ar" | "en";
type Theme = "light" | "dark";

// ─── Singleton Supabase client with proper config to avoid lock warnings
export const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sb-yhusekmwaawcxemjcvbo-auth-token',
  },
});

// ─── Token cache to reduce getSession() calls
let cachedToken: string | null = null;
let tokenExpiry = 0;

// ─── Properties cache (localStorage) — 5-minute TTL
const PROPS_CACHE_KEY = "baity_props_cache_v1";
const PROPS_CACHE_TTL  = 5 * 60 * 1000; // 5 min

function getCachedProperties(): any[] | null {
  try {
    const raw = localStorage.getItem(PROPS_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (!Array.isArray(data) || Date.now() - ts > PROPS_CACHE_TTL) {
      localStorage.removeItem(PROPS_CACHE_KEY);
      return null;
    }
    return data;
  } catch { return null; }
}

function setCachedProperties(data: any[]): void {
  try {
    localStorage.setItem(PROPS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

function invalidatePropertiesCache(): void {
  try { localStorage.removeItem(PROPS_CACHE_KEY); } catch { /* ignore */ }
}

// ─── Retry fetch helper: retries up to `attempts` times with exponential back-off
// Silently swallows "Failed to fetch" errors on intermediate attempts
const retryFetch = async (
  input: string,
  init: RequestInit,
  attempts = 3,
  baseDelayMs = 1500,
): Promise<Response> => {
  let lastError: any;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(input, init);
      return res;
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(1.5, i)));
      }
    }
  }
  throw lastError;
};

/**
 * buildAuthHeaders — ينشئ headers المصادقة الصحيحة:
 *   Authorization: Bearer <publicAnonKey>  ← يمرّ دائماً عبر Supabase infrastructure
 *   X-User-Token:  Bearer <userJwt>        ← يقرأه السيرفر لتحديد هوية المستخدم
 *
 * ⚠️ لا تضع user JWT في Authorization: سترفضه البنية التحتية عند انتهاء الصلاحية.
 */
const buildAuthHeaders = (
  userToken: string,
  extra?: Record<string, string>,
): Record<string, string> => ({
  "Authorization": `Bearer ${publicAnonKey}`,
  ...extra,
  "X-User-Token": userToken,
});

/**
 * authedFetch — wrapper يضيف Authentication headers تلقائياً
 * @param input - URL
 * @param options - { userToken, method?, body?, headers? }
 */
const authedFetch = async (
  input: string,
  options: {
    userToken: string;
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  },
): Promise<Response> => {
  const { userToken, method = "GET", body, headers } = options;
  const finalHeaders = buildAuthHeaders(userToken, {
    "Content-Type": "application/json",
    ...headers,
  });

  return retryFetch(input, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
};

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: string) => string;
  user: any | null;
  setUser: (user: any | null) => void;
  isAuthenticated: boolean;
  authReady: boolean;
  properties: any[];
  addProperty: (property: any) => Promise<boolean>;
  removeProperty: (id: string) => Promise<boolean>;
  refreshProperties: () => Promise<void>;
  isLoadingProperties: boolean;
  favorites: string[];
  toggleFavorite: (propertyId: string) => Promise<void>;
  isFavorite: (propertyId: string) => boolean;
  sendMessage: (threadId: string | null, content: string, propertyId?: string, recipientId?: string) => Promise<boolean>;
  threads: any[];
  refreshThreads: () => void;
  markThreadAsRead: (threadId: string) => Promise<boolean>;
  fetchThreadById: (threadId: string) => Promise<any | null>;
  uploadFile: (fileData: string, mimeType: string, fileName: string) => Promise<{ path: string; signedUrl: string } | null>;
  trackWhatsAppClick: (propertyId: string, ownerPhone: string) => Promise<boolean>;
  notifications: any[];
  unreadNotificationsCount: number;
  refreshNotifications: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultAppContext: AppContextType = {
  language: "ar",
  setLanguage: () => {},
  theme: "light",
  setTheme: () => {},
  t: (key: string) => key,
  user: null,
  setUser: () => {},
  isAuthenticated: false,
  authReady: false,
  properties: [],
  addProperty: async () => false,
  removeProperty: async () => false,
  refreshProperties: async () => {},
  isLoadingProperties: false,
  favorites: [],
  toggleFavorite: async () => {},
  isFavorite: () => false,
  sendMessage: async () => false,
  threads: [],
  refreshThreads: () => {},
  markThreadAsRead: async () => false,
  fetchThreadById: async () => null,
  uploadFile: async () => null,
  trackWhatsAppClick: async () => false,
  notifications: [],
  unreadNotificationsCount: 0,
  refreshNotifications: () => {},
};

// الترجمات
const translations = {
  ar: {
    // Navbar
    home: "الرئيسية",
    addProperty: "أضف عقارك",
    myAccount: "حسابي",
    
    // Home Page
    logoName: "بيتي",
    heroTitle: "اكتشف بيتك المثالي في الأردن",
    heroSubtitle: "آلاف العقارات للبيع والإيجار في جميع أنحاء المملكة",
    searchPlaceholder: "ابحث عن منطقة، مدينة، أو عقار...",
    searchButton: "ابدأ البحث الآن",
    selectGovernorate: "اختر المحافظة",
    propertiesAvailable: "عقار متاح",
    whyBaity: "لماذا تختار بيتي؟",
    interactiveMaps: "خرائط تفاعلية",
    interactiveMapsDesc: "تصفح العقارات على الخريطة مع عرض ثلاثي الأبعاد",
    competitivePrices: "أسعار تنافسية",
    competitivePricesDesc: "أفضل العروض والأسعار في السوق الأردني",
    highReliability: "موثوقية عالية",
    highReliabilityDesc: "جميع العقارات موثقة ومفحوصة من قبل فريقنا",
    havePropertyTitle: "هل لديك عقار للبيع أو الإيجار؟",
    havePropertyDesc: "انضم إلى آلاف أصحاب العقارات واعرض عقارك الآن",
    addPropertyFree: "أضف عقارك مجاناً",
    kingdomMap: "خريطة المملكة",
    governorateLocation: "موقع المحافظة",
    totalProperties: "إجمالي العقارات",
    
    // Property Card
    views: "مشاهدة",
    inquiries: "استفسار",
    perMonth: "/شهر",
    jd: "د.أ",
    sqm: "م²",
    bed: "غرفة",
    bath: "حمام",
    
    // Filters
    filters: "الفلاتر",
    operationType: "نوع العملية",
    propertyType: "نوع العقار",
    bedrooms: "عدد الغرف",
    price: "السعر",
    from: "من",
    to: "إلى",
    all: "الكل",
    sale: "بيع",
    rent: "إيجار",
    apartment: "شقة",
    villa: "فيلا",
    land: "أرض",
    commercial: "تجاري",
    office: "مكتب",
    chalet: "شاليه",
    applyFilters: "تطبيق",
    resetFilters: "إعادة تعيين",
    
    // View Modes
    map: "خريطة",
    earth3D: "عرض ثلاثي الأبعاد",
    grid: "عرض شبكي",
    
    // Property Details
    viewFullDetails: "عرض التفاصيل الكاملة",
    description: "الوصف",
    noProperties: "لا توجد عقارات متاحة",
    tryAdjustFilters: "جرب تعديل الفلاتر للحصول على نتائج أخرى",
    propertyDetails: "تفاصيل العقار",
    contactOwner: "تواصل مع المالك",
    shareProperty: "مشاركة العقار",
    saveToFavorites: "حفظ في المفضلة",
    propertyFeatures: "مميزات العقار",
    
    // Governorates
    amman: "عمّان",
    zarqa: "الزرقاء",
    irbid: "إربد",
    aqaba: "العقبة",
    mafraq: "المفرق",
    balqa: "البلقاء",
    karak: "الكرك",
    madaba: "مأدبا",
    jerash: "جرش",
    ajloun: "عجلون",
    maan: "معان",
    tafilah: "الطفيلة",
  },
  en: {
    // Navbar
    home: "Home",
    addProperty: "Add Property",
    myAccount: "My Account",
    
    // Home Page
    logoName: "Baity",
    heroTitle: "Find Your Perfect Home in Jordan",
    heroSubtitle: "Thousands of properties for sale and rent across the Kingdom",
    searchPlaceholder: "Search for area, city, or property...",
    searchButton: "Start Search Now",
    selectGovernorate: "Select Governorate",
    propertiesAvailable: "properties available",
    whyBaity: "Why Choose Baity?",
    interactiveMaps: "Interactive Maps",
    interactiveMapsDesc: "Browse properties on the map with 3D view",
    competitivePrices: "Competitive Prices",
    competitivePricesDesc: "Best offers and prices in the Jordanian market",
    highReliability: "High Reliability",
    highReliabilityDesc: "All properties are verified and inspected by our team",
    havePropertyTitle: "Have a property for sale or rent?",
    havePropertyDesc: "Join thousands of property owners and list your property now",
    addPropertyFree: "Add Your Property for Free",
    kingdomMap: "Kingdom Map",
    governorateLocation: "Governorate Location",
    totalProperties: "Total Properties",
    
    // Property Card
    views: "views",
    inquiries: "inquiries",
    perMonth: "/month",
    jd: "JD",
    sqm: "sqm",
    bed: "bed",
    bath: "bath",
    
    // Filters
    filters: "Filters",
    operationType: "Operation Type",
    propertyType: "Property Type",
    bedrooms: "Bedrooms",
    price: "Price",
    from: "From",
    to: "To",
    all: "All",
    sale: "Sale",
    rent: "Rent",
    apartment: "Apartment",
    villa: "Villa",
    land: "Land",
    commercial: "Commercial",
    office: "Office",
    chalet: "Chalet",
    applyFilters: "Apply",
    resetFilters: "Reset",
    
    // View Modes
    map: "Map",
    earth3D: "3D View",
    grid: "Grid View",
    
    // Property Details
    viewFullDetails: "View Full Details",
    description: "Description",
    noProperties: "No properties available",
    tryAdjustFilters: "Try adjusting filters to get other results",
    propertyDetails: "Property Details",
    contactOwner: "Contact Owner",
    shareProperty: "Share Property",
    saveToFavorites: "Save to Favorites",
    propertyFeatures: "Property Features",
    
    // Governorates
    amman: "Amman",
    zarqa: "Zarqa",
    irbid: "Irbid",
    aqaba: "Aqaba",
    mafraq: "Mafraq",
    balqa: "Balqa",
    karak: "Karak",
    madaba: "Madaba",
    jerash: "Jerash",
    ajloun: "Ajloun",
    maan: "Ma'an",
    tafilah: "Tafilah",
  },
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "ar";
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    return (saved as Theme) || "light";
  });

  const [user, setUser] = useState<any | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  const unreadNotificationsCount = notifications.filter((n: any) => !n.read).length;

  // Initialize Auth
  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        setUser({
          ...session.user,
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0],
          email: session.user.email,
        });
        const accessToken = session.access_token;
        setToken(accessToken);
        // Keep module-level cache in sync
        try {
          const decoded = JSON.parse(atob(accessToken.split(".")[1]));
          cachedToken = accessToken;
          tokenExpiry = decoded.exp * 1000;
        } catch { /* ignore decode errors */ }
        fetchFavorites(accessToken);
        fetchThreads(accessToken);
        fetchNotificationsForUser(accessToken);
      } else {
        setUser(null);
        setFavorites([]);
        setThreads([]);
        setNotifications([]);
        setToken(null);
        // Clear module-level cache so stale tokens are not reused
        cachedToken = null;
        tokenExpiry = 0;
      }
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Polling للإشعارات والرسائل
  useEffect(() => {
    if (!user?.id) return;

    const id = setInterval(async () => {
      const token = await getValidToken();
      if (token) {
        fetchThreads(token);
        fetchNotificationsForUser(token);
      }
    }, 30_000);

    return () => clearInterval(id);
  }, [user?.id]);

  // Admin keyboard shortcut: Ctrl + Shift + A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        window.location.href = '/admin/login';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchThreads = async (token?: string) => {
    try {
      const userToken = token ?? await getValidToken();
      if (!userToken) return;
      const response = await authedFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/messages`,
        { userToken },
      );
      const data = await response.json();
      if (data.success) setThreads(data.data);
    } catch (e) {
      setThreads([]);
    }
  };

  const fetchThreadById = async (threadId: string): Promise<any | null> => {
    try {
      const userToken = await getValidToken();
      if (!userToken) return null;
      const response = await authedFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/messages/${encodeURIComponent(threadId)}`,
        { userToken },
      );
      const data = await response.json();
      if (data.success && data.data) return data.data;
      return null;
    } catch (e) {
      console.error("fetchThreadById error:", e);
      return null;
    }
  };

  const markThreadAsRead = async (threadId: string): Promise<boolean> => {
    try {
      const userToken = await getValidToken();
      if (!userToken) return false;
      const response = await authedFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/messages/${encodeURIComponent(threadId)}/mark-read`,
        { userToken, method: "POST" },
      );
      const data = await response.json();
      if (data.success) {
        await fetchThreads(userToken);
        return true;
      }
      return false;
    } catch (e) {
      console.error("markThreadAsRead error:", e);
      return false;
    }
  };

  const sendMessage = async (
    threadId: string | null,
    content: string,
    propertyId?: string,
    recipientId?: string,
  ): Promise<boolean> => {
    try {
      const userToken = await getValidToken();
      if (!userToken) return false;
      const response = await authedFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/messages`,
        {
          userToken,
          method: "POST",
          // Server expects: text, propertyId, ownerId
          body: { threadId, text: content, content, propertyId, ownerId: recipientId, recipientId },
        },
      );
      const data = await response.json();
      if (data.success) {
        await fetchThreads(userToken);
        return true;
      }
      console.error("sendMessage failed:", data.error);
      return false;
    } catch (e) {
      console.error("sendMessage error:", e);
      return false;
    }
  };

  const getValidToken = async (): Promise<string | null> => {
    const now = Date.now();
    if (cachedToken && now < tokenExpiry) return cachedToken;

    // Clear stale cache before re-fetching
    cachedToken = null;
    tokenExpiry = 0;

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      let token = session?.access_token || null;

      // If no active session, attempt a silent refresh before giving up
      if (!token) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        token = refreshed?.session?.access_token || null;
      }

      if (token) {
        try {
          const decodedToken = JSON.parse(atob(token.split('.')[1]));
          tokenExpiry = decodedToken.exp * 1000;
          cachedToken = token;
        } catch { /* ignore decode errors */ }
      }
      return token;
    } catch (e) {
      console.error("getValidToken error:", e);
      return null;
    }
  };

  const isAuthenticated = !!user;

  const fetchFavorites = async (token?: string) => {
    try {
      const userToken = token ?? await getValidToken();
      if (!userToken) return;
      const response = await authedFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/favorites`,
        { userToken },
      );
      const data = await response.json();
      if (data.success) setFavorites(data.data);
    } catch (e) {
      setFavorites([]);
    }
  };

  const toggleFavorite = async (propertyId: string) => {
    const userToken = await getValidToken();
    if (!userToken) return;

    // Save current state before optimistic update
    const wasFavorite = favorites.includes(propertyId);

    // ✅ OPTIMISTIC UPDATE - Update UI immediately for instant feedback
    if (wasFavorite) {
      setFavorites((prev) => prev.filter((id) => id !== propertyId));
    } else {
      setFavorites((prev) => [...prev, propertyId]);
    }

    try {
      // Send request to server
      const response = await authedFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/favorites`,
        {
          userToken,
          method: wasFavorite ? "DELETE" : "POST",
          body: { propertyId },
        },
      );
      const data = await response.json();

      // If server request failed, revert the optimistic update
      if (!data.success) {
        console.error("toggleFavorite server error:", data.error);
        // Revert to previous state
        if (wasFavorite) {
          setFavorites((prev) => [...prev, propertyId]);
        } else {
          setFavorites((prev) => prev.filter((id) => id !== propertyId));
        }
      }
    } catch (e) {
      console.error("toggleFavorite error:", e);
      // On error, revert the optimistic update to original state
      if (wasFavorite) {
        setFavorites((prev) => [...prev, propertyId]);
      } else {
        setFavorites((prev) => prev.filter((id) => id !== propertyId));
      }
    }
  };

  const isFavorite = (propertyId: string) => favorites.includes(propertyId);

  const fetchProperties = async () => {
    setIsLoadingProperties(true);
    try {
      const userToken = await getValidToken();
      const response = await retryFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/properties`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
            ...(userToken ? { "X-User-Token": userToken } : {}),
            "Content-Type": "application/json",
          },
        },
      );
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setProperties(data.data);
        setCachedProperties(data.data);
      } else {
        setProperties([]);
      }
    } catch (e) {
      console.error("❌ [AppContext] Failed to fetch properties:", e);
      // On error keep existing properties (from cache or previous fetch)
    } finally {
      setIsLoadingProperties(false);
    }
  };

  const addProperty = async (property: any): Promise<boolean> => {
    try {
      const userToken = await getValidToken();
      if (!userToken) return false;
      const response = await authedFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/properties`,
        {
          userToken,
          method: "POST",
          body: property,
        },
      );
      const data = await response.json();
      if (data.success) {
        invalidatePropertiesCache();
        await fetchProperties();
        return true;
      }
      return false;
    } catch (e) {
      console.error("addProperty error:", e);
      return false;
    }
  };

  const removeProperty = async (id: string): Promise<boolean> => {
    try {
      const userToken = await getValidToken();
      if (!userToken) return false;
      const response = await authedFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/properties/${id}`,
        {
          userToken,
          method: "DELETE",
        },
      );
      const data = await response.json();
      if (data.success) {
        invalidatePropertiesCache();
        setProperties((prev) => prev.filter((p) => p.id !== id));
        return true;
      }
      return false;
    } catch (e) {
      console.error("removeProperty error:", e);
      return false;
    }
  };

  useEffect(() => {
    // Load from cache immediately for fast initial render
    const cachedProps = getCachedProperties();
    if (cachedProps && cachedProps.length > 0) {
      setProperties(cachedProps);
      // Then refresh in background (stale-while-revalidate)
      fetchProperties();
    } else {
      fetchProperties();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.setAttribute("lang", language);
    document.documentElement.setAttribute("dir", language === "ar" ? "rtl" : "ltr");
  }, [language]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    // also toggle Tailwind .dark class so dark: variants work
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.ar] || key;
  };

  const uploadFile = async (
    fileData: string,
    mimeType: string,
    fileName: string,
  ): Promise<{ path: string; signedUrl: string } | null> => {
    try {
      const userToken = await getValidToken();
      if (!userToken) return null;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/upload`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
            "X-User-Token": userToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileData, mimeType, fileName }),
        },
      );
      const data = await response.json();
      if (data.success) return data.data;
      console.error("uploadFile error:", data.error);
      return null;
    } catch (e) {
      console.error("Error uploading file", e);
      return null;
    }
  };

  const trackWhatsAppClick = async (propertyId: string, ownerPhone: string) => {
    try {
      const userToken = await getValidToken();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/track-whatsapp`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
            "X-User-Token": userToken || "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ propertyId, ownerPhone }),
        },
      );
      const data = await response.json();
      if (data.success) return true;
      console.error("trackWhatsAppClick error:", data.error);
      return false;
    } catch (e) {
      console.error("Error tracking WhatsApp click", e);
      return false;
    }
  };

  const fetchMessages = async () => {
    if (!user || !token) return;
    setIsLoadingMessages(true);
    try {
      const userToken = token;
      const response = await authedFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/messages`,
        { userToken },
      );
      if (!response.ok) throw new Error("Failed to load messages");
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) setThreads(data.data);
    } catch (err: any) {
      console.error("fetchMessages error:", err.message);
      setThreads([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const fetchThread = async (threadId: string): Promise<any | null> => {
    if (!token) return null;
    setIsLoadingMessages(true);
    try {
      const userToken = token;
      const response = await authedFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/messages/${encodeURIComponent(threadId)}`,
        { userToken },
      );
      if (!response.ok) throw new Error("Failed to load thread");
      const data = await response.json();
      if (data.success && data.data) return data.data;
      return null;
    } catch (err: any) {
      console.error("fetchThread error:", err.message);
      return null;
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const fetchNotificationsForUser = async (userToken?: string) => {
    try {
      const tok = userToken ?? await getValidToken();
      if (!tok) return;
      const response = await authedFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/notifications`,
        { userToken: tok },
      );
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
      }
    } catch (e) {
      // silently fail
    }
  };

  return (
    <AppContext.Provider value={{ 
      language, 
      setLanguage, 
      theme, 
      setTheme, 
      t, 
      user, 
      setUser, 
      isAuthenticated,
      authReady,
      properties, 
      addProperty, 
      removeProperty, 
      refreshProperties: fetchProperties, 
      isLoadingProperties,
      favorites, 
      toggleFavorite, 
      isFavorite,
      threads, 
      refreshThreads: fetchThreads, 
      sendMessage, 
      markThreadAsRead, 
      fetchThreadById, 
      uploadFile,
      trackWhatsAppClick,
      notifications,
      unreadNotificationsCount,
      refreshNotifications: fetchNotificationsForUser,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  return context ?? defaultAppContext;
}

// Export helper function for external use
export async function getValidToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  // Clear stale cache before re-fetching
  cachedToken = null;
  tokenExpiry = 0;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;

    let token = session?.access_token || null;

    // If no active session, attempt a silent refresh before giving up
    if (!token) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed?.session?.access_token || null;
    }

    if (token) {
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        tokenExpiry = decodedToken.exp * 1000;
        cachedToken = token;
      } catch { /* ignore decode errors */ }
    }
    return token;
  } catch (e) {
    console.error("getValidToken error:", e);
    return null;
  }
}