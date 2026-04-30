# توثيق الباك اند — منصة بيتي العقارية

## معلومات المشروع

```
Project ID:     yhusekmwaawcxemjcvbo
Function Name:  make-server-26c70f3b
API Base URL:   https://yhusekmwaawcxemjcvbo.supabase.co/functions/v1/make-server-26c70f3b
Storage Bucket: make-26c70f3b-properties  (public)
KV Table:       kv_store_26c70f3b
Server Version: 11-inline-kv
```

بيانات الأدمن:
```
Email:    admin@baity.com
Password: Admin@Baity2024
```
الحساب يُنشأ تلقائياً عند أول تشغيل للـ edge function — لا حاجة لإنشائه يدوياً.

---

## البنية التقنية

**Runtime:** Deno على Supabase Edge Functions  
**Framework:** Hono.js  
**Database:** KV Store مبني فوق جدول PostgreSQL (`kv_store_26c70f3b`)  
**Auth:** Supabase Auth  
**Storage:** Supabase Storage (bucket public)

### هيكل الملفات

```
/supabase/
├── config.toml
└── functions/
    └── server/
        ├── index.tsx      ← الخادم الكامل (Hono + KV + Routes)
        └── kv_store.tsx   ← DEPRECATED (ملف فارغ، موجود للمرجعية فقط)
```

جميع عمليات KV Store موجودة مباشرة في `index.tsx` — لا يوجد ملف خارجي.

---

## KV Store

الجدول في PostgreSQL:
```sql
CREATE TABLE kv_store_26c70f3b (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kv_key_prefix
  ON kv_store_26c70f3b USING btree (key text_pattern_ops);
```

العمليات الأساسية (كلها تستخدم singleton service-role client):

```typescript
kv.set(key, value)           // upsert
kv.get(key)                  // null إذا غير موجود
kv.del(key)
kv.getByPrefix(prefix)       // LIKE 'prefix%'
kv.mset(keys, values)
kv.mget(keys)
kv.mdel(keys)
kv.getThreadsByUser(userId)  // فلتر JSONB — أسرع من getByPrefix("thread_")
```

> **ملاحظة أداء:** `getThreadsByUser` يفلتر على مستوى PostgreSQL باستخدام JSONB filter. إذا فشل الفلتر يرجع إلى full scan مع تصفية في الذاكرة.

### مفاتيح KV Store

```
property_{id}                   → عقار معتمد (status: "approved")
pending_property_{id}           → عقار بانتظار المراجعة
rejected_property_{id}          → عقار مرفوض (يحتوي rejectionReason)
favorites_{userId}              → مصفوفة IDs (string[])
thread_{propertyId}_{inquirerId}→ كائن المحادثة مع messages[]
likes_{propertyId}              → { count: number, userIds: string[] }
whatsapp_{propertyId}_{ts}      → سجل نقرة واتساب
report_{uuid}                   → بلاغ (uuid من crypto.randomUUID)
admin_log_{uuid}                → سجل عملية أدمن
tx_status_{threadId}            → حالة عملية البيع/الشراء
ratelimit_{action}_{identifier} → كاونتر Rate Limiting
```

---

## نموذج بيانات العقار

```typescript
interface Property {
  id: string;
  title: string;
  description: string;
  type: string;             // شقة | فيلا | أرض | تجاري | مكتب | شاليه
  category: "بيع" | "إيجار";
  governorate: string;      // الاسم العربي (عمّان، الزرقاء، ...)
  address?: string;
  location: { lat: number; lng: number };
  price: number;            // دينار أردني
  area: number;             // م²
  bedrooms: number;
  bathrooms: number;
  image: string;            // public URL لا ينتهي
  images: string[];
  views: number;
  likesCount?: number;
  status: "pending" | "approved" | "rejected" | "active" | "hidden";
  availabilityStatus?: "available" | "sold";
  featured?: boolean;
  userId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  createdAt: string;
  updatedAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}
```

> الإحداثيات تُفرض تلقائياً من `GOVERNORATE_COORDS` في index.tsx عند نشر العقار — إذا كانت الإحداثيات المُرسلة خارج نطاق الأردن (lat: 29.0–33.5, lng: 34.8–39.5) تُستبدل بإحداثيات المحافظة الصحيحة.

---

## جميع API Endpoints

### Headers المطلوبة

```typescript
// طلبات عامة
{
  "Authorization": "Bearer {ANON_KEY}"
}

// طلبات تحتاج مستخدم
{
  "Authorization": "Bearer {ANON_KEY}",
  "X-User-Token": "{USER_JWT}",
  "Content-Type": "application/json"
}
```

> الـ `X-User-Token` هو `session.access_token` من Supabase Auth. الخادم يتحقق منه أولاً عبر `/auth/v1/user`، وإذا فشل (401/انتهاء جلسة) يرجع لـ JWT fallback محلي.

---

### Auth

#### POST `/signup`
إنشاء حساب جديد. يُسجّل الدخول تلقائياً بعد النجاح.

```json
// Body
{ "email": "...", "password": "...", "name": "...", "phone": "..." }

// Response 200
{ "success": true, "data": { "id": "...", "email": "...", "name": "..." }, "session": { ... } }
```

أخطاء: `400` بيانات خاطئة، `409` بريد مكرر، `429` تجاوز 5 محاولات/15 دقيقة.

---

### العقارات (عام)

#### GET `/properties`
يُعيد العقارات المعتمدة فقط (`approved` أو `active`). الـ `description` محذوف لتقليل الحجم — الوصف الكامل يأتي في `/properties/:id`.

#### GET `/properties/:id`
عقار واحد بالتفاصيل الكاملة. إذا كان `ownerName` فارغاً يُجلب من Supabase Auth ويُحدَّث في KV.

#### POST `/properties`
إرسال عقار للمراجعة. يُحفظ كـ `pending_property_{id}`.

#### PUT `/properties/:id`
تعديل عقار. إذا عدّله المالك يرجع لـ `pending` تلقائياً. إذا عدّله الأدمن يبقى بحالته.

#### DELETE `/properties/:id`
حذف من أي حالة (pending/approved/rejected). المالك أو الأدمن فقط.

#### GET `/my-properties`
كل عقارات المستخدم بكل حالاتها. يجمع من الثلاثة prefixes.

#### POST `/properties/:id/availability`
تغيير حالة التوفر: `available` أو `sold`. للمالك فقط.

#### GET `/properties/:id/likes`
عدد الإعجابات + هل المستخدم الحالي أعجب بهذا العقار. لا يحتاج مصادقة.

#### POST `/properties/:id/like`
Toggle إعجاب. حد: 60 إعجاب/دقيقة.

#### GET `/property-stats`
إجمالي العقارات المعتمدة مقسّمة حسب المحافظة. مفيدة للـ homepage.

---

### الأدمن

> كل endpoints الأدمن تتحقق من `user.email === "admin@baity.com"` وتُعيد `403` لأي شخص آخر.

#### GET `/admin/pending`
الطلبات المعلقة مرتبة من الأحدث.

#### GET `/admin/properties`
كل العقارات المعتمدة (`property_*` prefix فقط).

#### POST `/admin/approve/:id`
ينقل العقار من `pending_property_` إلى `property_` مع `status: "approved"`. يُسجَّل في Admin Logs.

#### POST `/admin/reject/:id`
```json
{ "reason": "سبب الرفض" }
```
ينقل إلى `rejected_property_`. سبب الرفض في `rejectionReason`.

#### DELETE `/admin/properties/:id`
يحذف من `property_`. يُسجَّل في Admin Logs.

#### POST `/admin/toggle-featured/:id`
يُبدّل حقل `featured`. للإعلانات الممولة.

#### GET `/admin/conversations`
كل المحادثات مع آخر 100 رسالة لكل محادثة (الحد لتجنب حجم response ضخم).

#### DELETE `/admin/conversations/:threadId`
حذف محادثة كاملة من KV.

#### DELETE `/admin/messages/:messageId`
يبحث عن الرسالة في كل threads ويحذفها. بدون قيد زمني (المستخدم العادي لديه 10 دقائق).

#### POST `/admin/messages/:messageId/edit`
```json
{ "text": "النص الجديد" }
```
تعديل نص رسالة. يُضيف `editedAt` للرسالة.

#### GET `/admin/transactions`
كل المحادثات مع بيانات Transaction من `tx_status_*` مدموجة.

#### POST `/admin/transactions/:threadId/status`
```json
{ "status": "in_progress", "adminNote": "..." }
```
الحالات المقبولة: `pending` / `in_progress` / `completed` / `cancelled`.

#### POST `/reports`
إرسال بلاغ من مستخدم. حد: 10 بلاغات/ساعة لكل مستخدم.
```json
{ "propertyId": "...", "reason": "...", "description": "..." }
```

#### GET `/admin/reports`
كل البلاغات مرتبة من الأحدث.

#### POST `/admin/reports/:reportId/action`
```json
{ "action": "delete_property|hide_property|warn_user|dismiss", "notes": "..." }
```
`delete_property` يحذف العقار فعلياً. `hide_property` يضع `status: "hidden"`. يُسجَّل في Admin Logs.

#### GET `/admin/logs`
آخر 500 سجل للعمليات من `admin_log_*`.

#### GET `/admin/users`
قائمة المستخدمين من Supabase Auth مع إحصائيات خفيفة. يستثني `admin@baity.com` من النتائج. `messagesCount` يُعاد كـ 0 دائماً (تحميل الـ threads الكاملة يُسبّب timeout).

#### DELETE `/admin/users/:userId`
يحذف المستخدم وكل بياناته: عقاراته (pending + approved)، مفضلته، محادثاته، بلاغاته. تسلسلي — لا يوجد cascade تلقائي.

---

### رفع الملفات

#### POST `/upload`
```json
{ "fileData": "data:image/jpeg;base64,...", "mimeType": "image/jpeg", "fileName": "photo.jpg" }
```
حجم أقصى: 10 MB. أنواع مسموحة: jpg/png/webp/gif/pdf/doc/docx/txt. الـ response يُعيد `publicUrl` لا ينتهي (البucket public).

---

### الرسائل

#### GET `/messages`
محادثات المستخدم الحالي — يستخدم `getThreadsByUser` (JSONB filter على مستوى DB).

#### GET `/messages/:threadId`
محادثة واحدة. يتحقق أن المستخدم طرف فيها.

#### POST `/messages`
إرسال رسالة. يدعم نص + ملف + إحداثيات موقع. إذا أُرسل `fileUrl` كـ base64 يُرفع تلقائياً إلى Storage. الـ threadId = `thread_{propertyId}_{inquirerId}`.

#### POST `/messages/:threadId/mark-read`
يُعلَّم كل رسائل الـ thread كمقروءة.

#### DELETE `/messages/:threadId/:messageId`
للمستخدم فقط على رسائله. قيد زمني: 10 دقائق من وقت الإرسال.

---

### أخرى

#### POST `/track-whatsapp`
```json
{ "propertyId": "...", "ownerPhone": "..." }
```
يُسجَّل النقر في KV كـ `whatsapp_{propertyId}_{timestamp}`. المصادقة اختيارية.

#### POST `/chatbot`
```json
{ "messages": [...], "language": "ar", "propertySummary": "..." }
```
المساعد العقاري "نشمي" — knowledge base محلية بدون AI خارجي. يتعرف على المحافظة والنية من النص ويُعيد رد منسّق. حد عالمي: 200 طلب/دقيقة.

#### GET `/governorate-coords`
إحداثيات الـ 12 محافظة الأردنية.

#### GET `/health`
```json
{ "status": "ok", "version": "11-inline-kv" }
```

---

## الأمان

### Rate Limiting
مُطبَّق عبر KV كاونترات:
```
signup_{email}        → 5 محاولات / 15 دقيقة
upload_{userId}       → 20 رفعة / دقيقة
msg_{userId}          → 60 رسالة / دقيقة
like_{userId}         → 60 إعجاب / دقيقة
report_{userId}       → 10 بلاغات / ساعة
chatbot_global        → 200 طلب / دقيقة (عالمي لا per-user)
```

### Input Sanitization
كل نص يمر عبر `sanitize(text, maxLen)` الذي يُزيل script tags وHTML وجميع event handlers. الأسماء تمر عبر `sanitizeName()`.

### CORS
```
origin: "*"
allowHeaders: Content-Type, Authorization, X-User-Token
maxAge: 600s
```

### تسجيل الضجيج
المشكلة الشائعة "Http: connection closed before message completed" في Deno تُصدر عند إغلاق tab أو انتقال بين صفحات. يتم intercept لـ `console.error` عند بداية التحميل لتصفيتها بدلاً من تلويث الـ logs.

---

## النشر

```bash
supabase login
supabase link --project-ref yhusekmwaawcxemjcvbo
supabase functions deploy server
```

Environment variables (في Supabase Dashboard → Settings → Edge Functions → Secrets):
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`verify_jwt = false` في `config.toml` لأن التحقق من JWT يتم يدوياً داخل الكود.

---

## إنشاء KV Table (مرة واحدة فقط)

```sql
CREATE TABLE IF NOT EXISTS kv_store_26c70f3b (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kv_key_prefix
  ON kv_store_26c70f3b USING btree (key text_pattern_ops);

ALTER TABLE kv_store_26c70f3b ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only"
  ON kv_store_26c70f3b FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```
