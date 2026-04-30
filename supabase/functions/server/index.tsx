import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";

// ════════════════════════════════════════════════════════════════════════════
// SUPPRESS DENO/SUPABASE HTTP DISCONNECT NOISE — must run before anything else
//
// "Http: connection closed before message completed" is NOT a real server error.
// It fires whenever a browser tab is closed / navigates away while a request is
// in-flight.  Supabase's edge-runtime logs it via console.error(reason) BEFORE
// the JS unhandledrejection event fires, so addEventListener alone is too late.
// We intercept console.error at module-load time to silently drop that noise.
// ════════════════════════════════════════════════════════════════════════════
const _isHttpDisconnect = (e: any): boolean => {
  if (!e) return false;
  const n: string = e?.name ?? "";
  const m: string = (e?.message ?? "").toLowerCase();
  return (
    n === "Http" || n === "BadResource" || n === "ConnectionReset" || n === "BrokenPipe" ||
    e?.code === "EPIPE" ||
    m.includes("connection closed") || m.includes("broken pipe") ||
    m.includes("error writing a body") || m.includes("connection reset") ||
    m.includes("early eof") || m.includes("write zero")
  );
};
const __origConsoleError = console.error.bind(console);
console.error = (...args: any[]) => {
  if (args.length === 1 && _isHttpDisconnect(args[0])) return;
  __origConsoleError(...args);
};
globalThis.addEventListener("unhandledrejection", (event: any) => {
  if (_isHttpDisconnect(event?.reason)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
globalThis.addEventListener("error", (event: any) => {
  if (_isHttpDisconnect(event?.error)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
// ════════════════════════════════════════════════════════════════════════════

const BUCKET = "make-26c70f3b-properties";
const PREFIX = "/make-server-26c70f3b";
const ADMIN_EMAIL = "admin@baity.com";
const TABLE = "kv_store_26c70f3b";

// ══════════════════════════════════���═════════
// Singleton Supabase clients
// Creating a new client on every KV call spawns new HTTP/2 connection pools
// each time and exhausts Deno's resource limits, causing
// "Http: connection closed before message completed" under any load.
// ════════════════════════════════════════════
const _svcClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const _anonClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/** Returns the shared service-role client (singleton). */
function getServiceClient() { return _svcClient; }

// ════════════════════════════════════════════
// KV Store Utilities  (all reuse the singleton)
// ════════════════════════════════════════════
const kv = {
  set: async (key: string, value: any): Promise<void> => {
    const { error } = await _svcClient.from(TABLE).upsert({ key, value });
    if (error) throw new Error(error.message);
  },
  get: async (key: string): Promise<any> => {
    const { data, error } = await _svcClient.from(TABLE).select("value").eq("key", key).maybeSingle();
    if (error) throw new Error(error.message);
    return data?.value;
  },
  del: async (key: string): Promise<void> => {
    const { error } = await _svcClient.from(TABLE).delete().eq("key", key);
    if (error) throw new Error(error.message);
  },
  mset: async (keys: string[], values: any[]): Promise<void> => {
    const { error } = await _svcClient.from(TABLE).upsert(keys.map((k, i) => ({ key: k, value: values[i] })));
    if (error) throw new Error(error.message);
  },
  mget: async (keys: string[]): Promise<any[]> => {
    const { data, error } = await _svcClient.from(TABLE).select("value").in("key", keys);
    if (error) throw new Error(error.message);
    return data?.map((d: any) => d.value) ?? [];
  },
  mdel: async (keys: string[]): Promise<void> => {
    const { error } = await _svcClient.from(TABLE).delete().in("key", keys);
    if (error) throw new Error(error.message);
  },
  getByPrefix: async (prefix: string): Promise<any[]> => {
    const { data, error } = await _svcClient.from(TABLE).select("key, value").like("key", `${prefix}%`);
    if (error) throw new Error(error.message);
    return data?.map((d: any) => d.value) ?? [];
  },
  /**
   * Fetches only the threads that belong to a specific user (inquirer OR owner).
   * Filters at the PostgreSQL/JSONB level — avoids loading the entire threads
   * table into the edge function just to find one user's conversations.
   */
  getThreadsByUser: async (userId: string): Promise<any[]> => {
    const { data, error } = await _svcClient
      .from(TABLE)
      .select("value")
      .like("key", "thread_%")
      .or(`value->>inquirerId.eq.${userId},value->>ownerId.eq.${userId}`);
    if (error) {
      // Fallback: full scan if the JSONB filter expression fails
      console.warn("getThreadsByUser JSONB filter failed, using full scan:", error.message);
      const { data: all, error: e2 } = await _svcClient
        .from(TABLE).select("value").like("key", "thread_%");
      if (e2) throw new Error(e2.message);
      return (all ?? [])
        .map((d: any) => d.value)
        .filter((t: any) => t?.inquirerId === userId || t?.ownerId === userId);
    }
    return (data ?? []).map((d: any) => d.value);
  },
};

// ════════════════════════════════════════════
// Real Jordan Governorate Coordinates
// ════════════════════════════════════════════
const GOVERNORATE_COORDS: Record<string, { lat: number; lng: number }> = {
  "عمّان":    { lat: 31.9539, lng: 35.9106 },
  "الزرقاء": { lat: 32.0728, lng: 36.0879 },
  "إربد":    { lat: 32.5568, lng: 35.8469 },
  "العقبة":  { lat: 29.5326, lng: 35.0063 },
  "المفرق":  { lat: 32.3411, lng: 36.2036 },
  "البلقاء": { lat: 32.0318, lng: 35.7314 },
  "الكرك":   { lat: 31.1847, lng: 35.7024 },
  "مأدبا":   { lat: 31.7168, lng: 35.7935 },
  "جرش":     { lat: 32.2797, lng: 35.8993 },
  "عجلون":   { lat: 32.3261, lng: 35.7523 },
  "معان":    { lat: 30.1928, lng: 35.7364 },
  "الطفيلة": { lat: 30.8394, lng: 35.6055 },
};

const app = new Hono();

app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "X-User-Token"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// ════════════════════════════════════════════
// Security Utilities
// ════════════════════════════════════════════

function sanitize(text: any, maxLen: number): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim()
    .slice(0, maxLen);
}

function sanitizeName(name: any): string {
  if (typeof name !== "string") return "";
  return name.replace(/[<>&"'`]/g, "").trim().slice(0, 100);
}

function isValidEmail(email: any): boolean {
  if (typeof email !== "string" || email.length > 255) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validatePassword(password: any): { valid: boolean; error: string } {
  if (typeof password !== "string" || password.length === 0)
    return { valid: false, error: "كلمة المرور مطلوبة" };
  if (password.length < 6)
    return { valid: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" };
  if (password.length > 128)
    return { valid: false, error: "كلمة المرور طويلة جداً" };
  return { valid: true, error: "" };
}

const ALLOWED_MIME = [
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif", "pdf", "doc", "docx", "txt"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function validateFile(mimeType: string, base64: string, fileName?: string): { valid: boolean; error: string } {
  const mime = mimeType.split(";")[0].trim().toLowerCase();
  if (!ALLOWED_MIME.includes(mime))
    return { valid: false, error: "نوع الملف غير مسموح به" };
  if (fileName) {
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext))
      return { valid: false, error: `امتداد الملف .${ext} غير مسموح به` };
  }
  const raw = base64.includes(",") ? base64.split(",")[1] : base64;
  const bytes = Math.ceil(raw.length * 0.75);
  if (bytes > MAX_FILE_BYTES)
    return { valid: false, error: "حجم الملف يتجاوز الحد المسموح به (10 ميغابايت)" };
  return { valid: true, error: "" };
}

async function checkRateLimit(limitKey: string, maxAttempts: number, windowMs: number): Promise<boolean> {
  try {
    const now = Date.now();
    const record: any = await kv.get("ratelimit_" + limitKey);
    if (!record || (now - record.windowStart) > windowMs) {
      await kv.set("ratelimit_" + limitKey, { count: 1, windowStart: now });
      return true;
    }
    if (record.count >= maxAttempts) return false;
    await kv.set("ratelimit_" + limitKey, { count: record.count + 1, windowStart: record.windowStart });
    return true;
  } catch { return true; }
}

// ════════════════════════════════════════════
// Supabase Helpers
// ════════════════════════════════════════════

function extractUserToken(c: any): string | null {
  const xToken = c.req.header("X-User-Token")?.trim();
  if (xToken) return xToken;
  const bearer = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return null;
  try {
    const b64 = bearer.split(".")[1];
    if (!b64) return null;
    const padding = "=".repeat((4 - (b64.replace(/-/g, "+").replace(/_/g, "/").length % 4)) % 4);
    const payload = JSON.parse(atob(b64.replace(/-/g, "+").replace(/_/g, "/") + padding));
    if (payload?.role === "authenticated" && payload?.sub) return bearer;
  } catch { /* JWT تالف */ }
  return null;
}

async function getSupabaseUser(token: string) {
  const serviceClient = _svcClient;   // reuse singleton
  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Decode JWT payload without verifying signature
  function decodeJwtPayload(t: string): any | null {
    try {
      const parts = t.split(".");
      if (parts.length !== 3) return null;
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = "=".repeat((4 - (b64.length % 4)) % 4);
      return JSON.parse(atob(b64 + pad));
    } catch { return null; }
  }

  // Fallback: validate JWT expiry + fetch user via service-role (no session required)
  async function getUserByJwt(t: string): Promise<{ user: any; error: any }> {
    const payload = decodeJwtPayload(t);
    if (!payload?.sub) return { user: null, error: new Error("Invalid JWT: no sub claim") };
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { user: null, error: new Error("JWT has expired") };
    }
    try {
      const { data, error } = await serviceClient.auth.admin.getUserById(payload.sub);
      if (error || !data?.user) return { user: null, error: error || new Error("User not found") };
      return { user: data.user, error: null };
    } catch (e: any) {
      return { user: null, error: e };
    }
  }

  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { "apikey": anonKey, "Authorization": `Bearer ${token}` },
    });

    if (res.ok) {
      const user = await res.json();
      if (user?.id) return { supabase: serviceClient, user, error: null };
      // Unexpected empty body — fall through to JWT fallback
    } else {
      let errBody: any = {};
      try { errBody = await res.json(); } catch { /* ignore */ }

      // Collect all possible error text fields Supabase GoTrue may use
      const allErrText = [
        errBody.msg,
        errBody.message,
        errBody.error_description,
        errBody.error,
        typeof errBody.code === "string" ? errBody.code : "",
      ].filter(Boolean).join(" ").toLowerCase();

      // For any 401, prefer JWT+admin fallback over a hard failure.
      // For other errors (403, 5xx …) propagate immediately unless it's a known auth issue.
      const isSessionError =
        res.status === 401 ||
        (allErrText.includes("session") || allErrText.includes("jwt") ||
         allErrText.includes("token") || allErrText.includes("invalid_grant"));

      if (!isSessionError) {
        const readable = errBody.msg || errBody.message || errBody.error_description || `HTTP ${res.status}`;
        return { supabase: serviceClient, user: null, error: new Error(readable) };
      }
      console.log("getSupabaseUser: auth check failed (status", res.status, "), using JWT fallback –", allErrText || "no body");
    }

    // JWT fallback path — validates JWT locally + fetches user via service-role key
    const { user, error } = await getUserByJwt(token);
    return { supabase: serviceClient, user, error };
  } catch (e: any) {
    return { supabase: serviceClient, user: null, error: e };
  }
}

async function requireAdmin(c: any): Promise<{ user: any; error: Response | null }> {
  const token = extractUserToken(c);
  if (!token) return { user: null, error: c.json({ success: false, error: "غير مصرح" }, 401) };
  const { user, error: ae } = await getSupabaseUser(token);
  if (ae || !user) return { user: null, error: c.json({ success: false, error: "غير مصرح" }, 401) };
  if (user.email !== ADMIN_EMAIL) return { user: null, error: c.json({ success: false, error: "ليس لديك صلاحية أدمن" }, 403) };
  return { user, error: null };
}

async function uploadBase64ToStorage(supabase: any, base64: string, mimeType: string, fileName: string): Promise<string | null> {
  try {
    const pure = base64.includes(",") ? base64.split(",")[1] : base64;
    const binary = atob(pure);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const mime = mimeType.split(";")[0].trim().toLowerCase();
    const ext = mime.split("/")[1]?.split(";")[0] || "bin";
    const safeName = (fileName || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const path = "files/" + crypto.randomUUID() + "_" + safeName + "." + ext;
    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
    if (error) { console.error("Storage upload error:", error.message); return null; }
    return path;
  } catch (e: any) {
    console.error("uploadBase64ToStorage error:", e.message);
    return null;
  }
}

async function getSignedUrl(supabase: any, path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) { console.error("signedUrl error:", error.message); return null; }
    return data?.signedUrl ?? null;
  } catch (e: any) {
    console.error("signedUrl exception:", e.message);
    return null;
  }
}

function getPublicUrl(path: string): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}

function refreshImageUrl(imageUrl: string): string {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http") && !imageUrl.includes("/object/sign/")) return imageUrl;
  if (imageUrl.includes("/object/sign/")) {
    try {
      const match = imageUrl.match(/\/object\/sign\/[^/]+\/(.+?)(?:\?|$)/);
      if (match && match[1]) return getPublicUrl(match[1]);
    } catch { /* fallback below */ }
  }
  if (!imageUrl.startsWith("http")) return getPublicUrl(imageUrl);
  return imageUrl;
}

function refreshPropertyImages(property: any): any {
  if (!property) return property;
  const p = { ...property };
  if (p.image) p.image = refreshImageUrl(p.image);
  if (Array.isArray(p.images)) {
    p.images = p.images.map((img: string) => refreshImageUrl(img));
  }
  return p;
}

function errorRes(c: any, status: number, userMsg: string, log?: string): any {
  if (log) console.error("[" + status + "]", log);
  return c.json({ success: false, error: userMsg }, status);
}

// ════════════════════════════════════════════
// Admin Log Helper
// ════════════════════════════════════════════
async function writeAdminLog(opts: {
  adminId: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: any;
}): Promise<void> {
  try {
    const id = "admin_log_" + crypto.randomUUID();
    await kv.set(id, {
      id,
      admin_id: opts.adminId,
      admin_email: opts.adminEmail,
      action: opts.action,
      entity_type: opts.entityType,
      entity_id: opts.entityId,
      details: opts.details || {},
      created_at: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("writeAdminLog error:", e.message);
  }
}

// ══════════���═════════════════════════════════
// Storage bucket setup on startup
// ════════════════════════════════════════════
(async () => {
  try {
    const supabase = getServiceClient();
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b: any) => b.name === BUCKET)) {
      await supabase.storage.createBucket(BUCKET, { public: true });
      console.log("Bucket created (public):", BUCKET);
    } else {
      await supabase.storage.updateBucket(BUCKET, { public: true });
      console.log("Bucket updated to public:", BUCKET);
    }
  } catch (e: any) {
    console.error("Bucket setup error:", e.message);
  }
})();

// ════════════════════════════════════════════
// Admin account auto-creation on startup
// ════════════════════════════════════════════
(async () => {
  try {
    const supabase = getServiceClient();
    const { error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: "Admin@Baity2024",
      user_metadata: { name: "مدير النظام", role: "admin" },
      email_confirm: true,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      const alreadyExists =
        msg.includes("already") || msg.includes("exists") ||
        msg.includes("registered") || msg.includes("duplicate");
      if (alreadyExists) {
        console.log("Admin account already exists:", ADMIN_EMAIL);
      } else {
        console.error("Admin account creation error:", error.message);
      }
    } else {
      console.log("Admin account created successfully:", ADMIN_EMAIL);
    }
  } catch (e: any) {
    console.error("Admin init exception:", e.message);
  }
})();

// ════════════════════════════════════════════
// Routes
// ════════════════════════════════════════════

app.get(`${PREFIX}/health`, (c) => c.json({ status: "ok", version: "11-inline-kv" }));

app.get(`${PREFIX}/governorate-coords`, (c) => {
  return c.json({ success: true, data: GOVERNORATE_COORDS });
});

// ─── Signup
app.post(`${PREFIX}/signup`, async (c) => {
  try {
    let body: any;
    try { body = await c.req.json(); }
    catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const rawPassword = body.password;
    const rawName = body.name;
    const rawPhone = body.phone;

    if (!isValidEmail(rawEmail)) return errorRes(c, 400, "صيغة البريد الإلكتروني غير صحيحة");
    const pwCheck = validatePassword(rawPassword);
    if (!pwCheck.valid) return errorRes(c, 400, pwCheck.error);
    const cleanName = sanitizeName(rawName);
    if (!cleanName || cleanName.length < 2) return errorRes(c, 400, "الاسم الكامل مطلوب (حرفان على الأقل)");

    const allowed = await checkRateLimit("signup_" + rawEmail, 5, 15 * 60 * 1000);
    if (!allowed) return errorRes(c, 429, "تم تجاوز عدد المحاولات المسموحة. يرجى المحاولة بعد 15 دقيقة");

    const cleanPhone = sanitize(rawPhone, 20);
    const supabase = getServiceClient();

    const { data, error } = await supabase.auth.admin.createUser({
      email: rawEmail,
      password: rawPassword,
      user_metadata: { name: cleanName, phone: cleanPhone },
      email_confirm: true,
    });

    if (error) {
      const lowerMsg = error.message.toLowerCase();
      const isDuplicate = lowerMsg.includes("already registered") || lowerMsg.includes("already exists") ||
        lowerMsg.includes("email exists") || lowerMsg.includes("duplicate") || lowerMsg.includes("user already");
      if (isDuplicate) return errorRes(c, 409, "هذا البريد الإلكتروني مسجّل مسبقاً");
      console.error("signup error:", error.message);
      return errorRes(c, 400, "تعذّر إنشاء الحساب. يرجى التحقق من البيانات والمحاولة مجدداً");
    }

    let session: any = null;
    try {
      const { data: si, error: siErr } = await _anonClient.auth.signInWithPassword({ email: rawEmail, password: rawPassword });
      if (!siErr && si?.session) {
        session = {
          access_token: si.session.access_token,
          refresh_token: si.session.refresh_token,
          expires_in: si.session.expires_in,
          token_type: si.session.token_type ?? "bearer",
        };
      }
    } catch { /* لا نُفشل التسجيل */ }

    return c.json({ success: true, data: { id: data.user?.id, email: data.user?.email, name: cleanName }, session });
  } catch (e: any) {
    console.error("signup exception:", e.message);
    return errorRes(c, 500, "حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة لاحقاً");
  }
});

// ─── Properties: GET public (only approved) — list view, description stripped
app.get(`${PREFIX}/properties`, async (c) => {
  try {
    const data = await kv.getByPrefix("property_");
    const approved = data
      .filter((p: any) => p.status === "approved" || p.status === "active")
      .map((p: any) => {
        const r = refreshPropertyImages(p);
        // Strip description from list view — full data is at /properties/:id
        // This can save 2-5 KB per property when descriptions are long
        const { description: _desc, ...rest } = r;
        return rest;
      });
    return c.json({ success: true, data: approved });
  } catch (e: any) {
    console.error("GET /properties:", e.message);
    return errorRes(c, 500, "تعذّر جلب العقارات");
  }
});

// ─── Properties: GET single (only approved)
app.get(`${PREFIX}/properties/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const property: any = await kv.get("property_" + id);
    if (!property) return errorRes(c, 404, "العقار غير موجود");
    if (property.status !== "approved" && property.status !== "active") {
      return errorRes(c, 404, "العقار غير موجود أو لم يتم الموافقة عليه بعد");
    }
    if ((!property.ownerName || property.ownerName === "مالك العقار") && property.userId) {
      try {
        const supabase = getServiceClient();
        const { data: userData } = await supabase.auth.admin.getUserById(property.userId);
        if (userData?.user) {
          property.ownerName = sanitizeName(userData.user.user_metadata?.name || userData.user.email?.split("@")[0] || "مالك العقار");
          property.ownerEmail = userData.user.email || "";
          property.ownerPhone = sanitize(userData.user.user_metadata?.phone || "", 20);
          await kv.set("property_" + id, property);
        }
      } catch (ue: any) { console.error("resolveOwnerName error:", ue.message); }
    }
    return c.json({ success: true, data: refreshPropertyImages(property) });
  } catch (e: any) {
    console.error("GET /properties/:id:", e.message);
    return errorRes(c, 500, "تعذّر جلب العقار");
  }
});

// ─── Properties: POST (submit for admin review)
app.post(`${PREFIX}/properties`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    let property: any;
    try { property = await c.req.json(); }
    catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const id = property.id || crypto.randomUUID();
    const govName = sanitize(property.governorate, 100);

    let location = property.location;
    const realCoords = GOVERNORATE_COORDS[govName];
    if (realCoords) {
      if (!location || typeof location.lat !== "number" || typeof location.lng !== "number" ||
          location.lat < 29.0 || location.lat > 33.5 ||
          location.lng < 34.8 || location.lng > 39.5) {
        location = realCoords;
      }
    }

    const doc = {
      ...property,
      id,
      title: sanitize(property.title, 200),
      description: sanitize(property.description, 5000),
      address: sanitize(property.address || govName, 300),
      governorate: govName,
      location,
      userId: user.id,
      ownerName: sanitizeName(user.user_metadata?.name || user.email?.split("@")[0] || "مالك العقار"),
      ownerEmail: user.email || "",
      ownerPhone: sanitize(user.user_metadata?.phone || "", 20),
      status: "pending",
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await kv.set("pending_property_" + id, doc);
    return c.json({
      success: true,
      data: doc,
      message: "تم إرسال عقارك للمراجعة، سيظهر على الموقع بعد موافقة الأدمن",
    });
  } catch (e: any) {
    console.error("POST /properties:", e.message);
    return errorRes(c, 500, "تعذّر إضافة العقار");
  }
});

// ─── Properties: PUT (owner or admin update — handles all states)
app.put(`${PREFIX}/properties/:id`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const id = c.req.param("id");

    // Find property in any state (approved, pending, rejected)
    let existing: any = null;
    let existingPrefix = "";

    existing = await kv.get("property_" + id);
    if (existing) existingPrefix = "property_";

    if (!existing) {
      existing = await kv.get("pending_property_" + id);
      if (existing) existingPrefix = "pending_property_";
    }

    if (!existing) {
      existing = await kv.get("rejected_property_" + id);
      if (existing) existingPrefix = "rejected_property_";
    }

    if (!existing) return errorRes(c, 404, "العقار غير موجود");
    if (user.email !== ADMIN_EMAIL && existing.userId !== user.id) return errorRes(c, 403, "غير مسموح");

    let updates: any;
    try { updates = await c.req.json(); }
    catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const isAdmin = user.email === ADMIN_EMAIL;
    const govName = sanitize(updates.governorate ?? existing.governorate, 100);

    let location = updates.location ?? existing.location;
    const realCoords = GOVERNORATE_COORDS[govName];
    if (realCoords) {
      if (!location || typeof location.lat !== "number" || typeof location.lng !== "number" ||
          location.lat < 29.0 || location.lat > 33.5 ||
          location.lng < 34.8 || location.lng > 39.5) {
        location = realCoords;
      }
    }

    const doc = {
      ...existing, ...updates, id,
      title: sanitize(updates.title ?? existing.title, 200),
      description: sanitize(updates.description ?? existing.description, 5000),
      address: sanitize(updates.address ?? existing.address ?? govName, 300),
      governorate: govName,
      location,
      userId: existing.userId,
      ownerName: existing.ownerName,
      ownerEmail: existing.ownerEmail,
      ownerPhone: existing.ownerPhone,
      updatedAt: new Date().toISOString(),
      submittedAt: existing.submittedAt || new Date().toISOString(),
    };

    if (isAdmin) {
      doc.status = updates.status ?? existing.status;
      await kv.set("property_" + id, doc);
    } else {
      // User editing: always reset to pending for admin re-review
      doc.status = "pending";
      if (existingPrefix === "property_") await kv.del("property_" + id);
      if (existingPrefix === "rejected_property_") await kv.del("rejected_property_" + id);
      await kv.set("pending_property_" + id, doc);
    }

    return c.json({
      success: true,
      data: doc,
      message: isAdmin
        ? "تم تحديث العقار بنجاح"
        : "تم إرسال التعديلات للمراجعة، وستُنشر بعد موافقة الأدمن",
    });
  } catch (e: any) {
    console.error("PUT /properties/:id:", e.message);
    return errorRes(c, 500, "تعذّر تحديث العقار");
  }
});

// ─── Properties: DELETE
app.delete(`${PREFIX}/properties/:id`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const id = c.req.param("id");

    const prop = await kv.get("property_" + id);
    if (prop) {
      if (user.email !== ADMIN_EMAIL && prop.userId !== user.id) return errorRes(c, 403, "غير مسموح");
      await kv.del("property_" + id);
      return c.json({ success: true });
    }

    const pendingProp = await kv.get("pending_property_" + id);
    if (pendingProp) {
      if (user.email !== ADMIN_EMAIL && pendingProp.userId !== user.id) return errorRes(c, 403, "غ��ر مسموح");
      await kv.del("pending_property_" + id);
      return c.json({ success: true });
    }

    const rejectedProp = await kv.get("rejected_property_" + id);
    if (rejectedProp) {
      if (user.email !== ADMIN_EMAIL && rejectedProp.userId !== user.id) return errorRes(c, 403, "غير مسموح");
      await kv.del("rejected_property_" + id);
      return c.json({ success: true });
    }

    return errorRes(c, 404, "العقار غير موجود");
  } catch (e: any) {
    console.error("DELETE /properties/:id:", e.message);
    return errorRes(c, 500, "تعذّر حذف العقار");
  }
});

// ─── My Properties
app.get(`${PREFIX}/my-properties`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const approved = await kv.getByPrefix("property_");
    const pending = await kv.getByPrefix("pending_property_");
    const rejected = await kv.getByPrefix("rejected_property_");
    const all = [...approved, ...pending, ...rejected]
      .filter((p: any) => p.userId === user.id)
      .map(refreshPropertyImages);
    all.sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    return c.json({ success: true, data: all });
  } catch (e: any) {
    console.error("GET /my-properties:", e.message);
    return errorRes(c, 500, "تعذّر جلب عقاراتك");
  }
});

// ─── Update property availability status (متاح / تم البيع) — owner only
app.post(`${PREFIX}/properties/:id/availability`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const id = c.req.param("id");

    // Search in all prefixes (approved, pending, rejected)
    let property: any = await kv.get("property_" + id);
    let propertyKey = "property_" + id;
    if (!property) {
      property = await kv.get("pending_property_" + id);
      propertyKey = "pending_property_" + id;
    }
    if (!property) {
      property = await kv.get("rejected_property_" + id);
      propertyKey = "rejected_property_" + id;
    }
    if (!property) {
      return errorRes(c, 404, "العقار غير موجود");
    }
    if (property.userId !== user.id && user.email !== ADMIN_EMAIL) {
      return errorRes(c, 403, "غير مسموح — يمكن للمالك فقط تغيير حالة العقار");
    }

    let body: any;
    try { body = await c.req.json(); } catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const { availabilityStatus } = body;
    if (!["available", "sold"].includes(availabilityStatus)) {
      return errorRes(c, 400, "حالة توفر غير صالحة. القيم المقبولة: available أو sold");
    }

    const updated = {
      ...property,
      availabilityStatus,
      availabilityUpdatedAt: new Date().toISOString(),
    };
    await kv.set(propertyKey, updated);

    const msg = availabilityStatus === "sold"
      ? "تم تحديث حالة العقار إلى 'تم البيع'"
      : "تم تحديث حالة العقار إلى 'متاح'";

    return c.json({ success: true, data: { availabilityStatus }, message: msg });
  } catch (e: any) {
    console.error("POST /properties/:id/availability:", e.message);
    return errorRes(c, 500, "تعذّر تحديث حالة العقار");
  }
});

// ════════════════════════════════════════════
// Admin Routes
// ════════════════════════════════════════════

app.get(`${PREFIX}/admin/pending`, async (c) => {
  const { error } = await requireAdmin(c);
  if (error) return error;
  try {
    const pending = await kv.getByPrefix("pending_property_");
    pending.sort((a: any, b: any) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime());
    return c.json({ success: true, data: pending.map(refreshPropertyImages) });
  } catch (e: any) {
    console.error("GET /admin/pending:", e.message);
    return errorRes(c, 500, "تعذّر جلب الطلبات");
  }
});

app.get(`${PREFIX}/admin/properties`, async (c) => {
  const { error } = await requireAdmin(c);
  if (error) return error;
  try {
    const data = await kv.getByPrefix("property_");
    data.sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    return c.json({ success: true, data: data.map(refreshPropertyImages) });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر جلب العقارات");
  }
});

app.post(`${PREFIX}/admin/approve/:id`, async (c) => {
  const { user, error } = await requireAdmin(c);
  if (error) return error;
  try {
    const id = c.req.param("id");
    const pending: any = await kv.get("pending_property_" + id);
    if (!pending) return errorRes(c, 404, "الطلب غير موجود");
    const approved = { ...pending, status: "approved", approvedAt: new Date().toISOString() };
    await kv.set("property_" + id, approved);
    await kv.del("pending_property_" + id);
    await writeAdminLog({
      adminId: user.id, adminEmail: user.email, action: "approve",
      entityType: "property", entityId: id,
      details: { title: pending.title, governorate: pending.governorate, ownerName: pending.ownerName },
    });
    return c.json({ success: true, data: approved, message: "تمت الموافقة على العقار ونشره" });
  } catch (e: any) {
    console.error("POST /admin/approve/:id:", e.message);
    return errorRes(c, 500, "تعذّر الموافقة على العقار");
  }
});

app.post(`${PREFIX}/admin/reject/:id`, async (c) => {
  const { user, error } = await requireAdmin(c);
  if (error) return error;
  try {
    const id = c.req.param("id");
    let body: any = {};
    try { body = await c.req.json(); } catch { /* no body needed */ }
    const pending: any = await kv.get("pending_property_" + id);
    if (!pending) return errorRes(c, 404, "الطلب غير موجود");
    const rejected = {
      ...pending,
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      rejectionReason: sanitize(body.reason || "", 500),
    };
    await kv.set("rejected_property_" + id, rejected);
    await kv.del("pending_property_" + id);
    await writeAdminLog({
      adminId: user.id, adminEmail: user.email, action: "reject",
      entityType: "property", entityId: id,
      details: { title: pending.title, reason: rejected.rejectionReason, ownerName: pending.ownerName },
    });
    return c.json({ success: true, message: "تم رفض العقار" });
  } catch (e: any) {
    console.error("POST /admin/reject/:id:", e.message);
    return errorRes(c, 500, "تعذّر رفض العقار");
  }
});

app.delete(`${PREFIX}/admin/properties/:id`, async (c) => {
  const { user, error } = await requireAdmin(c);
  if (error) return error;
  try {
    const id = c.req.param("id");
    const prop: any = await kv.get("property_" + id);
    await kv.del("property_" + id);
    await writeAdminLog({
      adminId: user.id, adminEmail: user.email, action: "delete",
      entityType: "property", entityId: id,
      details: { title: prop?.title || "—", governorate: prop?.governorate || "—" },
    });
    return c.json({ success: true });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر حذف العقار");
  }
});

app.post(`${PREFIX}/admin/toggle-featured/:id`, async (c) => {
  const { error } = await requireAdmin(c);
  if (error) return error;
  try {
    const id = c.req.param("id");
    const property: any = await kv.get("property_" + id);
    if (!property) return errorRes(c, 404, "العقار غير موجود");
    const updated = { ...property, featured: !property.featured, updatedAt: new Date().toISOString() };
    await kv.set("property_" + id, updated);
    return c.json({ success: true, data: { featured: updated.featured }, message: updated.featured ? "تم تمييز العقار" : "تم إلغاء التمييز" });
  } catch (e: any) {
    console.error("POST /admin/toggle-featured/:id:", e.message);
    return errorRes(c, 500, "تعذّر تحديث التمييز");
  }
});

app.get(`${PREFIX}/admin/conversations`, async (c) => {
  const { error } = await requireAdmin(c);
  if (error) return error;
  try {
    const threads = await kv.getByPrefix("thread_");
    threads.sort((a: any, b: any) =>
      new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
    );
    const formatted = threads.map((t: any) => {
      const allMsgs: any[] = t.messages || [];
      // Return only the last 100 messages per thread to cap response size
      const recentMsgs = allMsgs.slice(-100);
      return {
        id: t.id,
        propertyId: t.propertyId,
        property_title: t.propertyTitle || "—",
        property_image: t.propertyImage ? refreshImageUrl(t.propertyImage) : "",
        sender_id: t.inquirerId,
        sender_name: t.inquirerName || "—",
        receiver_id: t.ownerId,
        receiver_name: t.ownerName || "—",
        messages: recentMsgs.map((m: any) => ({
          id: m.id,
          sender_id: m.senderId,
          sender_name: m.senderName || "—",
          text: m.text || "",
          type: m.fileUrl ? "file" : "text",
          image_url: m.fileUrl ? refreshImageUrl(m.fileUrl) : null,
          location: m.location || null,
          created_at: m.timestamp,
          edited_at: m.editedAt || null,
        })),
        last_updated: t.lastUpdated,
        message_count: allMsgs.length,
      };
    });
    return c.json({ success: true, data: formatted });
  } catch (e: any) {
    console.error("GET /admin/conversations:", e.message);
    return errorRes(c, 500, "تعذّر جلب المحادثات");
  }
});

app.delete(`${PREFIX}/admin/conversations/:threadId`, async (c) => {
  const { error } = await requireAdmin(c);
  if (error) return error;
  try {
    const threadId = c.req.param("threadId");
    await kv.del(threadId);
    return c.json({ success: true, message: "تم حذف المحادثة بالكامل" });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر حذف المحادثة");
  }
});

app.delete(`${PREFIX}/admin/messages/:messageId`, async (c) => {
  const { user, error } = await requireAdmin(c);
  if (error) return error;
  try {
    const messageId = c.req.param("messageId");
    const threads = await kv.getByPrefix("thread_");
    let found = false;
    for (const thread of threads) {
      const idx = (thread.messages || []).findIndex((m: any) => m.id === messageId);
      if (idx !== -1) {
        thread.messages.splice(idx, 1);
        thread.lastUpdated = new Date().toISOString();
        await kv.set(thread.id, thread);
        found = true;
        await writeAdminLog({
          adminId: user.id, adminEmail: user.email, action: "message_delete",
          entityType: "message", entityId: messageId,
          details: { threadId: thread.id },
        });
        break;
      }
    }
    if (!found) return errorRes(c, 404, "الرسالة غير موجودة");
    return c.json({ success: true });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر حذف الرسالة");
  }
});

app.post(`${PREFIX}/admin/messages/:messageId/edit`, async (c) => {
  const { user, error } = await requireAdmin(c);
  if (error) return error;
  try {
    const messageId = c.req.param("messageId");
    let body: any;
    try { body = await c.req.json(); } catch { return errorRes(c, 400, "بيانات غير صالحة"); }
    const newText = sanitize(body.text || "", 3000);
    const threads = await kv.getByPrefix("thread_");
    let found = false;
    for (const thread of threads) {
      const idx = (thread.messages || []).findIndex((m: any) => m.id === messageId);
      if (idx !== -1) {
        thread.messages[idx].text = newText;
        thread.messages[idx].editedAt = new Date().toISOString();
        thread.lastUpdated = new Date().toISOString();
        await kv.set(thread.id, thread);
        found = true;
        await writeAdminLog({
          adminId: user.id, adminEmail: user.email, action: "message_edit",
          entityType: "message", entityId: messageId,
          details: { threadId: thread.id },
        });
        break;
      }
    }
    if (!found) return errorRes(c, 404, "الرسالة غير موجودة");
    return c.json({ success: true });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر تعديل الرسالة");
  }
});

app.get(`${PREFIX}/admin/transactions`, async (c) => {
  const { error } = await requireAdmin(c);
  if (error) return error;
  try {
    const [threads, txStatuses] = await Promise.all([
      kv.getByPrefix("thread_"),
      kv.getByPrefix("tx_status_"),
    ]);
    const statusMap: Record<string, any> = {};
    for (const tx of txStatuses) {
      if (tx.threadId) statusMap[tx.threadId] = tx;
    }
    threads.sort((a: any, b: any) =>
      new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
    );
    const transactions = threads.map((t: any) => {
      const txStatus = statusMap[t.id] || {};
      return {
        id: t.id,
        propertyId: t.propertyId,
        propertyTitle: t.propertyTitle || "—",
        propertyImage: t.propertyImage ? refreshImageUrl(t.propertyImage) : "",
        buyerName: t.inquirerName || "—",
        buyerId: t.inquirerId,
        sellerName: t.ownerName || "—",
        sellerId: t.ownerId,
        messageCount: (t.messages || []).length,
        lastActivity: t.lastUpdated,
        status: txStatus.status || "pending",
        adminNote: txStatus.adminNote || "",
        updatedAt: txStatus.updatedAt || null,
      };
    });
    return c.json({ success: true, data: transactions });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر جلب عمليات البيع والشراء");
  }
});

app.post(`${PREFIX}/admin/transactions/:threadId/status`, async (c) => {
  const { error } = await requireAdmin(c);
  if (error) return error;
  try {
    const threadId = c.req.param("threadId");
    let body: any;
    try { body = await c.req.json(); } catch { return errorRes(c, 400, "بيانات غير صالحة"); }
    const { status, adminNote } = body;
    const validStatuses = ["pending", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) return errorRes(c, 400, "حالة غير صالحة");
    await kv.set(`tx_status_${threadId}`, {
      threadId, status,
      adminNote: sanitize(adminNote || "", 500),
      updatedAt: new Date().toISOString(),
    });
    return c.json({ success: true, data: { status, adminNote } });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر تحديث حالة العملية");
  }
});

// ════════════════════════════════════════════
// Reports (User Submit + Admin Manage)
// ════════════════════════════════════════════

// User: Submit a report on a property
app.post(`${PREFIX}/reports`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const allowed = await checkRateLimit("report_" + user.id, 10, 60 * 60 * 1000);
    if (!allowed) return errorRes(c, 429, "تم تجاوز الحد المس��وح به لإرسال البلاغات");

    let body: any;
    try { body = await c.req.json(); } catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const { propertyId, reason, description } = body;
    if (!propertyId) return errorRes(c, 400, "معرّف العقار مطلوب");
    if (!reason) return errorRes(c, 400, "سبب البلاغ مطلوب");

    // Fetch property info for the report snapshot
    let propertySnap: any = null;
    try {
      const prop = await kv.get("property_" + propertyId);
      if (prop) {
        propertySnap = {
          title: prop.title || "—",
          governorate: prop.governorate || "—",
          ownerName: prop.ownerName || "—",
        };
      }
    } catch { /* optional */ }

    const id = "report_" + crypto.randomUUID();
    const report = {
      id,
      propertyId: sanitize(propertyId, 100),
      reason: sanitize(reason, 200),
      description: sanitize(description || "", 1000),
      reporter_id: user.id,
      reporter_name: sanitizeName(user.user_metadata?.name || user.email?.split("@")[0] || "مجهول"),
      status: "pending",
      created_at: new Date().toISOString(),
      property: propertySnap,
      admin_action: null,
      admin_notes: null,
      reviewed_at: null,
    };

    await kv.set(id, report);
    return c.json({ success: true, data: { id }, message: "تم إرسال البلاغ وسيتم مراجعته من قبل الإدارة" });
  } catch (e: any) {
    console.error("POST /reports:", e.message);
    return errorRes(c, 500, "تعذّر إرسال البلاغ");
  }
});

// Admin: Get all reports
app.get(`${PREFIX}/admin/reports`, async (c) => {
  const { error } = await requireAdmin(c);
  if (error) return error;
  try {
    const reports = await kv.getByPrefix("report_");
    reports.sort((a: any, b: any) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    return c.json({ success: true, data: reports });
  } catch (e: any) {
    console.error("GET /admin/reports:", e.message);
    return errorRes(c, 500, "تعذّر جلب البلاغات");
  }
});

// Admin: Take action on a report
app.post(`${PREFIX}/admin/reports/:reportId/action`, async (c) => {
  const { user, error } = await requireAdmin(c);
  if (error) return error;
  try {
    const reportId = c.req.param("reportId");
    let body: any;
    try { body = await c.req.json(); } catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const { action, notes } = body;
    const validActions = ["delete_property", "hide_property", "warn_user", "dismiss"];
    if (!validActions.includes(action)) return errorRes(c, 400, "إجراء غير صالح");

    const fullKey = reportId.startsWith("report_") ? reportId : "report_" + reportId;
    const report: any = await kv.get(fullKey);
    if (!report) return errorRes(c, 404, "البلاغ غير موجود");

    // Apply side effects
    if (action === "delete_property" && report.propertyId) {
      try {
        await kv.del("property_" + report.propertyId);
        console.log("Deleted property via report action:", report.propertyId);
      } catch (de: any) { console.error("delete_property error:", de.message); }
    }

    if (action === "hide_property" && report.propertyId) {
      try {
        const prop: any = await kv.get("property_" + report.propertyId);
        if (prop) {
          await kv.set("property_" + report.propertyId, {
            ...prop,
            status: "hidden",
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (he: any) { console.error("hide_property error:", he.message); }
    }

    const updated = {
      ...report,
      status: action === "dismiss" ? "dismissed" : "action_taken",
      admin_action: action,
      admin_notes: sanitize(notes || "", 500),
      reviewed_at: new Date().toISOString(),
    };

    await kv.set(fullKey, updated);
    await writeAdminLog({
      adminId: user.id, adminEmail: user.email, action: "report_action",
      entityType: "report", entityId: fullKey,
      details: { action, notes: updated.admin_notes, propertyId: report.propertyId },
    });
    return c.json({ success: true, data: updated, message: "تم تنفيذ الإجراء بنجاح" });
  } catch (e: any) {
    console.error("POST /admin/reports/:reportId/action:", e.message);
    return errorRes(c, 500, "تعذّر تنفيذ الإجراء");
  }
});

// ════════════════════════════════════════════
// Favorites
// ════════════════════════════════════════════

app.get(`${PREFIX}/favorites`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);
    const favs = (await kv.get("favorites_" + user.id)) || [];
    return c.json({ success: true, data: favs });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر جلب المفضلة");
  }
});

app.post(`${PREFIX}/favorites`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);
    let body: any;
    try { body = await c.req.json(); } catch { return errorRes(c, 400, "بيانات غير صالحة"); }
    const { propertyId } = body;
    if (!propertyId) return errorRes(c, 400, "معرّف العقار مطلوب");
    const key = "favorites_" + user.id;
    const favs: string[] = (await kv.get(key)) || [];
    if (!favs.includes(propertyId)) await kv.set(key, [...favs, propertyId]);
    return c.json({ success: true, data: [...new Set([...favs, propertyId])] });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر تحديث المفضلة");
  }
});

app.delete(`${PREFIX}/favorites`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);
    let body: any;
    try { body = await c.req.json(); } catch { return errorRes(c, 400, "بيانات غير صالحة"); }
    const { propertyId } = body;
    if (!propertyId) return errorRes(c, 400, "معرّف العقار مطلوب");
    const key = "favorites_" + user.id;
    const favs: string[] = (await kv.get(key)) || [];
    const updated = favs.filter((id) => id !== propertyId);
    await kv.set(key, updated);
    return c.json({ success: true, data: updated });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر تحديث المفضلة");
  }
});

// ════════════════════════════════════════════
// Likes (إعجابات العقارات)
// ════════════════════════════════════════════

// GET likes info for a property (public — no auth needed)
app.get(`${PREFIX}/properties/:id/likes`, async (c) => {
  try {
    const id = c.req.param("id");
    const token = extractUserToken(c);
    let userId: string | null = null;
    if (token) {
      try {
        const { user } = await getSupabaseUser(token);
        if (user?.id) userId = user.id;
      } catch { /* ignore auth errors for public read */ }
    }
    const likesData: any = (await kv.get("likes_" + id)) || { count: 0, userIds: [] };
    const isLiked = userId ? (likesData.userIds || []).includes(userId) : false;
    return c.json({ success: true, data: { count: likesData.count || 0, isLiked } });
  } catch (e: any) {
    console.error("GET /properties/:id/likes:", e.message);
    return errorRes(c, 500, "تعذّر جلب الإعجابات");
  }
});

// POST toggle like (requires auth)
app.post(`${PREFIX}/properties/:id/like`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "يجب تسجيل الدخول للإعجاب بعقار");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const id = c.req.param("id");
    const allowed = await checkRateLimit("like_" + user.id, 60, 60 * 1000);
    if (!allowed) return errorRes(c, 429, "تم تجاوز الحد المسموح به للإعجابات");

    const likesKey = "likes_" + id;
    const likesData: any = (await kv.get(likesKey)) || { count: 0, userIds: [] };
    const userIds: string[] = likesData.userIds || [];
    const alreadyLiked = userIds.includes(user.id);

    const newUserIds = alreadyLiked
      ? userIds.filter((uid: string) => uid !== user.id)
      : [...userIds, user.id];
    const newCount = alreadyLiked
      ? Math.max(0, (likesData.count || 0) - 1)
      : (likesData.count || 0) + 1;

    await kv.set(likesKey, { count: newCount, userIds: newUserIds });

    // Update property's likesCount field for efficient display in lists
    const property: any = await kv.get("property_" + id);
    if (property) {
      await kv.set("property_" + id, { ...property, likesCount: newCount });
    }

    return c.json({
      success: true,
      data: { count: newCount, isLiked: !alreadyLiked, action: alreadyLiked ? "unliked" : "liked" },
      message: alreadyLiked ? "تم إلغاء الإعجاب" : "تم تسجيل إعجابك بالعقار",
    });
  } catch (e: any) {
    console.error("POST /properties/:id/like:", e.message);
    return errorRes(c, 500, "تعذّر تسجيل الإعجاب");
  }
});

// ════════════════════════════════════════════
// Upload
// ════════════════════════════════════════════

app.post(`${PREFIX}/upload`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const allowed = await checkRateLimit("upload_" + user.id, 20, 60 * 1000);
    if (!allowed) return errorRes(c, 429, "تم تجاوز عدد التحميلات المسموحة");

    let body: any;
    try { body = await c.req.json(); } catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const { fileData, mimeType, fileName } = body;
    if (!fileData || !mimeType) return errorRes(c, 400, "بيانات الملف مطلوبة");

    const fileCheck = validateFile(mimeType, fileData, fileName);
    if (!fileCheck.valid) return errorRes(c, 400, fileCheck.error);

    const supabase = getServiceClient();
    const path = await uploadBase64ToStorage(supabase, fileData, mimeType, fileName || "file");
    if (!path) return errorRes(c, 500, "تعذّر رفع الملف");

    const publicUrl = getPublicUrl(path);
    const signedUrl = await getSignedUrl(supabase, path);
    return c.json({ success: true, data: { path, publicUrl, signedUrl: publicUrl || signedUrl } });
  } catch (e: any) {
    console.error("POST /upload:", e.message);
    return errorRes(c, 500, "تعذّر رفع الملف");
  }
});

// ════════════════════════════════════════════
// Messages
// ════════════════════════════════════════════

app.get(`${PREFIX}/messages`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);
    // Use DB-level JSONB filter — avoids loading every thread in the system
    const mine = await kv.getThreadsByUser(user.id);
    mine.sort((a: any, b: any) =>
      new Date(b.lastUpdated ?? 0).getTime() - new Date(a.lastUpdated ?? 0).getTime()
    );
    return c.json({ success: true, data: mine });
  } catch (e: any) {
    console.error("GET /messages:", e.message);
    return errorRes(c, 500, "تعذّر جلب الرسائل");
  }
});

app.get(`${PREFIX}/messages/:threadId`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);
    const threadId = c.req.param("threadId");
    const thread = await kv.get(threadId);
    if (!thread) return errorRes(c, 404, "المحادثة غير موجودة");
    if (thread.ownerId !== user.id && thread.inquirerId !== user.id) return errorRes(c, 403, "غير مسموح");
    return c.json({ success: true, data: thread });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر جلب المحادثة");
  }
});

app.post(`${PREFIX}/messages`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const allowed = await checkRateLimit("msg_" + user.id, 60, 60 * 1000);
    if (!allowed) return errorRes(c, 429, "تم تجاوز حد إرسال الرسائل");

    let body: any;
    try { body = await c.req.json(); } catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const { propertyId, ownerId, fileUrl, fileType, fileName } = body;
    const inquirerId: string = body.inquirerId || user.id;
    const text: string = sanitize(body.text || body.content, 3000);

    if (!propertyId) return errorRes(c, 400, "معرّف العقار مطلوب");
    if (!ownerId) return errorRes(c, 400, "معرّف المالك مطلوب");
    if (!text && !fileUrl) return errorRes(c, 400, "يجب إرسال نص أو ملف");

    let storedFileRef: string | null = null;
    if (fileUrl && typeof fileUrl === "string" && fileUrl.startsWith("data:")) {
      const supabase = getServiceClient();
      storedFileRef = await uploadBase64ToStorage(supabase, fileUrl, fileType || "application/octet-stream", fileName || "file");
    } else if (fileUrl) {
      storedFileRef = fileUrl;
    }

    const threadId = "thread_" + propertyId + "_" + inquirerId;
    let thread: any = await kv.get(threadId);
    if (!thread) {
      const prop: any = await kv.get("property_" + propertyId);
      thread = {
        id: threadId, propertyId,
        propertyTitle: prop?.title || "عقار",
        propertyImage: prop?.image || "",
        inquirerId: user.id,
        inquirerName: sanitizeName(user.user_metadata?.name || user.email?.split("@")[0] || "مستفسر"),
        ownerId,
        ownerName: sanitizeName(prop?.ownerName || "مالك العقار"),
        messages: [],
      };
    }

    thread.messages.push({
      id: crypto.randomUUID(),
      senderId: user.id,
      senderName: sanitizeName(user.user_metadata?.name || user.email?.split("@")[0] || "مستخدم"),
      senderRole: user.id === inquirerId ? "inquirer" : "owner",
      text, fileUrl: storedFileRef, fileType: fileType || null, fileName: fileName || null,
      location: body.location
        ? { lat: Number(body.location.lat), lng: Number(body.location.lng), label: sanitize(body.location.label || "", 100) }
        : null,
      isRead: false, timestamp: new Date().toISOString(),
    });
    thread.lastUpdated = new Date().toISOString();
    await kv.set(threadId, thread);
    return c.json({ success: true, data: { threadId, lastUpdated: thread.lastUpdated } });
  } catch (e: any) {
    console.error("POST /messages:", e.message);
    return errorRes(c, 500, "تعذّر إرسال الرسالة");
  }
});

app.post(`${PREFIX}/messages/:threadId/mark-read`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);
    const threadId = c.req.param("threadId");
    const thread = await kv.get(threadId);
    if (!thread) return errorRes(c, 404, "المحادثة غير موجودة");
    if (thread.ownerId !== user.id && thread.inquirerId !== user.id) return errorRes(c, 403, "غير مسموح");
    thread.messages = thread.messages.map((m: any) => ({ ...m, isRead: true }));
    await kv.set(threadId, thread);
    return c.json({ success: true });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر تحديث حالة القراءة");
  }
});

app.delete(`${PREFIX}/messages/:threadId/:messageId`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const threadId = c.req.param("threadId");
    const messageId = c.req.param("messageId");
    const thread = await kv.get(threadId);
    if (!thread) return errorRes(c, 404, "المحادثة غير موجودة");
    if (thread.ownerId !== user.id && thread.inquirerId !== user.id)
      return errorRes(c, 403, "غير مسموح");

    const msgIndex = (thread.messages || []).findIndex((m: any) => m.id === messageId);
    if (msgIndex === -1) return errorRes(c, 404, "الرسالة غير موجودة");

    const msg = thread.messages[msgIndex];
    if (msg.senderId !== user.id) return errorRes(c, 403, "لا يمكنك حذف رسالة شخص آخر");

    const ageMs = Date.now() - new Date(msg.timestamp).getTime();
    if (ageMs > 10 * 60 * 1000) return errorRes(c, 400, "انتهت مهلة الحذف (10 دقائق)");

    thread.messages.splice(msgIndex, 1);
    thread.lastUpdated = new Date().toISOString();
    await kv.set(threadId, thread);
    return c.json({ success: true });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر حذف الرسالة");
  }
});

app.post(`${PREFIX}/track-whatsapp`, async (c) => {
  try {
    const token = extractUserToken(c);
    let userId: string | null = null;
    if (token) {
      const { user } = await getSupabaseUser(token);
      userId = user?.id ?? null;
    }
    let body: any;
    try { body = await c.req.json(); } catch { return errorRes(c, 400, "بيانات غير صالحة"); }
    const { propertyId, ownerPhone } = body;
    if (!propertyId || !ownerPhone) return errorRes(c, 400, "البيانات مطلوبة");
    await kv.set(`whatsapp_${sanitize(propertyId, 100)}_${Date.now()}`, {
      propertyId: sanitize(propertyId, 100), userId,
      ownerPhone: sanitize(ownerPhone, 20), clickedAt: new Date().toISOString(),
    });
    return c.json({ success: true });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر تسجيل النقر");
  }
});

// ════════════════════════════════════════════
// Chatbot — Smart Local Knowledge Base
// ════════════════════════════════════════════

function detectIntent(text: string): string {
  const t = text.toLowerCase();
  if (/سعر|أسعار|تكلفة|كم|غالي|رخيص|ميزانية|price|cost|budget|cheap|expensive/.test(t)) return "price";
  if (/منطقة|حي|مناطق|أحياء|وين|فين|area|neighborhood|district/.test(t)) return "areas";
  if (/مميزات|إيجابيات|فوائد|pros|advantage|benefit/.test(t)) return "pros";
  if (/عيوب|سلبيات|مشكلة|مشاكل|cons|disadvantage|problem/.test(t)) return "cons";
  if (/يناسب|مناسب|لمن|أفضل لـ|best for|suitable|who/.test(t)) return "best_for";
  if (/مكان|معالم|سياح|أثري|زيارة|مشهور|place|famous|tourist|attraction/.test(t)) return "famous";
  if (/استثمار|مستقبل|invest|investment|future|growth/.test(t)) return "invest";
  if (/شقة|فيلا|بيت|أرض|إيجار|للبيع|للإيجار|عقار|apartment|villa|house|land|rent|buy|sale/.test(t)) return "property";
  if (/مرحبا|أهلا|هلا|السلام|صباح|مساء|\bhi\b|hello|hey/.test(t)) return "greeting";
  return "general";
}

type GovInfo = { ar: string; en: string; keysAr: string[]; keysEn: string[]; areas: string[]; priceAr: string; priceEn: string; prosAr: string[]; prosEn: string[]; consAr: string[]; consEn: string[]; bestAr: string[]; bestEn: string[]; famousAr: string[]; famousEn: string[]; descAr: string; descEn: string; locAr: string; locEn: string; };

const GOVS: GovInfo[] = [
  { ar:"عمّان", en:"Amman", keysAr:["عمان","عمّان","العاصمة","امان"], keysEn:["amman","capital"], descAr:"العاصمة والمدينة الأكبر في الأردن، مركز الأعمال والثقافة", descEn:"Jordan's capital — center of business, culture, and entertainment", locAr:"وسط غرب الأردن", locEn:"Central-west Jordan", areas:["الدوار السابع","الجبيهة","تلاع العلي","الرابية","عبدون","الصويفية","خلدا","شميساني"], priceAr:"📊 شقق: 80,000–350,000 د.أ | فلل: 200,000–1,500,000 د.أ | أراضي: 200–2,000 د.أ/م²", priceEn:"📊 Apts: JOD 80,000–350,000 | Villas: JOD 200,000–1,500,000 | Land: JOD 200–2,000/m²", prosAr:["مركز الأعمال الرئيسي","بنية تحتية متطورة","خدمات تعليمية وصحية ممتازة","مطار دولي قريب"], prosEn:["Main business hub","Advanced infrastructure","Excellent education & healthcare","Near international airport"], consAr:["أسعار مرتفعة جداً","ازدحام مروري شديد","تكلفة معيشة عالية"], consEn:["Very high prices","Heavy traffic","High cost of living"], bestAr:["العائلات","المهنيين ورجال الأعمال","الطلاب الجامعيين"], bestEn:["Families","Professionals & business people","University students"], famousAr:["قلعة عمّان","المدرج الروماني","شارع الرينبو","البلد القديم"], famousEn:["Amman Citadel","Roman Theatre","Rainbow Street","Downtown"] },
  { ar:"الزرقاء", en:"Zarqa", keysAr:["الزرقاء","زرقاء"], keysEn:["zarqa"], descAr:"المدينة الصناعية الثانية في الأردن", descEn:"Jordan's second industrial city", locAr:"شمال شرق عمّان", locEn:"Northeast of Amman", areas:["الزرقاء الجديدة","الرصيفة","الهاشمية","ماركا","الضليل"], priceAr:"📊 شقق: 35,000–120,000 د.أ | منازل: 80,000–300,000 د.أ | أراضي: 80–500 د.أ/م²", priceEn:"📊 Apts: JOD 35,000–120,000 | Houses: JOD 80,000–300,000 | Land: JOD 80–500/m²", prosAr:["أسعار معقولة","قرب من عمّان","فرص العمل الصناعي"], prosEn:["Affordable prices","Close to Amman","Industrial job opportunities"], consAr:["تلوث صناعي","ازدحام مروري"], consEn:["Industrial pollution","Traffic congestion"], bestAr:["العمال والموظفين","العائلات محدودة الدخل"], bestEn:["Workers & employees","Middle/lower income families"], famousAr:["المدينة الصناعية الأولى","مدينة الحسين الرياضية"], famousEn:["First Industrial City","Hussein Sports City"] },
  { ar:"إربد", en:"Irbid", keysAr:["إربد","اربد","عروس الشمال"], keysEn:["irbid"], descAr:"عروس الشمال الأردني، مدينة جامعية بامتياز", descEn:"Bride of the north — a vibrant university city", locAr:"شمال الأردن", locEn:"Northern Jordan", areas:["وسط المدينة","الحواضر","الحصن","الرمثا","كفر أسد"], priceAr:"📊 شقق: 40,000–150,000 د.أ | منازل: 100,000–400,000 د.أ | أراضي: 100–600 د.أ/م²", priceEn:"📊 Apts: JOD 40,000–150,000 | Houses: JOD 100,000–400,000 | Land: JOD 100–600/m²", prosAr:["أسعار معقولة","مناخ معتدل","حيوية جامعية"], prosEn:["Affordable","Mild climate","University atmosphere"], consAr:["فرص عمل محدودة خارج التعليم","بعد عن العاصمة"], consEn:["Limited non-education jobs","Far from Amman"], bestAr:["الطلاب الجامعيين","العائلات ذات الدخل المتوسط"], bestEn:["University students","Middle-income families"], famousAr:["جامعة اليرموك","تل إربد الأثري","متحف إربد"], famousEn:["Yarmouk University","Tell Irbid","Irbid Museum"] },
  { ar:"العقبة", en:"Aqaba", keysAr:["العقبة","عقبة","البحر الأحمر"], keysEn:["aqaba","red sea"], descAr:"المنفذ البحري الوحيد للأردن على البحر الأحمر", descEn:"Jordan's only Red Sea outlet — tourism and investment city", locAr:"أقصى جنوب ا��أردن", locEn:"Southernmost Jordan", areas:["وسط ا��عقبة","الشاطئ الشمالي","العقبة الجديدة","المرسى الملكي"], priceAr:"📊 شقق: 60,000–250,000 د.أ | فلل: 200,000–1,000,000 د.أ | أراضي: 150–1,500 د.أ/م²", priceEn:"📊 Apts: JOD 60,000–250,000 | Villas: JOD 200,000–1,000,000 | Land: JOD 150–1,500/m²", prosAr:["موقع سياحي على البحر","منطقة اقتصادية خاصة","نمو عقاري متسارع"], prosEn:["Red Sea location","Special Economic Zone","Fast-growing real estate"], consAr:["حرارة شديدة في الصيف","بعد عن العاصمة (320 كم)"], consEn:["Extreme heat in summer","Far from Amman (320 km)"], bestAr:["المستثمرين السياحيين","محبي البحر"], bestEn:["Tourism investors","Sea lovers"], famousAr:["قلعة العقبة","الشعاب المرجانية","وادي رم"], famousEn:["Aqaba Castle","Coral reefs","Wadi Rum"] },
  { ar:"المفرق", en:"Mafraq", keysAr:["المفرق","مفرق"], keysEn:["mafraq"], descAr:"بوابة الأردن الشمالية الشرقية، أرض فسيحة وأسعار منخفضة", descEn:"Jordan's northeastern gateway — spacious land and affordable prices", locAr:"شمال شرق الأردن", locEn:"Northeastern Jordan", areas:["المفرق المدينة","حوشان","الخالدي��","الرويشد"], priceAr:"📊 شقق: 25,000–80,000 د.أ | منازل: 50,000–180,000 د.أ | أراضي: 20–150 د.أ/م²", priceEn:"📊 Apts: JOD 25,000–80,000 | Houses: JOD 50,000–180,000 | Land: JOD 20–150/m²", prosAr:["أ��عار منخفضة جداً","مساحات أرض واسعة","هدوء"], prosEn:["Very low prices","Spacious land","Peace & nature"], consAr:["بعد عن الخدمات","فرص عمل محدودة"], consEn:["Far from services","Limited jobs"], bestAr:["الباحثين عن أسعار منخفضة","أصحاب المزارع"], bestEn:["Low price seekers","Farm owners"], famousAr:["قصر البنت الأثري","محمية الشومري","جامعة آل البيت"], famousEn:["Qasr al-Bint","Shaumari Reserve","Al al-Bayt University"] },
  { ar:"البلقاء", en:"Balqa", keysAr:["البلقاء","بلقاء","السلط","الفحيص"], keysEn:["balqa","salt","fuheis"], descAr:"محافظة تاريخية قريبة من عمّان تجمع بين الريف وقرب الخدمات", descEn:"Historic governorate near Amman combining rural charm with service access", locAr:"غرب وسط الأردن", locEn:"West-central Jordan", areas:["السلط","ماحص","عين الباشا","الفحيص","وادي السير"], priceAr:"📊 شقق: 45,000–180,000 د.أ | منازل: 120,000–500,000 د.أ | أراضي: 100–800 د.أ/م²", priceEn:"📊 Apts: JOD 45,000–180,000 | Houses: JOD 120,000–500,000 | Land: JOD 100–800/m²", prosAr:["قرب من عمّان","طبيعة جميلة","أسعار أقل من عمّان"], prosEn:["Close to Amman","Beautiful nature","Lower prices than Amman"], consAr:["محدودية بعض الخدمات","طرق جبلية"], consEn:["Some limited services","Mountain roads"], bestAr:["العائلات الباحثة عن هدوء","المتقاعدين"], bestEn:["Families wanting calm","Retirees"], famousAr:["السلط التاريخية (يونيسكو)","الفحيص"], famousEn:["Historic Salt (UNESCO)","Fuheis"] },
  { ar:"الكرك", en:"Karak", keysAr:["الكرك","كرك"], keysEn:["karak"], descAr:"مشهورة بقلعتها الصليبية التاريخية الشامخة", descEn:"Southwest Jordan, famous for its historic Crusader castle", locAr:"جنوب غرب الأردن", locEn:"Southwest Jordan", areas:["الكرك المدينة","المزار الجنوبي","فقوع","ذيبان"], priceAr:"📊 شقق: 25,000–90,000 د.أ | منازل: 60,000–200,000 د.أ | أراضي: 40–250 د.أ/م²", priceEn:"📊 Apts: JOD 25,000–90,000 | Houses: JOD 60,000–200,000 | Land: JOD 40–250/m²", prosAr:["أسعار منخفضة","تاريخ عريق","مناخ معتدل"], prosEn:["Low prices","Rich history","Moderate climate"], consAr:["بعد عن العاصمة (120 كم)","فرص عمل محدودة"], consEn:["Far from Amman (120 km)","Limited jobs"], bestAr:["المتقاعدين","محبي التاريخ"], bestEn:["Retirees","History lovers"], famousAr:["قلعة الكرك","وادي الموجب"], famousEn:["Karak Castle","Wadi Mujib"] },
  { ar:"مأدبا", en:"Madaba", keysAr:["مأدبا","مادبا"], keysEn:["madaba"], descAr:"مدينة الفسيفساء والتاريخ، قريبة من عمّان والمطار الدولي", descEn:"City of mosaics and history, close to Amman and the airport", locAr:"جنوب غرب عمّان", locEn:"Southwest of Amman", areas:["مأدبا المدينة","ذيبان","الحمّام","معين"], priceAr:"📊 شقق: 35,000–120,000 د.أ | منازل: 80,000–300,000 د.أ | أراضي: 80–400 د.أ/م²", priceEn:"📊 Apts: JOD 35,000–120,000 | Houses: JOD 80,000–300,000 | Land: JOD 80–400/m²", prosAr:["قرب من عمّان والمطار","سياحة دينية وتاريخية","أسعار معقولة"], prosEn:["Close to Amman & airport","Religious & historic tourism","Affordable"], consAr:["فرص عمل محدودة خارج السياحة"], consEn:["Limited non-tourism jobs"], bestAr:["محبي التاريخ","المستثمرين السياحيين"], bestEn:["History lovers","Tourism investors"], famousAr:["كنيسة الفسيفساء البيزنطية","جبل نيبو","حمامات ماعين"], famousEn:["Byzantine Mosaic Church","Mount Nebo","Ma'in Hot Springs"] },
  { ar:"جرش", en:"Jerash", keysAr:["جرش"], keysEn:["jerash"], descAr:"مدينة الأعمدة المئة — إحدى أجمل المدن الرومانية المحفوظة", descEn:"City of Columns — one of the world's best-preserved Roman cities", locAr:"شمال الأردن", locEn:"Northern Jordan", areas:["جرش المدينة","سوف","برما","الكتة"], priceAr:"📊 شقق: 30,000–100,000 د.أ | منازل: 70,000–250,000 د.أ | أراضي: 50–300 د.أ/م²", priceEn:"📊 Apts: JOD 30,000–100,000 | Houses: JOD 70,000–250,000 | Land: JOD 50–300/m²", prosAr:["تراث سياحي عالمي","مناخ معتدل","أسعار معقولة"], prosEn:["World-class heritage","Mild climate","Affordable"], consAr:["فرص عمل محدودة","بعد نسبي عن عمّان"], consEn:["Limited jobs","Somewhat far from Amman"], bestAr:["محبي التاريخ","المستثمرين السياحيين"], bestEn:["History lovers","Tourism investors"], famousAr:["مدينة جرش الرومانية","قوس هادريان","مهرجان جرش"], famousEn:["Roman ruins of Jerash","Hadrian's Arch","Jerash Festival"] },
  { ar:"عجلون", en:"Ajloun", keysAr:["عجلون"], keysEn:["ajloun"], descAr:"محافظة الغابات والهواء النقي في شمال الأردن", descEn:"Forests & fresh air governorate of northern Jordan", locAr:"شمال غرب الأردن", locEn:"Northwest Jordan", areas:["عجلون المدينة","عنجرة","كفرنجة","عرجان"], priceAr:"📊 شقق: 28,000–95,000 د.أ | منازل: 65,000–220,000 د.أ | أراضي: 40–250 د.أ/م²", priceEn:"📊 Apts: JOD 28,000–95,000 | Houses: JOD 65,000–220,000 | Land: JOD 40–250/m²", prosAr:["غابات وطبيعة خلابة","هواء نقي","أسعار منخفضة"], prosEn:["Lush forests","Clean air","Low prices"], consAr:["فرص عمل نادرة","طرق جبلية"], consEn:["Rare jobs","Mountain roads"], bestAr:["محبي الطبيعة","المتقاعدين"], bestEn:["Nature lovers","Retirees"], famousAr:["قلعة عجلون الإسلامية","محمية عجلون","غابات السنديان"], famousEn:["Ajloun Islamic Castle","Ajloun Reserve","Oak forests"] },
  { ar:"معان", en:"Ma'an", keysAr:["معان","مَعان"], keysEn:["maan","ma'an"], descAr:"البوابة الجنوبية للأردن — مفتاح البتراء ووادي رم", descEn:"Jordan's southern gateway — key to Petra and Wadi Rum", locAr:"جنوب الأردن", locEn:"Southern Jordan", areas:["معان المدينة","الشوبك","وادي موسى","البتراء","القويرة"], priceAr:"📊 شقق: 20,000–70,000 د.أ | منازل: 50,000–150,000 د.أ | أراضي: 15–120 د.أ/م²", priceEn:"📊 Apts: JOD 20,000–70,000 | Houses: JOD 50,000–150,000 | Land: JOD 15–120/m²", prosAr:["أسعار منخفضة جداً","قرب من البتراء ووادي رم","إمكانات سياحية ضخمة"], prosEn:["Very low prices","Close to Petra & Wadi Rum","Huge tourism potential"], consAr:["بعد عن العاصمة (220 كم)","خدمات محدودة"], consEn:["Very far from Amman","Limited services"], bestAr:["العاملين في السياحة","المستثمرين البيئيين"], bestEn:["Tourism workers","Eco-tourism investors"], famousAr:["البتراء (عجبة الدنيا)","قلعة الشوبك","وادي رم"], famousEn:["Petra (7th Wonder)","Shobak Castle","Wadi Rum"] },
  { ar:"الطفيلة", en:"Tafilah", keysAr:["الطفيلة","طفيلة","الطفيله"], keysEn:["tafilah","tafileh"], descAr:"محافظة الجنوب الجبلي — ��قل الأسعار في الأردن", descEn:"Mountain south — Jordan's lowest prices", locAr:"جنوب غرب الأردن", locEn:"Southwest Jordan", areas:["الطفيلة المدينة","بصيرا","العين","الحسا"], priceAr:"📊 شقق: 18,000–65,000 د.أ | منازل: 45,000–130,000 د.أ | أراضي: 12–100 د.أ/م²", priceEn:"📊 Apts: JOD 18,000–65,000 | Houses: JOD 45,000–130,000 | Land: JOD 12–100/m²", prosAr:["أقل الأسعار في الأردن","طبيعة جبلية رائعة","هواء نقي"], prosEn:["Lowest prices in Jordan","Wonderful mountain scenery","Clean air"], consAr:["بعد عن العاصمة","فرص عمل شحيحة"], consEn:["Far from Amman","Scarce jobs"], bestAr:["المتقاعدين","محبي الطبيعة الجبلية"], bestEn:["Retirees","Mountain nature lovers"], famousAr:["محمية ضانا الطبيعية","وادي الحسا","الغابات الصنوبرية"], famousEn:["Dana Nature Reserve","Wadi Hasa","Pine forests"] },
];

function detectGov(text: string): GovInfo | null {
  const norm = (s: string) => s.toLowerCase().replace(/[أإآا]/g,"ا").replace(/[ةه]/g,"ه").replace(/ى/g,"ي");
  const t = norm(text);
  for (const g of GOVS) {
    if (t.includes(norm(g.ar))) return g;
    if (g.keysAr.some((k) => t.includes(norm(k)))) return g;
    if (g.keysEn.some((k) => t.includes(k.toLowerCase()))) return g;
  }
  return null;
}

function buildGovReply(g: GovInfo, intent: string, ar: boolean): string {
  if (intent === "price")
    return ar ? `💰 أسعار العقارات في ${g.ar}:\n\n${g.priceAr}\n\n📍 أبرز المناطق: ${g.areas.slice(0,4).join("، ")}\n\n💬 هل تريد مقارنتها بمحافظة أخرى؟`
              : `💰 Property prices in ${g.en}:\n\n${g.priceEn}\n\n📍 Popular areas: ${g.areas.slice(0,4).join(", ")}\n\n💬 Want to compare with another governorate?`;
  if (intent === "areas")
    return ar ? `📍 أبرز مناطق ${g.ar}:\n\n${g.areas.map((a,i)=>`${i+1}. ${a}`).join("\n")}\n\n💡 هل تريد معرفة الأسعار؟`
              : `📍 Popular areas in ${g.en}:\n\n${g.areas.map((a,i)=>`${i+1}. ${a}`).join("\n")}\n\n💡 Want to know prices?`;
  if (intent === "pros")
    return ar ? `✅ مميزات ${g.ar}:\n\n${g.prosAr.map(p=>`✔️ ${p}`).join("\n")}\n\n💡 هل تريد معرفة العيوب أيضاً؟`
              : `✅ Advantages of ${g.en}:\n\n${g.prosEn.map(p=>`✔️ ${p}`).join("\n")}\n\n💡 Want to know the cons too?`;
  if (intent === "cons")
    return ar ? `⚠️ عيوب ${g.ar}:\n\n${g.consAr.map(c=>`❗ ${c}`).join("\n")}\n\n💡 هل تريد أيضاً معرفة المميزات؟`
              : `⚠️ Disadvantages of ${g.en}:\n\n${g.consEn.map(c=>`❗ ${c}`).join("\n")}\n\n💡 Want to see the pros too?`;
  if (intent === "best_for")
    return ar ? `👥 ${g.ar} تناسب:\n\n${g.bestAr.map(b=>`👉 ${b}`).join("\n")}\n\n💡 هل تريد معرفة الأسعار؟`
              : `👥 ${g.en} is best for:\n\n${g.bestEn.map(b=>`👉 ${b}`).join("\n")}\n\n💡 Want to know prices?`;
  if (intent === "famous")
    return ar ? `🏛️ أبرز معالم ${g.ar}:\n\n${g.famousAr.map(f=>`📌 ${f}`).join("\n")}\n\n💡 هل تريد معرفة المناطق السكنية؟`
              : `🏛️ Famous places in ${g.en}:\n\n${g.famousEn.map(f=>`📌 ${f}`).join("\n")}\n\n💡 Want to know residential areas?`;
  return ar
    ? `🏘️ نظرة على ${g.ar}:\n\n📝 ${g.descAr}\n📍 الموقع: ${g.locAr}\n\n${g.priceAr}\n\n✅ أبرز المميزات:\n${g.prosAr.slice(0,3).map(p=>`• ${p}`).join("\n")}\n\n📍 أبرز المناطق: ${g.areas.slice(0,4).join("، ")}\n\n💬 اسألني عن الأسعار أو المميزات أو المعالم!`
    : `🏘️ Overview of ${g.en}:\n\n📝 ${g.descEn}\n📍 Location: ${g.locEn}\n\n${g.priceEn}\n\n✅ Key advantages:\n${g.prosEn.slice(0,3).map(p=>`• ${p}`).join("\n")}\n\n📍 Popular areas: ${g.areas.slice(0,4).join(", ")}\n\n💬 Ask me about prices, pros, cons, or landmarks!`;
}

function generateSmartReply(msg: string, lang: string, propSummary: string): string {
  const ar = lang !== "en";
  const gov = detectGov(msg);
  const intent = detectIntent(msg);

  if (intent === "greeting")
    return ar
      ? `يا هلا وغلا! 🤵 أنا نشمي، مساعدك العقاري في منصة بيتي.\n\nبقدر أساعدك في:\n🏠 أسعار العقارات في أي محافظة\n📍 أفضل المناطق والأحياء\n✅ مميزات وعيوب كل محا��ظة\n🏛️ معالم وأماكن المحافظات\n\nاذكر اسم المحافظة أو اسألني بحرية! 😊`
      : `Welcome! 🤵 I'm Nashmi, your real estate assistant at Baity.\n\nI can help with:\n🏠 Property prices in any governorate\n📍 Best areas & neighborhoods\n✅ Pros & cons of each governorate\n🏛️ Famous places & landmarks\n\nJust mention a governorate or ask freely! 😊`;

  if (gov) return buildGovReply(gov, intent, ar);

  if (/رخيص|أرخص|أقل سعر|ميزانية محدودة|cheap|cheapest|affordable|low.?budget/.test(msg.toLowerCase()))
    return ar
      ? `💡 أرخص المحافظات الأردنية:\n\n1. 🥇 الطفيلة — شقق من 18,000 د.أ\n2. 🥈 معان — شقق من 20,000 د.أ\n3. ���� المفرق — شقق من 25,000 د.أ\n4. الكرك — شقق من 25,000 د.أ\n5. عجلون — شقق من 28,000 د.أ\n\n💬 اذكر أي محافظة للتفاصيل!`
      : `💡 Most affordable governorates:\n\n1. 🥇 Tafilah — Apts from JOD 18,000\n2. 🥈 Ma'an — Apts from JOD 20,000\n3. 🥉 Mafraq — Apts from JOD 25,000\n4. Karak — Apts from JOD 25,000\n5. Ajloun — Apts from JOD 28,000\n\n💬 Mention any governorate for full details!`;

  if (intent === "invest")
    return ar
      ? `📈 أفضل المحافظات للاستثمار:\n\n1. 🌟 العقبة — منطقة اقتصادية خاصة\n2. 🌟 عمّان — طلب دائم ومستقر\n3. 🌟 إربد — سوق جامعي نشط\n4. 💡 مأدبا — قرب من المطار\n\n💬 هل تريد تفاصيل عن محافظة معينة؟`
      : `📈 Best governorates for investment:\n\n1. 🌟 Aqaba — Special Economic Zone\n2. 🌟 Amman — Constant stable demand\n3. 🌟 Irbid — Active university market\n4. 💡 Madaba — Near airport\n\n💬 Want investment details for a specific governorate?`;

  if (/كل المحافظات|جميع المحافظات|قائمة|all gov|list all/.test(msg.toLowerCase()))
    return ar
      ? `🗺️ المحافظات الأردنية الـ 12:\n\n1. عمّان 🏙️  2. الزرقاء 🏭  3. إر��د 🎓\n4. العقبة 🏖️  5. المفرق 🌾  6. البلقاء 🌿\n7. الكرك 🏰  8. مأدبا 🎨  9. جرش 🏛️\n10. عجلون 🌲  11. معان 🐪  12. الطفيلة ⛰️\n\n💬 اذكر أي محافظة للتفاصيل!`
      : `🗺️ Jordan's 12 Governorates:\n\n1. Amman 🏙️  2. Zarqa 🏭  3. Irbid 🎓\n4. Aqaba 🏖️  5. Mafraq 🌾  6. Balqa 🌿\n7. Karak 🏰  8. Madaba 🎨  9. Jerash 🏛️\n10. Ajloun 🌲  11. Ma'an 🐪  12. Tafilah ⛰️\n\n💬 Mention any governorate for details!`;

  if (intent === "property" && propSummary && propSummary.length > 50)
    return ar
      ? `🏠 من عقارات بيتي المتاحة:\n\n${propSummary.split("\n").slice(0,5).join("\n")}\n\n💬 اذكر المحافظة التي تريدها!`
      : `🏠 From available Baity properties:\n\n${propSummary.split("\n").slice(0,5).join("\n")}\n\n💬 Tell me which governorate you want!`;

  return ar
    ? `🤔 أنا متخصص في العقارات الأردنية!\n\nيمكنني مساعدتك في:\n• 💰 أسعار العقارات في أي محافظة\n• 📍 أفضل المناطق للسكن\n• ✅ مقارنة المحافظات\n• 🏛️ معالم ومميزات كل محافظة\n\nاذكر اسم المحافظة التي تهتم بها 😊`
    : `🤔 I specialize in Jordanian real estate!\n\nI can help with:\n• 💰 Property prices in any governorate\n• 📍 Best residential areas\n• ✅ Governorate comparisons\n• 🏛️ Landmarks & highlights\n\nJust mention the governorate you're interested in! 😊`;
}

app.post(`${PREFIX}/chatbot`, async (c) => {
  try {
    const allowed = await checkRateLimit("chatbot_global", 200, 60 * 1000);
    if (!allowed) return errorRes(c, 429, "تم تجاوز حد الطلبات. يرجى المحاولة بعد دقيقة.");

    let body: any;
    try { body = await c.req.json(); } catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const { messages, language, propertySummary } = body;
    if (!Array.isArray(messages)) return errorRes(c, 400, "messages مطلوب");

    const lastMessage = messages[messages.length - 1]?.content || messages[messages.length - 1]?.text || "";
    const reply = generateSmartReply(sanitize(lastMessage, 500), language || "ar", propertySummary || "");

    return c.json({ success: true, data: { reply } });
  } catch (e: any) {
    console.error("POST /chatbot error:", e.message);
    return errorRes(c, 500, "تعذّر معالجة الطلب");
  }
});

// ════════════════════════════════════════════
// User Profile Management
// ═══��════════════════════════════════════════

app.get(`${PREFIX}/user/profile`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);
    return c.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || "",
        phone: user.user_metadata?.phone || "",
      },
    });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر جلب بيانات المستخدم");
  }
});

app.put(`${PREFIX}/user/profile`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    let body: any;
    try { body = await c.req.json(); } catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const { name, phone } = body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = sanitizeName(name);
    if (phone !== undefined) updates.phone = sanitize(phone, 20);

    const supabase = getServiceClient();
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, ...updates },
    });
    if (error) return errorRes(c, 400, "فشل تحديث البيانات", error.message);

    return c.json({
      success: true,
      data: {
        name: data.user.user_metadata?.name || "",
        phone: data.user.user_metadata?.phone || "",
      },
    });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر تحديث بيانات المستخدم");
  }
});

app.put(`${PREFIX}/user/email`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    let body: any;
    try { body = await c.req.json(); } catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const { email } = body;
    if (!isValidEmail(email)) return errorRes(c, 400, "البريد الإلكتروني غير صالح");

    const supabase = getServiceClient();
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      email: email.trim().toLowerCase(),
      email_confirm: true,
    });
    if (error) return errorRes(c, 400, "فشل تحديث البريد الإلكتروني", error.message);

    return c.json({ success: true, data: { email: data.user.email } });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر تحديث البريد الإلكتروني");
  }
});

app.put(`${PREFIX}/user/password`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    let body: any;
    try { body = await c.req.json(); } catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const { newPassword } = body;
    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) return errorRes(c, 400, passwordCheck.error);

    const supabase = getServiceClient();
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (error) return errorRes(c, 400, "فشل تغيير كلمة المرور", error.message);

    return c.json({ success: true });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر تغيير كلمة المرور");
  }
});

app.get(`${PREFIX}/property-stats`, async (c) => {
  try {
    const data = await kv.getByPrefix("property_");
    const approved = data.filter((p: any) => p.status === "approved" || p.status === "active");
    const govCounts: Record<string, number> = {};
    approved.forEach((p: any) => {
      const gov = p.governorate || "غير محدد";
      govCounts[gov] = (govCounts[gov] || 0) + 1;
    });
    return c.json({ success: true, data: { total: approved.length, byGovernorate: govCounts } });
  } catch (e: any) {
    return errorRes(c, 500, "تعذّر جلب الإحصائيات");
  }
});

// ═════════════════════════════���══════════════
// Admin Logs
// ════════════════════════════════════════════
app.get(`${PREFIX}/admin/logs`, async (c) => {
  const { error } = await requireAdmin(c);
  if (error) return error;
  try {
    const logs = await kv.getByPrefix("admin_log_");
    logs.sort((a: any, b: any) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    return c.json({ success: true, data: logs.slice(0, 500) });
  } catch (e: any) {
    console.error("GET /admin/logs:", e.message);
    return errorRes(c, 500, "تعذّر جلب السجلات");
  }
});

// Get all users (admin only) with lightweight statistics
app.get(`${PREFIX}/admin/users`, async (c) => {
  const { error } = await requireAdmin(c);
  if (error) return error;
  try {
    const supabase = getServiceClient();

    // Fetch all auth users (up to 1000)
    const { data, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error("❌ [/admin/users] listUsers error:", listError.message);
      return errorRes(c, 500, "تعذّر جلب المستخدمين");
    }

    // Fetch properties only — threads are intentionally skipped because loading
    // full thread objects (with all message arrays) can be several MB and causes
    // the Deno edge-function to time out before the response is sent.
    const [approvedProperties, pendingProperties] = await Promise.all([
      kv.getByPrefix("property_").catch(() => [] as any[]),
      kv.getByPrefix("pending_property_").catch(() => [] as any[]),
    ]);

    // Build lightweight property map per user (omit heavy fields)
    const userPropertiesMap = new Map<string, any[]>();
    for (const prop of ([...approvedProperties, ...pendingProperties] as any[])) {
      if (!prop?.ownerId) continue;
      const list = userPropertiesMap.get(prop.ownerId) ?? [];
      list.push({
        id: prop.id,
        title: prop.title || "—",
        governorate: prop.governorate || "—",
        operationType: prop.operationType,
        propertyType: prop.propertyType,
        price: prop.price,
        status: prop.status,
        createdAt: prop.createdAt || prop.submittedAt,
        // image/images/description omitted intentionally to keep payload small
      });
      userPropertiesMap.set(prop.ownerId, list);
    }

    const users = (data?.users ?? [])
      .filter((u: any) => u.email !== ADMIN_EMAIL)
      .map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split("@")[0] || "مستخدم",
        phone: user.user_metadata?.phone || "",
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        propertiesCount: userPropertiesMap.get(user.id)?.length ?? 0,
        messagesCount: 0,
        properties: userPropertiesMap.get(user.id) ?? [],
      }));

    users.sort((a: any, b: any) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    console.log(`✅ [/admin/users] Returning ${users.length} users`);
    return c.json({ success: true, data: users });
  } catch (e: any) {
    console.error("❌ [GET /admin/users] Exception:", e.message);
    return errorRes(c, 500, "تعذّر جلب المستخدمين");
  }
});

// Delete user (admin only)
app.delete(`${PREFIX}/admin/users/:userId`, async (c) => {
  const { error } = await requireAdmin(c);
  if (error) return error;

  const userId = c.req.param("userId");
  if (!userId) return errorRes(c, 400, "معرّف المستخدم مطلوب");

  try {
    const supabase = getServiceClient();

    // Delete user's properties (pending and approved)
    const [pendingProps, approvedProps] = await Promise.all([
      kv.getByPrefix("pending_property_"),
      kv.getByPrefix("property_"),
    ]);

    const userProps = [...pendingProps, ...approvedProps].filter(
      (p: any) => p.ownerId === userId
    );

    for (const prop of userProps) {
      const key = prop.status === "pending"
        ? `pending_property_${prop.id}`
        : `property_${prop.id}`;
      await kv.del(key);
    }

    // Delete user's favorites
    await kv.del(`favorites_${userId}`);

    // Delete user's threads and messages
    const allThreads = await kv.getByPrefix("thread_");
    const userThreads = allThreads.filter((t: any) =>
      t.inquirerId === userId || t.ownerId === userId
    );

    for (const thread of userThreads) {
      // thread.id already IS the full KV key (e.g. "thread_propId_userId")
      await kv.del(thread.id);
    }

    // Delete user's reports
    const allReports = await kv.getByPrefix("report_");
    const userReports = allReports.filter((r: any) => r.reporter_id === userId);

    for (const report of userReports) {
      // report.id already IS the full KV key (e.g. "report_UUID")
      await kv.del(report.id);
    }

    // Delete user's notifications
    await kv.del(`notifications_${userId}`);

    // Delete user from Supabase Auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("DELETE /admin/users/:userId error:", deleteError.message);
      return errorRes(c, 500, "تعذّر حذف المستخدم");
    }

    // Log admin action
    await kv.set(`admin_log_${Date.now()}_delete_user_${userId}`, {
      action: "delete_user",
      userId,
      created_at: new Date().toISOString(),
      details: `تم حذف المستخدم وجميع بياناته (${userProps.length} عقار، ${userThreads.length} محادثة، ${userReports.length} بلاغ)`,
    });

    return c.json({
      success: true,
      message: "تم حذف المستخدم وجميع بياناته بنجاح",
      deletedData: {
        properties: userProps.length,
        threads: userThreads.length,
        reports: userReports.length,
      }
    });
  } catch (e: any) {
    console.error("DELETE /admin/users/:userId:", e.message);
    return errorRes(c, 500, "تعذّر حذف المستخدم");
  }
});

Deno.serve(app.fetch);
