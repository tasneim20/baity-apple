import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

// ════════════════════════════════════════════════════════════════════════════
// SUPPRESS DENO/SUPABASE HTTP DISCONNECT NOISE — must run before anything else
//
// Root cause: Supabase's edge-runtime logs unhandled rejections by calling
//   console.error(reason)          ← happens FIRST (before JS event fires)
//   dispatchEvent("unhandledrejection")  ← our preventDefault() is too late
//
// Fix: intercept console.error at module-load time and silently drop the
// single-argument Http disconnect error that Deno emits internally.
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

// Intercept console.error: drop single-argument disconnect errors produced by
// Deno's internal unhandled-rejection logger (format: console.error(error)).
// All other calls (with labels, multiple args, etc.) pass through unchanged.
const __origConsoleError = console.error.bind(console);
console.error = (...args: any[]) => {
  if (args.length === 1 && _isHttpDisconnect(args[0])) return;
  __origConsoleError(...args);
};

// Belt-and-suspenders: also handle via the event API in capture phase
// so we prevent any secondary handlers and potential process exit.
globalThis.addEventListener(
  "unhandledrejection",
  (event: any) => {
    if (_isHttpDisconnect(event?.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },
  true,
);
globalThis.addEventListener(
  "error",
  (event: any) => {
    if (_isHttpDisconnect(event?.error)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },
  true,
);
// ═══════════════════════════════════════════════════════════

const BUCKET = "make-26c70f3b-properties";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-User-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.options("/*", (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
      "Access-Control-Max-Age": "600",
    },
  });
});

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
  if (typeof password !== "string" || password.length === 0) {
    return { valid: false, error: "كلمة المرور مطلوبة" };
  }
  if (password.length < 6) {
    return { valid: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" };
  }
  if (password.length > 128) {
    return { valid: false, error: "كلمة المرور طويلة جداً" };
  }
  return { valid: true, error: "" };
}

const ALLOWED_MIME = [
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif", "pdf", "doc", "docx", "txt"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function validateFile(mimeType: string, base64: string, fileName?: string): { valid: boolean; error: string } {
  const mime = mimeType.split(";")[0].trim().toLowerCase();
  if (!ALLOWED_MIME.includes(mime)) {
    return { valid: false, error: "نوع الملف غير مسموح به. الأنواع المسموحة: jpg, png, webp, gif, pdf, doc, docx, txt" };
  }
  if (fileName) {
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return { valid: false, error: `امتداد الملف .${ext} غير مسموح به` };
    }
  }
  const raw = base64.includes(",") ? base64.split(",")[1] : base64;
  const bytes = Math.ceil(raw.length * 0.75);
  if (bytes > MAX_FILE_BYTES) {
    return { valid: false, error: "حجم الملف يتجاوز الحد المسموح به (10 ميغابايت)" };
  }
  return { valid: true, error: "" };
}

async function checkRateLimit(
  limitKey: string,
  maxAttempts: number,
  windowMs: number,
): Promise<boolean> {
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
  } catch (_e) {
    return true;
  }
}

// ════════════════════════════════════════════
// Supabase Helpers
// ════════════════════════════════════════════

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

function extractUserToken(c: any): string | null {
  // ── المصدر الأول: X-User-Token (للتوافق مع الإصدارات السابقة)
  const xToken = c.req.header("X-User-Token")?.trim();
  if (xToken) return xToken;

  // ── المصدر الثاني: Authorization bearer token
  // لكن نتحقق أنه user JWT (role=authenticated) وليس anon/service-role key
  const bearer = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return null;

  try {
    // فك ترميز الـ payload بدون التحقق من التوقيع — فقط لتمييز نوع الـ JWT
    const b64 = bearer.split(".")[1];
    if (!b64) return null;
    const padding = "=".repeat((4 - (b64.replace(/-/g, "+").replace(/_/g, "/").length % 4)) % 4);
    const payload = JSON.parse(atob(b64.replace(/-/g, "+").replace(/_/g, "/") + padding));
    // فقط user JWTs (role=authenticated) تمر — anon key ينتهي بـ role=anon
    if (payload?.role === "authenticated" && payload?.sub) return bearer;
  } catch { /* JWT تالف */ }

  return null;
}

async function getSupabaseUser(token: string) {
  const serviceClient = getServiceClient();
  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    // ✅ Direct HTTP call to GoTrue — the only 100% reliable way to validate
    // a user JWT in a Deno edge function, because supabase-js v2's behaviour
    // of auth.getUser(jwt) can vary depending on how the client was created
    // (service-role vs anon key) and whether a local session exists.
    //
    // GET /auth/v1/user
    //   apikey: <anon key>          ← identifies the project
    //   Authorization: Bearer <jwt> ← validates the user session
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        msg = body.msg || body.message || body.error_description || msg;
      } catch { /* ignore */ }
      return { supabase: serviceClient, user: null, error: new Error(msg) };
    }

    const user = await res.json();
    if (!user?.id) {
      return { supabase: serviceClient, user: null, error: new Error("Empty user response") };
    }
    return { supabase: serviceClient, user, error: null };
  } catch (e: any) {
    return { supabase: serviceClient, user: null, error: e };
  }
}

async function uploadBase64ToStorage(
  supabase: any,
  base64: string,
  mimeType: string,
  fileName: string,
): Promise<string | null> {
  try {
    const pure = base64.includes(",") ? base64.split(",")[1] : base64;
    const binary = atob(pure);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const mime = mimeType.split(";")[0].trim().toLowerCase();
    const ext = mime.split("/")[1]?.split(";")[0] || "bin";
    const safeName = (fileName || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const path = "messages/" + crypto.randomUUID() + "_" + safeName + "." + ext;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: mime, upsert: false });

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

async function resolveFileUrls(supabase: any, thread: any): Promise<any> {
  if (!thread?.messages?.length) return thread;

  const resolved = await Promise.all(
    thread.messages.map(async (msg: any) => {
      if (!msg.fileUrl) return msg;
      if (msg.fileUrl.startsWith("http")) return msg;

      if (msg.fileUrl.startsWith("data:")) {
        const path = await uploadBase64ToStorage(
          supabase,
          msg.fileUrl,
          msg.fileType || "application/octet-stream",
          msg.fileName || "file",
        );
        if (path) { msg.fileUrl = path; }
        else { return { ...msg, fileUrl: null }; }
      }

      const urlPromise = getSignedUrl(supabase, msg.fileUrl);
      const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), 4000));
      const url = await Promise.race([urlPromise, timeoutPromise]);
      return { ...msg, fileUrl: url };
    }),
  );

  return { ...thread, messages: resolved };
}

function stripFileData(thread: any): any {
  if (!thread?.messages) return thread;
  return {
    ...thread,
    messages: thread.messages.map((msg: any) => ({
      ...msg,
      fileUrl: msg.fileUrl ? "__has_file__" : null,
    })),
  };
}

function errorRes(c: any, status: number, userMsg: string, log?: string): any {
  if (log) console.error("[" + status + "]", log);
  return c.json({ success: false, error: userMsg }, status);
}

// ════════════════════════════════════════════
// Routes
// ════════════════════════════════════════════

app.get("/health", (c) => c.json({ status: "ok" }));

// ─── Signup
app.post("/signup", async (c) => {
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
      const isDuplicate =
        lowerMsg.includes("already registered") ||
        lowerMsg.includes("already been registered") ||
        lowerMsg.includes("already exists") ||
        lowerMsg.includes("email exists") ||
        lowerMsg.includes("duplicate") ||
        lowerMsg.includes("user already");
      if (isDuplicate) {
        return errorRes(c, 409, "هذا البريد الإلكتروني مسجّل مسبقاً");
      }
      console.error("signup unexpected error:", error.message);
      return errorRes(c, 400, "تعذّر إنشاء الحساب. يرجى التحقق من البيانات والمحاولة مجدداً");
    }

    // ── تسجيل الدخول التلقائي وإعادة الجلسة للمستخدم مباشرةً ──────────────────
    let session: any = null;
    try {
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
      );
      const { data: si, error: siErr } = await anonClient.auth.signInWithPassword({
        email: rawEmail,
        password: rawPassword,
      });
      if (!siErr && si?.session) {
        session = {
          access_token: si.session.access_token,
          refresh_token: si.session.refresh_token,
          expires_in: si.session.expires_in,
          token_type: si.session.token_type ?? "bearer",
        };
      }
    } catch (_e) {
      // لا نُفشل التسجيل إذا فشل توليد الجلسة — الـ client سيحاول مجدداً
    }

    return c.json({
      success: true,
      data: { id: data.user?.id, email: data.user?.email, name: cleanName },
      session,
    });
  } catch (e: any) {
    console.error("signup exception:", e.message);
    return errorRes(c, 500, "حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة لاحقاً");
  }
});

// ─── Properties: GET (public)
app.get("/properties", async (c) => {
  try {
    const data = await kv.getByPrefix("property_");
    return c.json({ success: true, data });
  } catch (e: any) {
    console.error("GET /properties:", e.message);
    return errorRes(c, 500, "تعذّر جلب العقارات");
  }
});

// ─── Properties: GET single (public) — يُعزّز البيانات بالاسم الحقيقي للمالك
app.get("/properties/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const property: any = await kv.get("property_" + id);
    if (!property) return errorRes(c, 404, "العقار غير موجود");

    // إذا لم يكن هناك اسم مالك، نجلبه من Supabase Auth بـ admin API
    if ((!property.ownerName || property.ownerName === "مالك العقار") && property.userId) {
      try {
        const supabase = getServiceClient();
        const { data: userData } = await supabase.auth.admin.getUserById(property.userId);
        if (userData?.user) {
          const resolvedName = sanitizeName(
            userData.user.user_metadata?.name ||
            userData.user.email?.split("@")[0] ||
            "مالك العقار"
          );
          property.ownerName = resolvedName;
          property.ownerEmail = userData.user.email || property.ownerEmail || "";
          // حفظ رقم الهاتف أيضاً لاستخدامه في زر الاتصال
          property.ownerPhone = sanitize(userData.user.user_metadata?.phone || "", 20);
          // نحدّث الـ KV حتى لا نحتاج للجلب مرة أخرى
          await kv.set("property_" + id, property);
        }
      } catch (ue: any) {
        console.error("resolveOwnerName error:", ue.message);
      }
    }

    // إذا كان هناك userId ولكن لا يوجد ownerPhone، نحاول جلبه
    if (!property.ownerPhone && property.userId) {
      try {
        const supabase = getServiceClient();
        const { data: userData } = await supabase.auth.admin.getUserById(property.userId);
        if (userData?.user?.user_metadata?.phone) {
          property.ownerPhone = sanitize(userData.user.user_metadata.phone, 20);
          await kv.set("property_" + id, property);
        }
      } catch (_) { /* non-critical */ }
    }

    return c.json({ success: true, data: property });
  } catch (e: any) {
    console.error("GET /properties/:id:", e.message);
    return errorRes(c, 500, "تعذّر جلب العقار");
  }
});

// ─── Properties: POST
app.post("/properties", async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    let property: any;
    try { property = await c.req.json(); }
    catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const id = property.id || crypto.randomUUID();
    const doc = {
      ...property,
      id,
      title: sanitize(property.title, 200),
      description: sanitize(property.description, 5000),
      address: sanitize(property.address, 300),
      userId: user.id,
      ownerName: sanitizeName(user.user_metadata?.name || user.email?.split("@")[0] || "مالك العقار"),
      ownerEmail: user.email || "",
      createdAt: new Date().toISOString(),
    };
    await kv.set("property_" + id, doc);
    return c.json({ success: true, data: doc });
  } catch (e: any) {
    console.error("POST /properties:", e.message);
    return errorRes(c, 500, "تعذّر إضافة العقار");
  }
});

// ─── Properties: PUT
app.put("/properties/:id", async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const id = c.req.param("id");
    const existing = await kv.get("property_" + id);
    if (!existing) return errorRes(c, 404, "العقار غير موجود");
    if (existing.userId !== user.id) return errorRes(c, 403, "غير مسموح");

    let updates: any;
    try { updates = await c.req.json(); }
    catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const doc = {
      ...existing, ...updates, id,
      title: sanitize(updates.title ?? existing.title, 200),
      description: sanitize(updates.description ?? existing.description, 5000),
      address: sanitize(updates.address ?? existing.address, 300),
      userId: user.id,
      updatedAt: new Date().toISOString(),
    };
    await kv.set("property_" + id, doc);
    return c.json({ success: true, data: doc });
  } catch (e: any) {
    console.error("PUT /properties/:id:", e.message);
    return errorRes(c, 500, "تعذّر تحديث العقار");
  }
});

// ─── Properties: DELETE
app.delete("/properties/:id", async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const id = c.req.param("id");
    const prop = await kv.get("property_" + id);
    if (!prop) return errorRes(c, 404, "العقار غير موجود");
    if (prop.userId !== user.id) return errorRes(c, 403, "غير مسموح");

    await kv.del("property_" + id);
    return c.json({ success: true });
  } catch (e: any) {
    console.error("DELETE /properties/:id:", e.message);
    return errorRes(c, 500, "تعذّر حذف العقار");
  }
});

// ─── Favorites: Toggle
app.post("/favorites/toggle", async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    let body: any;
    try { body = await c.req.json(); }
    catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const { propertyId } = body;
    if (!propertyId || typeof propertyId !== "string") return errorRes(c, 400, "معرّف العقار مطلوب");

    const key = "favorites_" + user.id;
    const favs: string[] = (await kv.get(key)) || [];
    const updated = favs.includes(propertyId)
      ? favs.filter((id) => id !== propertyId)
      : [...favs, propertyId];
    await kv.set(key, updated);
    return c.json({ success: true, data: updated });
  } catch (e: any) {
    console.error("POST /favorites/toggle:", e.message);
    return errorRes(c, 500, "تعذّر تحديث المفضلة");
  }
});

// ─── Favorites: GET
app.get("/favorites", async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const favs = (await kv.get("favorites_" + user.id)) || [];
    return c.json({ success: true, data: favs });
  } catch (e: any) {
    console.error("GET /favorites:", e.message);
    return errorRes(c, 500, "تعذّر جلب المفضلة");
  }
});

// ─── Upload file (base64 → Storage)
app.post("/upload", async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const allowed = await checkRateLimit("upload_" + user.id, 20, 60 * 1000);
    if (!allowed) return errorRes(c, 429, "تم تجاوز عدد التحميلات المسموحة. يرجى المحاولة لاحقاً");

    let body: any;
    try { body = await c.req.json(); }
    catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const { fileData, mimeType, fileName } = body;
    if (!fileData || !mimeType) return errorRes(c, 400, "بيانات الملف مطلوبة");

    const fileCheck = validateFile(mimeType, fileData, fileName);
    if (!fileCheck.valid) return errorRes(c, 400, fileCheck.error);

    const supabase = getServiceClient();
    const path = await uploadBase64ToStorage(supabase, fileData, mimeType, fileName || "file");
    if (!path) return errorRes(c, 500, "تعذّر رفع الملف");

    const url = await getSignedUrl(supabase, path);
    return c.json({ success: true, data: { path, signedUrl: url } });
  } catch (e: any) {
    console.error("POST /upload:", e.message);
    return errorRes(c, 500, "تعذّر رفع الملف");
  }
});

// ─── Messages: GET single thread
app.get("/messages/:threadId", async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, supabase, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const threadId = c.req.param("threadId");
    if (!threadId) return errorRes(c, 400, "معرّف المحادثة مطلوب");

    const thread = await kv.get(threadId);
    if (!thread) return errorRes(c, 404, "المحادثة غير موجودة");
    if (thread.ownerId !== user.id && thread.inquirerId !== user.id) return errorRes(c, 403, "غير مسموح");

    const resolvePromise = resolveFileUrls(supabase, thread);
    const fallback = new Promise<any>((r) => setTimeout(() => r(thread), 8000));
    const resolved = await Promise.race([resolvePromise, fallback]);

    const needsSave = thread.messages?.some(
      (m: any, i: number) =>
        m.fileUrl?.startsWith("data:") && resolved.messages[i]?.fileUrl !== m.fileUrl,
    );
    if (needsSave) {
      const toSave = {
        ...thread,
        messages: thread.messages.map((m: any, i: number) => {
          if (m.fileUrl?.startsWith("data:")) {
            const resolvedMsg = resolved.messages[i];
            return { ...m, fileUrl: resolvedMsg?.fileUrl ? m.fileUrl : null };
          }
          return m;
        }),
      };
      await kv.set(threadId, toSave);
    }

    return c.json({ success: true, data: resolved });
  } catch (e: any) {
    console.error("GET /messages/:threadId:", e.message);
    return errorRes(c, 500, "تعذّر جلب المحادثة");
  }
});

// ─── Messages: GET list
app.get("/messages", async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const all = await kv.getByPrefix("thread_");
    const mine = all
      .filter((t: any) => t.inquirerId === user.id || t.ownerId === user.id)
      .map(stripFileData)
      .sort((a: any, b: any) =>
        new Date(b.lastUpdated ?? 0).getTime() - new Date(a.lastUpdated ?? 0).getTime(),
      );

    return c.json({ success: true, data: mine });
  } catch (e: any) {
    console.error("GET /messages:", e.message);
    return errorRes(c, 500, "تعذّر جلب الرسائل");
  }
});

// ─── Messages: POST
app.post("/messages", async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, supabase, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const allowed = await checkRateLimit("msg_" + user.id, 60, 60 * 1000);
    if (!allowed) return errorRes(c, 429, "تم تجاوز حد إرسال الرسائل. يرجى الانتظار قليلاً");

    let body: any;
    try { body = await c.req.json(); }
    catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const { propertyId, ownerId, fileUrl, fileType, fileName, location: loc } = body;
    const inquirerId: string = body.inquirerId || user.id;
    const text: string = sanitize(body.text, 3000);

    if (!propertyId || typeof propertyId !== "string") return errorRes(c, 400, "معرّف العقار مطلوب");
    if (!ownerId || typeof ownerId !== "string") return errorRes(c, 400, "معرّف المالك مطلوب");
    if (!text && !fileUrl && !loc) return errorRes(c, 400, "يجب إرسال نص أو ملف أو موقع");

    if (fileUrl && typeof fileUrl === "string" && fileUrl.startsWith("data:") && fileType) {
      const fCheck = validateFile(fileType, fileUrl, fileName);
      if (!fCheck.valid) return errorRes(c, 400, fCheck.error);
    }

    let safeLocation = null;
    if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
      safeLocation = { lat: loc.lat, lng: loc.lng, label: sanitize(loc.label, 100) };
    }

    const threadId = "thread_" + propertyId + "_" + inquirerId;

    let storedFileRef: string | null = null;
    if (fileUrl && typeof fileUrl === "string" && fileUrl.startsWith("data:")) {
      storedFileRef = await uploadBase64ToStorage(
        supabase, fileUrl,
        fileType || "application/octet-stream",
        fileName || "file",
      );
    } else if (fileUrl && typeof fileUrl === "string") {
      storedFileRef = fileUrl;
    }

    let thread: any = await kv.get(threadId);
    if (!thread) {
      const property: any = await kv.get("property_" + propertyId);
      thread = {
        id: threadId,
        propertyId,
        propertyTitle: property?.title || "عقار",
        propertyImage: property?.image || "",
        inquirerId: user.id,
        inquirerName: sanitizeName(user.user_metadata?.name || user.email?.split("@")[0] || "مستفسر"),
        ownerId,
        ownerName: sanitizeName(property?.ownerName || "مالك العقار"),
        messages: [],
      };
    }

    const senderName = sanitizeName(user.user_metadata?.name || user.email?.split("@")[0] || "مستخدم");
    thread.messages.push({
      id: crypto.randomUUID(),
      senderId: user.id,
      senderName,
      senderRole: user.id === inquirerId ? "inquirer" : "owner",
      text,
      fileUrl: storedFileRef,
      fileType: fileType || null,
      fileName: fileName || null,
      location: safeLocation,
      isRead: false,
      timestamp: new Date().toISOString(),
    });
    thread.lastUpdated = new Date().toISOString();

    await kv.set(threadId, thread);
    return c.json({ success: true, data: { threadId, lastUpdated: thread.lastUpdated } });
  } catch (e: any) {
    console.error("POST /messages:", e.message);
    return errorRes(c, 500, "تعذّر إرسال الرسالة");
  }
});

// ─── Messages: Mark as Read
app.put("/messages/:threadId/read", async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return errorRes(c, 401, "غير مصرح");
    const { user, error: ae } = await getSupabaseUser(token);
    if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);

    const threadId = c.req.param("threadId");
    if (!threadId) return errorRes(c, 400, "معرّف المحادثة مطلوب");

    const thread = await kv.get(threadId);
    if (!thread) return errorRes(c, 404, "المحادثة غير موجودة");
    if (thread.ownerId !== user.id && thread.inquirerId !== user.id) return errorRes(c, 403, "غير مسموح");

    thread.messages = thread.messages.map((m: any) => ({ ...m, isRead: true }));
    await kv.set(threadId, thread);
    return c.json({ success: true });
  } catch (e: any) {
    console.error("PUT /messages/:threadId/read:", e.message);
    return errorRes(c, 500, "تعذّر تحديث حالة القراءة");
  }
});

// ─── Storage bucket setup on startup
(async () => {
  try {
    const supabase = getServiceClient();
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b: any) => b.name === BUCKET)) {
      await supabase.storage.createBucket(BUCKET, { public: false });
      console.log("Bucket created:", BUCKET);
    }
  } catch (e: any) {
    console.error("Bucket setup error:", e.message);
  }
})();

// ─── WhatsApp Click Tracking
app.post("/track-whatsapp", async (c) => {
  try {
    const token = extractUserToken(c);
    // لا نحتاج تسجيل دخول — يمكن للزوار أيضاً النقر
    let userId: string | null = null;
    if (token) {
      const { user } = await getSupabaseUser(token);
      userId = user?.id ?? null;
    }

    const allowed = await checkRateLimit(
      "whatsapp_" + (userId || c.req.header("x-forwarded-for") || "anonymous"),
      10,
      60 * 1000
    );
    if (!allowed) return errorRes(c, 429, "تم تجاوز عدد الطلبات المسموحة");

    let body: any;
    try { body = await c.req.json(); }
    catch { return errorRes(c, 400, "بيانات غير صالحة"); }

    const { propertyId, ownerPhone } = body;
    if (!propertyId || !ownerPhone) {
      return errorRes(c, 400, "معرّف العقار ورقم الهاتف مطلوبان");
    }

    const cleanPropertyId = sanitize(propertyId, 100);
    const cleanOwnerPhone = sanitize(ownerPhone, 20);

    // تخزين في KV store
    const trackingKey = `whatsapp_${cleanPropertyId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const trackingData = {
      propertyId: cleanPropertyId,
      userId: userId,
      ownerPhone: cleanOwnerPhone,
      clickedAt: new Date().toISOString(),
      userIp: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
      userAgent: c.req.header("user-agent") || "unknown",
    };

    await kv.set(trackingKey, trackingData);

    return c.json({ success: true, message: "تم تسجيل النقر بنجاح" });
  } catch (e: any) {
    console.error("POST /track-whatsapp:", e.message);
    return errorRes(c, 500, "تعذّر تسجيل النقر");
  }
});

// ════════════════════════════════════════════
// Server Startup
// ════════════════════════════════════════════

const safeHandler = async (req: Request): Promise<Response> => {
  if ((req as any).signal?.aborted) return new Response(null, { status: 499 });
  try {
    return await app.fetch(req);
  } catch (e: any) {
    if (_isHttpDisconnect(e)) return new Response(null, { status: 499 });
    console.error("Handler error:", e?.message ?? e);
    return new Response(
      JSON.stringify({ success: false, error: "حدث خطأ داخلي في الخادم" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

Deno.serve({
  handler: safeHandler,
  onError: (e: any) => {
    if (!_isHttpDisconnect(e)) {
      console.error("Serve onError:", e?.message ?? e);
    }
    return new Response(
      JSON.stringify({ success: false, error: "حدث خطأ داخلي في الخادم" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  },
});