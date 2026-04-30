# Edge Function APIs — مرجع التطوير

الـ edge function تعمل على Deno باستخدام Hono، وكل البيانات تُخزَّن في KV Store (جدول `kv_store_26c70f3b`). هذا الملف مرجع للـ endpoints مع أمثلة كود تعكس الاستخدام الفعلي.

```
PREFIX = /make-server-26c70f3b
```

---

## أنماط مشتركة

### استخراج المستخدم
```typescript
const token = extractUserToken(c);
if (!token) return errorRes(c, 401, "غير مصرح");
const { user, error: ae } = await getSupabaseUser(token);
if (ae || !user) return errorRes(c, 401, "غير مصرح", ae?.message);
```

### التحقق من الأدمن
```typescript
const { user, error } = await requireAdmin(c);
if (error) return error;
// user.email === "admin@baity.com" مضمون هنا
```

### كتابة سجل أدمن
```typescript
await writeAdminLog({
  adminId: user.id,
  adminEmail: user.email,
  action: "approve",           // approve | reject | delete | message_edit | message_delete | report_action
  entityType: "property",      // property | message | report
  entityId: propertyId,
  details: { title: "...", governorate: "..." }
});
// يُخزَّن كـ admin_log_{uuid} في KV
```

---

## Notifications (لم تُنفَّذ بعد)

هذا القسم موجود كمرجع مستقبلي إذا قررت إضافة إشعارات داخل المنصة.

### GET `/notifications`
```typescript
app.get(`${PREFIX}/notifications`, async (c) => {
  const token = extractUserToken(c);
  if (!token) return errorRes(c, 401, "غير مصرح");
  const { user, error: ae } = await getSupabaseUser(token);
  if (ae || !user) return errorRes(c, 401, "غير مصرح");

  // افتراض: الإشعارات مخزنة كـ notif_{userId}_{uuid}
  const notifs = await kv.getByPrefix(`notif_${user.id}_`);
  notifs.sort((a: any, b: any) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
  return c.json({ success: true, data: notifs });
});
```

### POST `/notifications/:id/read`
```typescript
app.post(`${PREFIX}/notifications/:id/read`, async (c) => {
  const token = extractUserToken(c);
  if (!token) return errorRes(c, 401, "غير مصرح");
  const { user, error: ae } = await getSupabaseUser(token);
  if (ae || !user) return errorRes(c, 401, "غير مصرح");

  const notifId = c.req.param("id");
  const fullKey = notifId.startsWith("notif_") ? notifId : `notif_${user.id}_${notifId}`;
  const notif: any = await kv.get(fullKey);
  if (!notif || notif.userId !== user.id) return errorRes(c, 404, "الإشعار غير موجود");

  await kv.set(fullKey, { ...notif, read: true });
  return c.json({ success: true });
});
```

---

## Reports (مُنفَّذ ✅)

### POST `/reports`
```typescript
app.post(`${PREFIX}/reports`, async (c) => {
  const token = extractUserToken(c);
  if (!token) return errorRes(c, 401, "غير مصرح");
  const { user, error: ae } = await getSupabaseUser(token);
  if (ae || !user) return errorRes(c, 401, "غير مصرح");

  const allowed = await checkRateLimit("report_" + user.id, 10, 60 * 60 * 1000);
  if (!allowed) return errorRes(c, 429, "تم تجاوز الحد المسموح به لإرسال البلاغات");

  const body = await c.req.json();
  const { propertyId, reason, description } = body;
  if (!propertyId) return errorRes(c, 400, "معرّف العقار مطلوب");
  if (!reason) return errorRes(c, 400, "سبب البلاغ مطلوب");

  // لقطة من بيانات العقار وقت البلاغ
  let propertySnap: any = null;
  try {
    const prop = await kv.get("property_" + propertyId);
    if (prop) propertySnap = { title: prop.title, governorate: prop.governorate, ownerName: prop.ownerName };
  } catch { /* اختياري */ }

  const id = "report_" + crypto.randomUUID();
  await kv.set(id, {
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
  });

  return c.json({ success: true, message: "تم إرسال البلاغ وسيتم مراجعته من قبل الإدارة" });
});
```

### GET `/admin/reports`
```typescript
app.get(`${PREFIX}/admin/reports`, async (c) => {
  const { error } = await requireAdmin(c);
  if (error) return error;

  const reports = await kv.getByPrefix("report_");
  reports.sort((a: any, b: any) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
  return c.json({ success: true, data: reports });
});
```

### POST `/admin/reports/:reportId/action`
```typescript
app.post(`${PREFIX}/admin/reports/:reportId/action`, async (c) => {
  const { user, error } = await requireAdmin(c);
  if (error) return error;

  const reportId = c.req.param("reportId");
  const body = await c.req.json();
  const { action, notes } = body;

  const validActions = ["delete_property", "hide_property", "warn_user", "dismiss"];
  if (!validActions.includes(action)) return errorRes(c, 400, "إجراء غير صالح");

  const fullKey = reportId.startsWith("report_") ? reportId : "report_" + reportId;
  const report: any = await kv.get(fullKey);
  if (!report) return errorRes(c, 404, "البلاغ غير موجود");

  if (action === "delete_property" && report.propertyId) {
    await kv.del("property_" + report.propertyId);
  } else if (action === "hide_property" && report.propertyId) {
    const prop: any = await kv.get("property_" + report.propertyId);
    if (prop) await kv.set("property_" + report.propertyId, { ...prop, status: "hidden" });
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
    adminId: user.id, adminEmail: user.email,
    action: "report_action", entityType: "report", entityId: fullKey,
    details: { action, propertyId: report.propertyId },
  });

  return c.json({ success: true, data: updated, message: "تم تنفيذ الإجراء بنجاح" });
});
```

---

## Admin Messages (مُنفَّذ ✅)

### GET `/admin/conversations`
يجلب كل threads مع آخر 100 رسالة لكل thread (الحد الأعلى لتجنب response ضخم).

```typescript
app.get(`${PREFIX}/admin/conversations`, async (c) => {
  const { error } = await requireAdmin(c);
  if (error) return error;

  const threads = await kv.getByPrefix("thread_");
  threads.sort((a: any, b: any) =>
    new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
  );
  // كل thread يُعاد بالـ 100 رسالة الأخيرة فقط
  return c.json({ success: true, data: threads.map((t: any) => ({
    ...t,
    messages: (t.messages || []).slice(-100),
  })) });
});
```

### DELETE `/admin/messages/:messageId`
يبحث في كل threads عن الرسالة ويحذفها — بدون قيد زمني للأدمن.

```typescript
app.delete(`${PREFIX}/admin/messages/:messageId`, async (c) => {
  const { user, error } = await requireAdmin(c);
  if (error) return error;

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
        adminId: user.id, adminEmail: user.email,
        action: "message_delete", entityType: "message", entityId: messageId,
        details: { threadId: thread.id },
      });
      break;
    }
  }

  if (!found) return errorRes(c, 404, "الرسالة غير موجودة");
  return c.json({ success: true });
});
```

### POST `/admin/messages/:messageId/edit`
```typescript
app.post(`${PREFIX}/admin/messages/:messageId/edit`, async (c) => {
  const { user, error } = await requireAdmin(c);
  if (error) return error;

  const messageId = c.req.param("messageId");
  const body = await c.req.json();
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
        adminId: user.id, adminEmail: user.email,
        action: "message_edit", entityType: "message", entityId: messageId,
        details: { threadId: thread.id },
      });
      break;
    }
  }

  if (!found) return errorRes(c, 404, "الرسالة غير موجودة");
  return c.json({ success: true });
});
```

---

## Admin Logs (مُنفَّذ ✅)

### GET `/admin/logs`
```typescript
app.get(`${PREFIX}/admin/logs`, async (c) => {
  const { error } = await requireAdmin(c);
  if (error) return error;

  const logs = await kv.getByPrefix("admin_log_");
  logs.sort((a: any, b: any) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
  return c.json({ success: true, data: logs.slice(0, 500) });
});
```

---

## Transactions (مُنفَّذ ✅)

### GET `/admin/transactions`
يجمع بيانات threads مع `tx_status_*` في map واحدة:

```typescript
const [threads, txStatuses] = await Promise.all([
  kv.getByPrefix("thread_"),
  kv.getByPrefix("tx_status_"),
]);
const statusMap: Record<string, any> = {};
for (const tx of txStatuses) {
  if (tx.threadId) statusMap[tx.threadId] = tx;
}
```

### POST `/admin/transactions/:threadId/status`
```typescript
// الحالات المقبولة: pending | in_progress | completed | cancelled
await kv.set(`tx_status_${threadId}`, {
  threadId, status,
  adminNote: sanitize(adminNote || "", 500),
  updatedAt: new Date().toISOString(),
});
```

---

## تحديثات approve/reject (مُنفَّذ ✅)

```typescript
// approve: ينقل من pending_property_ → property_
const approved = { ...pending, status: "approved", approvedAt: new Date().toISOString() };
await kv.set("property_" + id, approved);
await kv.del("pending_property_" + id);
await writeAdminLog({ action: "approve", entityType: "property", entityId: id, ... });

// reject: ينقل من pending_property_ → rejected_property_
const rejected = { ...pending, status: "rejected", rejectedAt: ..., rejectionReason: reason };
await kv.set("rejected_property_" + id, rejected);
await kv.del("pending_property_" + id);
await writeAdminLog({ action: "reject", entityType: "property", entityId: id, ... });
```

---

## Checklist

- [x] Reports APIs (POST /reports, GET /admin/reports, POST /admin/reports/:id/action)
- [x] Admin Messages APIs (GET /admin/conversations, DELETE + POST edit)
- [x] Admin Logs (GET /admin/logs + writeAdminLog helper)
- [x] Transactions (GET /admin/transactions, POST status)
- [x] Admin Users (GET /admin/users, DELETE /admin/users/:id)
- [x] تحديث approve/reject مع Admin Logs
- [x] Rate limiting على البلاغات
- [ ] Notifications APIs (لم تُنفَّذ بعد — موثّقة أعلاه كمرجع)
