# إرشادات التطوير — منصة بيتي

هذا الملف يحكم قرارات التطوير في المشروع. أي تعديل على الواجهة أو الباك اند يجب أن ينسجم مع ما هو موثّق هنا.

---

## اللغة والاتجاه

المنصة تدعم العربية والإنجليزية، لكن العربية هي الافتراضي. كل عنصر في الواجهة يجب أن يعمل بشكل صحيح في RTL أولاً.

- اتجاه المستند: `dir="rtl"` على الـ `<html>`
- لا تستخدم `left`/`right` في الـ CSS وأنت تُصمّم شيئاً يجب أن يعكس اتجاهه — استخدم `start`/`end` أو flexbox
- الأيقونات التي تحمل معنى اتجاهي (سهم رجوع، سهم تقدم) يجب أن تُعكس في RTL
- خط النصوص: **IBM Plex Sans Arabic** — لا تُضف خطوطاً أخرى إلا إذا طُلب صراحةً

---

## نظام الألوان

اللون الذهبي `#F5A623` هو اللون التفاعلي الوحيد في المنصة. يُستخدم على:
- الأزرار الرئيسية (CTA)
- الروابط النشطة والعناصر المحددة
- أيقونات الحالة الإيجابية
- حواف البطاقات البارزة

**قواعد ��ارمة:**
- النصوص والأيقونات فوق الخلفية الذهبية: أبيض فقط، لا استثناءات
- لا يوجد أي لون وردي في أي مكان في المنصة
- الوضع الداكن إلزامي — كل component جديد يجب أن يختبر في dark mode

---

## مكونات الواجهة

### Glassmorphism
تأثير الزجاج مُستخدم في البطاقات والـ modals. لا تلغِه وأنت تُعدّل component موجود:
```css
background: rgba(255, 255, 255, 0.08);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.12);
```

### الأزرار
- زر رئيسي: خلفية ذهبية + نص أبيض
- زر ثانوي: border ذهبي + نص ذهبي + خلفية شفافة
- زر هدم (حذف/رفض): أحمر، وليس ذهبياً

### الجداول والقوائم
- الجداول الطويلة تحتاج تمرير أفقي على الموبايل — لا تكسر التخطيط
- كل عنصر في قائمة يحتاج `key` فريد — استخدم الـ id الحقيقي وليس الـ index

---

## هيكل الكود

### ملفات الصفحات
كل صفحة في `/src/app/pages/` هي `export default function`. الأسماء تتبع نمط `PascalCase`:
```
AdminDashboard.tsx
AdminReports.tsx
AdminCSV.tsx
...
```

### المكونات المشتركة
المكونات المُعاد استخدامها في `/src/app/components/`. إذا استخدمت مكوناً في 3 صفحات أو أكثر، انقله إلى هذا المجلد.

### الـ Context
AppContext في `/src/app/context/AppContext.tsx` يحمل الحالة العامة (user, properties, authReady). لا تُضف state لا تحتاجه فعلاً على المستوى العالمي — استخدم state محلي للصفحة أولاً.

### الـ Routes
`/src/app/routes.tsx` يستخدم `createBrowserRouter` من `react-router` (ليس `react-router-dom`). أي صفحة جديدة تُضاف هنا مع import.

---

## الاتصال بالباك اند

### نمط الطلبات
```typescript
const API = "https://yhusekmwaawcxemjcvbo.supabase.co/functions/v1/make-server-26c70f3b";

const response = await fetch(`${API}/properties`, {
  headers: {
    "Authorization": `Bearer ${publicAnonKey}`,
    "X-User-Token": userToken,    // JWT من Supabase Auth
    "Content-Type": "application/json"
  }
});
```

الـ `publicAnonKey` في `/utils/supabase/info.tsx`.

### إدارة الأخطاء
كل طلب يجب أن يتعامل مع:
- `401` → الجلسة انتهت → اطلب من المستخدم تسجيل الدخول من جديد
- `403` → لا صلاحية → اعرض رسالة مناسبة وأعد التوجيه
- `429` → تجاوز الحد → اعرض وقت الانتظار إذا أمكن
- `5xx` → خطأ خادم → رسالة عامة + log في console

### التوكن
احرص على استخدام `getValidToken()` وليس `session.access_token` مباشرة، لأن التوكن قد ينتهي وتحتاج refresh.

---

## KV Store — أنماط مهمة

عند كتابة endpoints جديدة في `index.tsx`، التزم بالأنماط الموجودة:

**مفاتيح جديدة:** اختر prefix واضح ومنسجم مع الموجود. مثال: إذا أضفت إشعارات، استخدم `notif_{userId}_{uuid}`.

**لا تحمّل prefix كامل إذا لم تحتجه:** `getByPrefix("property_")` يجلب كل العقارات — مكلف. إذا تعرف الـ id استخدم `kv.get("property_" + id)`.

**Singleton clients:** استخدم `_svcClient` و `_anonClient` المُعرَّفين في أعلى الملف. لا تنشئ client جديد داخل route handler.

---

## normalizeGov والمحافظات

مقارنة المحافظات يجب أن تمر دائماً عبر `normalizeGov()` من `src/app/utils/governorateUtils.ts`:

```typescript
import { normalizeGov, sameGov } from "../utils/governorateUtils";

// صح
if (sameGov(property.governorate, selectedGov)) { ... }

// خطأ — مقارنة مباشرة
if (property.governorate === selectedGov) { ... }
```

المشكلة التي تحلّها: نفس المحافظة يمكن أن تكتب بصيغ مختلفة ("عمان"، "عمّان"، "Amman"، "amman") فتفشل المقارنة المباشرة.

---

## الأنيميشن

استخدم `motion` من `motion/react`:
```typescript
import { motion } from "motion/react";
```

لا تستخدم "Framer Motion" كمسمى — المكتبة أُعيدت تسميتها. لا تستخدم `@emotion` أو CSS animations مخصصة عندما يكفي Motion.

---

## الوضع الداكن

`dark:` classes في Tailwind. كل لون solid تضيفه يجب أن يملك مقابلاً في dark mode. اختبر دائماً بتبديل الثيم قبل merge.

---

## ما لا يجب فعله

- لا تُعدّل `/src/app/components/figma/ImageWithFallback.tsx` — ملف محمي
- لا تُعدّل `/pnpm-lock.yaml`
- لا تُضف خطوطاً في أي CSS غير `/src/styles/fonts.css`
- لا تنشئ `tailwind.config.js` — المشروع على Tailwind v4
- لا تستخدم `react-router-dom` — استخدم `react-router` فقط
- لا تستخدم `konva` — استخدم canvas API مباشرة
- لا تستخدم `react-resizable` — استخدم `re-resizable`
