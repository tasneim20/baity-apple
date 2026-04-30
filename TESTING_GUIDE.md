# دليل الاختبار — منصة بيتي

الـ API Base:
```
https://yhusekmwaawcxemjcvbo.supabase.co/functions/v1/make-server-26c70f3b
```

---

## 1. الصحة العامة للخادم

```bash
curl "https://yhusekmwaawcxemjcvbo.supabase.co/functions/v1/make-server-26c70f3b/health"
```

المتوقع: `{ "status": "ok", "version": "11-inline-kv" }`

إذا جاء غير ذلك → الـ edge function إما لم تُنشر أو تعيد تشغيلاً بارداً. انتظر 10 ثوانٍ وأعد المحاولة.

---

## 2. التسجيل وتسجيل الدخول

### تسجيل مستخدم جديد
```bash
curl -X POST "$BASE/signup" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234","name":"مستخدم تجريبي","phone":"0791234567"}'
```

المتوقع: `success: true` مع session يحتوي `access_token`.  
خطأ متوقع إذا كرّرت نفس البريد: `409`.  
خطأ متوقع إذا كررت 6 مرات خلال 15 دقيقة: `429`.

### تسجيل دخول موجود
يتم عبر Supabase Auth SDK مباشرة (الخادم لا يملك `/login` endpoint):
```typescript
const { data } = await supabase.auth.signInWithPassword({
  email: "test@example.com",
  password: "Test1234"
});
const userToken = data.session?.access_token;
```

---

## 3. دورة حياة العقار (من الإرسال للنشر)

### الخطوة 1: إرسال عقار
```bash
curl -X POST "$BASE/properties" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "شقة للبيع في عمّان",
    "description": "شقة في الجبيهة",
    "type": "شقة",
    "category": "بيع",
    "governorate": "عمّان",
    "price": 75000,
    "area": 120,
    "bedrooms": 3,
    "bathrooms": 2,
    "image": "https://...",
    "images": [],
    "views": 0,
    "inquiries": 0
  }'
```

المتوقع: `success: true` مع رسالة "قيد المراجعة". العقار لن يظهر في `GET /properties`.

### الخطوة 2: تأكيد أن العقار معلّق
```bash
curl "$BASE/admin/pending" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $ADMIN_TOKEN"
```

يجب أن تجد العقار المُرسَل في القائمة.

### الخطوة 3: الموافقة
```bash
curl -X POST "$BASE/admin/approve/$PROPERTY_ID" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $ADMIN_TOKEN"
```

المتوقع: العقار ينتقل إلى `GET /properties`.

### الخطوة 4: التحقق من النشر
```bash
curl "$BASE/properties" -H "Authorization: Bearer $ANON_KEY"
```

ابحث عن العقار بالـ id في النتائج.

### الخطوة 5: الرفض (بديل للخطوة 3)
```bash
curl -X POST "$BASE/admin/reject/$PROPERTY_ID" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "صور غير واضحة"}'
```

المتوقع: `GET /my-properties` للمالك يُظهر العقار بحالة `rejected` مع `rejectionReason`.

---

## 4. المفضلة

```bash
# إضافة
curl -X POST "$BASE/favorites" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"propertyId": "$PROPERTY_ID"}'

# جلب
curl "$BASE/favorites" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $USER_TOKEN"

# حذف
curl -X DELETE "$BASE/favorites" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"propertyId": "$PROPERTY_ID"}'
```

---

## 5. الرسائل

### إرسال رسالة
```bash
curl -X POST "$BASE/messages" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "$PROPERTY_ID",
    "ownerId": "$OWNER_ID",
    "text": "هل العقار لا يزال متاحاً؟"
  }'
```

المتوقع: `threadId = "thread_{propertyId}_{inquirerId}"`.

### جلب محادثات المستخدم
```bash
curl "$BASE/messages" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $USER_TOKEN"
```

### اختبار حذف الرسالة بعد 10 دقائق
أرسل رسالة، انتظر 11 دقيقة، ثم حاول حذفها:
```bash
curl -X DELETE "$BASE/messages/$THREAD_ID/$MESSAGE_ID" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $USER_TOKEN"
```
المتوقع: `400` مع رسالة "انتهت مهلة الحذف (10 دقائق)".

---

## 6. نظام البلاغات

### إرسال بلاغ
```bash
curl -X POST "$BASE/reports" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"propertyId": "$PROPERTY_ID", "reason": "إعلان مكرر", "description": "نفس العقار ظهر مرتين"}'
```

### اختبار Rate Limiting (11 بلاغ خلال ساعة)
يجب أن يُعيد الـ request الـ 11 `429`.

### مراجعة البلاغ من الأدمن
```bash
curl "$BASE/admin/reports" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $ADMIN_TOKEN"
```

### اتخاذ إجراء
```bash
curl -X POST "$BASE/admin/reports/$REPORT_ID/action" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "hide_property", "notes": "تم التحقق من التكرار"}'
```

تحقق بعدها أن العقار أصبح `status: "hidden"` في `GET /admin/properties`.

---

## 7. سجل العمليات

بعد تنفيذ أي عملية أدمن (موافقة، رفض، حذف، إجراء بلاغ):
```bash
curl "$BASE/admin/logs" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $ADMIN_TOKEN"
```

تأكد أن آخر سجل يعكس العملية المنفّذة بالـ action و entityType و details الصحيحة.

---

## 8. إدارة المستخدمين

```bash
# جلب القائمة
curl "$BASE/admin/users" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $ADMIN_TOKEN"
```

تأكد: `admin@baity.com` غير موجود في النتائج.

### حذف مستخدم (اختبر على بيانات تجريبية فقط)
```bash
curl -X DELETE "$BASE/admin/users/$USER_ID" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $ADMIN_TOKEN"
```

بعد الحذف تحقق أن: `GET /properties` لا يعرض عقاراته، و`GET /admin/conversations` لا يعرض محادثاته.

---

## 9. تتبع واتساب

```bash
curl -X POST "$BASE/track-whatsapp" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"propertyId": "test-123", "ownerPhone": "962791234567"}'
```

المتوقع: `{ "success": true }`.  
يُسجَّل في KV كـ `whatsapp_test-123_{timestamp}`.

اختبار بدون بيانات:
```bash
curl -X POST "$BASE/track-whatsapp" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```
المتوقع: `400` مع "البيانات مطلوبة".

---

## 10. المساعد الذكي (نشمي)

```bash
curl -X POST "$BASE/chatbot" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"content": "ما أسعار الشقق في إربد؟"}], "language": "ar"}'
```

المتوقع: ردّ منسّق يذكر نطاق أسعار إربد. لا يعتمد على AI خارجي — الردود مُولَّدة محلياً.

اختبر بالإنجليزية:
```bash
-d '{"messages": [{"content": "Tell me about Aqaba properties"}], "language": "en"}'
```

---

## 11. الأمان

### XSS Prevention
```bash
curl -X POST "$BASE/signup" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"xss@test.com","password":"Test1234","name":"<script>alert(1)</script>"}'
```
المتوقع: يتم حفظ الاسم لكن بدون script tags.

### وصول غير مصرح به لـ Admin APIs
```bash
curl "$BASE/admin/logs" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "X-User-Token: $USER_TOKEN"
```
المتوقع: `403` "ليس لديك صلاحية أدمن".

---

## نتائج الاختبار

| الاختبار | الحالة |
|---|---|
| Health check | ⬜ |
| تسجيل مستخدم جديد | ⬜ |
| تسجيل دخول | ⬜ |
| إرسال عقار (pending) | ⬜ |
| موافقة الأدمن | ⬜ |
| رفض مع سبب | ⬜ |
| ظهور العقار في /properties | ⬜ |
| المفضلة (إضافة/حذف) | ⬜ |
| إرسال رسالة | ⬜ |
| حذف رسالة بعد 10 دقائق → 400 | ⬜ |
| إرسال بلاغ | ⬜ |
| اتخاذ إجراء على بلاغ | ⬜ |
| تسجيل Admin Log بعد كل عملية | ⬜ |
| جلب المستخدمين (بدون admin) | ⬜ |
| حذف مستخدم + بياناته | ⬜ |
| تتبع واتساب | ⬜ |
| المساعد نشمي (عربي + إنجليزي) | ⬜ |
| حماية XSS | ⬜ |
| 403 على Admin APIs من مستخدم عادي | ⬜ |
