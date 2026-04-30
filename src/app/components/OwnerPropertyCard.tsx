import { useState } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router";
import {
  Eye, Edit2, Trash2, MapPin, Bed, Bath, Maximize,
  Loader2, CheckCircle, XCircle, X, Save, DollarSign,
  FileText, Upload, Tag, ToggleLeft, ToggleRight,
  MessageCircle, Heart, Clock,
} from "lucide-react";
import { useApp, getValidToken } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { governorates, propertyTypes } from "../data/mockData";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b`;

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Ctext x='200' y='160' text-anchor='middle' fill='%2394a3b8' font-size='14' font-family='Arial'%3Eلا توجد صورة%3C/text%3E%3C/svg%3E";

interface Props {
  property: any;
  index?: number;
  onUpdated?: (updated: any) => void;
  onDeleted?: (id: string) => void;
}

function approvalBadge(status: string, ar: boolean) {
  if (status === "approved" || status === "active")
    return { cls: "bg-green-500/90 text-white", txt: ar ? "✅ منشور" : "✅ Published" };
  if (status === "pending")
    return { cls: "bg-amber-500/90 text-white", txt: ar ? "⏳ قيد المراجعة" : "⏳ Pending" };
  if (status === "rejected")
    return { cls: "bg-red-500/90 text-white", txt: ar ? "❌ مرفوض" : "❌ Rejected" };
  return { cls: "bg-green-500/90 text-white", txt: ar ? "✅ نشط" : "✅ Active" };
}

export default function OwnerPropertyCard({ property, index = 0, onUpdated, onDeleted }: Props) {
  const { language } = useApp();
  const navigate = useNavigate();
  const ar = language === "ar";

  /* ── local property state (for optimistic updates) */
  const [prop, setProp] = useState<any>(property);

  /* ── notifications */
  const [notif, setNotif] = useState<{ msg: string; ok: boolean } | null>(null);
  const showNotif = (msg: string, ok = true) => {
    setNotif({ msg, ok });
    setTimeout(() => setNotif(null), 3500);
  };

  /* ── edit */
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");

  /* ── delete */
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ── availability */
  const [avLoading, setAvLoading] = useState(false);

  /* ─────��──────────────────────────────────── open edit */
  const openEdit = () => {
    setEditForm({
      title:       prop.title        ?? "",
      price:       String(prop.price ?? ""),
      area:        String(prop.area  ?? ""),
      bedrooms:    String(prop.bedrooms  ?? ""),
      bathrooms:   String(prop.bathrooms ?? ""),
      description: prop.description  ?? "",
      governorate: prop.governorate  ?? "",
      category:    prop.category     ?? "بيع",
      type:        prop.type         ?? "",
      image:       prop.image ?? (prop.images?.[0] ?? ""),
    });
    setEditError("");
    setShowEdit(true);
  };

  /* ────────────────────────────────────────── save edit */
  const saveEdit = async () => {
    if (!editForm.title?.trim())                          { setEditError(ar ? "العنوان مطلوب"   : "Title required");  return; }
    if (!editForm.price || isNaN(Number(editForm.price))) { setEditError(ar ? "السعر غير صالح" : "Invalid price");   return; }
    setEditError("");
    setIsSaving(true);
    try {
      const token = await getValidToken();
      if (!token) throw new Error(ar ? "يجب تسجيل الدخول" : "Login required");
      const res  = await fetch(`${API}/properties/${prop.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title:       editForm.title.trim(),
          price:       Number(editForm.price),
          area:        Number(editForm.area)      || 0,
          bedrooms:    Number(editForm.bedrooms)  || 0,
          bathrooms:   Number(editForm.bathrooms) || 0,
          description: editForm.description?.trim() ?? "",
          governorate: editForm.governorate,
          category:    editForm.category,
          type:        editForm.type,
          image:       editForm.image || prop.image || "",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "فشل التحديث");
      const updated = { ...prop, ...data.data, status: "pending" };
      setProp(updated);
      onUpdated?.(updated);
      setShowEdit(false);
      showNotif(ar ? "✅ تم إرسال التعديلات للمراجعة" : "✅ Edits sent for review");
    } catch (e: any) {
      console.error("saveEdit:", e);
      setEditError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  /* ────────────────────────────────────────── delete */
  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const token = await getValidToken();
      if (!token) throw new Error(ar ? "يجب تسجيل الدخول" : "Login required");
      const res  = await fetch(`${API}/properties/${prop.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "X-User-Token": token },
      });
      const data = await res.json();
      if (data.success) {
        onDeleted?.(prop.id);
        showNotif(ar ? "✅ تم حذف العقار" : "✅ Property deleted");
      } else {
        throw new Error(data.error ?? "فشل الحذف");
      }
    } catch (e: any) {
      console.error("confirmDelete:", e);
      showNotif(e.message, false);
      setShowDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  /* ────────────────────────────────────────── availability */
  const setAvailability = async (newStatus: "available" | "sold") => {
    if (avLoading) return;
    setAvLoading(true);
    try {
      const token = await getValidToken();
      if (!token) throw new Error(ar ? "يجب تسجيل الدخول" : "Login required");
      const res  = await fetch(`${API}/properties/${prop.id}/availability`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ availabilityStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...prop, availabilityStatus: newStatus };
        setProp(updated);
        onUpdated?.(updated);
        showNotif(
          newStatus === "sold"
            ? (ar ? "✅ العقار مُعيَّن كـ «تم البيع»"  : "✅ Marked as Sold")
            : (ar ? "✅ العقار مُعيَّن كـ «متاح»"       : "✅ Marked as Available")
        );
      } else throw new Error(data.error ?? "فشل تحديث الحالة");
    } catch (e: any) {
      console.error("setAvailability:", e);
      showNotif(e.message, false);
    } finally {
      setAvLoading(false);
    }
  };

  /* ────────────────────────────────────────── image upload */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setEditForm((f: any) => ({ ...f, image: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const badge  = approvalBadge(prop.status ?? "active", ar);
  const isSold = prop.availabilityStatus === "sold";

  return (
    <>
      {/* ── Toast */}
      {notif && (
        <div className="fixed top-20 inset-x-0 z-[90] flex justify-center px-4 pointer-events-none">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl pointer-events-auto text-white ${notif.ok ? "bg-green-500" : "bg-red-500"}`}>
            {notif.ok ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
            <span className="font-bold text-sm">{notif.msg}</span>
            <button onClick={() => setNotif(null)} className="ms-1 opacity-80 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ══════════ EDIT MODAL ══════════ */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowEdit(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl my-4"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Edit2 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-primary dark:text-white">{ar ? "تعديل العقار" : "Edit Property"}</h3>
                  <p className="text-xs text-muted-foreground">{ar ? "بعد الحفظ سيُعاد للمراجعة" : "Will be re-reviewed after saving"}</p>
                </div>
              </div>
              <button onClick={() => setShowEdit(false)}
                className="w-9 h-9 rounded-xl bg-muted hover:bg-red-100 hover:text-red-500 transition-colors flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="text-sm font-bold text-primary dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-4 h-4 text-accent" />{ar ? "العنوان *" : "Title *"}
                </label>
                <input value={editForm.title}
                  onChange={e => setEditForm((f: any) => ({ ...f, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-accent focus:outline-none bg-muted/40 dark:bg-slate-700 text-primary dark:text-white transition-colors"
                  placeholder={ar ? "مثال: شقة فاخرة في عمان" : "e.g. Luxury apartment in Amman"} />
              </div>
              {/* Category + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-primary dark:text-slate-200 mb-1.5 block">{ar ? "نوع الإعلان" : "Listing Type"}</label>
                  <select value={editForm.category}
                    onChange={e => setEditForm((f: any) => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-accent focus:outline-none bg-muted/40 dark:bg-slate-700 text-primary dark:text-white">
                    <option value="بيع">{ar ? "بيع" : "For Sale"}</option>
                    <option value="إيجار">{ar ? "إيجار" : "For Rent"}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-primary dark:text-slate-200 mb-1.5 block">{ar ? "نوع العقار" : "Property Type"}</label>
                  <select value={editForm.type}
                    onChange={e => setEditForm((f: any) => ({ ...f, type: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-accent focus:outline-none bg-muted/40 dark:bg-slate-700 text-primary dark:text-white">
                    <option value="">{ar ? "اختر النوع" : "Select type"}</option>
                    {propertyTypes.slice(1).map(tp => <option key={tp.id} value={tp.name}>{tp.name}</option>)}
                  </select>
                </div>
              </div>
              {/* Governorate */}
              <div>
                <label className="text-sm font-bold text-primary dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                  <MapPin className="w-4 h-4 text-accent" />{ar ? "المحافظة" : "Governorate"}
                </label>
                <select value={editForm.governorate}
                  onChange={e => setEditForm((f: any) => ({ ...f, governorate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-accent focus:outline-none bg-muted/40 dark:bg-slate-700 text-primary dark:text-white">
                  <option value="">{ar ? "اختر المحافظة" : "Select governorate"}</option>
                  {governorates.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
              </div>
              {/* Price */}
              <div>
                <label className="text-sm font-bold text-primary dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                  <DollarSign className="w-4 h-4 text-accent" />{ar ? "السعر (د.أ) *" : "Price (JD) *"}
                </label>
                <input type="number" min="0" value={editForm.price}
                  onChange={e => setEditForm((f: any) => ({ ...f, price: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-accent focus:outline-none bg-muted/40 dark:bg-slate-700 text-primary dark:text-white" />
              </div>
              {/* Area + Beds + Baths */}
              <div className="grid grid-cols-3 gap-3">
                {([
                  { key: "area",      Icon: Maximize, label: ar ? "المساحة م²" : "Area sqm" },
                  { key: "bedrooms",  Icon: Bed,      label: ar ? "الغرف"       : "Bedrooms" },
                  { key: "bathrooms", Icon: Bath,     label: ar ? "الحمامات"    : "Baths"    },
                ] as const).map(({ key, Icon, label }) => (
                  <div key={key}>
                    <label className="text-sm font-bold text-primary dark:text-slate-200 flex items-center gap-1 mb-1.5">
                      <Icon className="w-3.5 h-3.5 text-accent" />{label}
                    </label>
                    <input type="number" min="0" value={editForm[key]}
                      onChange={e => setEditForm((f: any) => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-3 rounded-xl border-2 border-border focus:border-accent focus:outline-none bg-muted/40 dark:bg-slate-700 text-primary dark:text-white" />
                  </div>
                ))}
              </div>
              {/* Description */}
              <div>
                <label className="text-sm font-bold text-primary dark:text-slate-200 mb-1.5 block">{ar ? "الوصف" : "Description"}</label>
                <textarea rows={3} value={editForm.description}
                  onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-accent focus:outline-none resize-none bg-muted/40 dark:bg-slate-700 text-primary dark:text-white" />
              </div>
              {/* Image */}
              <div>
                <label className="text-sm font-bold text-primary dark:text-slate-200 mb-1.5 block">{ar ? "الصورة" : "Image"}</label>
                <div className="flex items-start gap-3">
                  {editForm.image && (
                    <div className="relative w-20 h-16 rounded-xl overflow-hidden border-2 border-border shrink-0">
                      <img src={editForm.image} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setEditForm((f: any) => ({ ...f, image: "" }))}
                        className="absolute top-0.5 end-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <label className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 border-2 border-dashed border-border rounded-xl hover:border-accent cursor-pointer bg-muted/30 transition-colors">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{ar ? "رفع صورة جديدة" : "Upload new image"}</span>
                  </label>
                </div>
              </div>
              {editError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-bold">
                  ⚠️ {editError}
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex gap-3 bg-muted/20 dark:bg-slate-700/20 rounded-b-3xl">
              <button onClick={() => setShowEdit(false)}
                className="flex-1 py-3 rounded-xl border-2 border-border font-bold text-muted-foreground hover:bg-muted transition-colors">
                {ar ? "إلغاء" : "Cancel"}
              </button>
              <button onClick={saveEdit} disabled={isSaving}
                className="flex-1 py-3 rounded-xl bg-accent text-white font-bold hover:bg-accent/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ التعديلات" : "Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ DELETE MODAL ══════════ */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => !isDeleting && setShowDelete(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-primary dark:text-white mb-2">{ar ? "تأكيد الحذف" : "Confirm Delete"}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {ar ? "هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء." : "Are you sure? This cannot be undone."}
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2 text-sm font-bold text-red-700 dark:text-red-300 truncate">
                {prop.title}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} disabled={isDeleting}
                className="flex-1 py-3 rounded-xl border-2 border-border font-bold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                {ar ? "إلغاء" : "Cancel"}
              </button>
              <button onClick={confirmDelete} disabled={isDeleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {ar ? "نعم، احذف" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ CARD ══════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 }}
        className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-transparent hover:border-border flex flex-col group"
      >
        {/* ── Image */}
        <div className="relative aspect-video overflow-hidden">
          <img
            src={prop.image || prop.images?.[0] || PLACEHOLDER}
            alt={prop.title}
            onError={e => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isSold ? "grayscale-[30%] opacity-80" : ""}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* SOLD stamp */}
          {isSold && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-slate-900/70 backdrop-blur-[2px] text-white font-black text-xl px-6 py-2 rounded-2xl rotate-[-12deg] shadow-2xl border-2 border-white/20 tracking-widest">
                {ar ? "تم البيع" : "SOLD"}
              </div>
            </div>
          )}

          {/* Top-right badges */}
          <div className="absolute top-3 end-3 flex flex-col items-end gap-1.5">
            <span className={`text-[11px] font-black px-2.5 py-1 rounded-full shadow-md ${badge.cls}`}>
              {badge.txt}
            </span>
            {!isSold && (
              <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                {prop.category === "إيجار" ? (ar ? "إيجار" : "Rent") : (ar ? "بيع" : "Sale")}
              </span>
            )}
          </div>

          {/* Bottom-left: views */}
          <div className="absolute bottom-3 start-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-lg text-xs">
            <Eye className="w-3 h-3" /><span>{prop.views || 0} {ar ? "مشاهدة" : "views"}</span>
          </div>

          {/* Bottom-right: inquiries */}
          {(prop.inquiries || 0) > 0 && (
            <div className="absolute bottom-3 end-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-lg text-xs">
              <MessageCircle className="w-3 h-3" /><span>{prop.inquiries}</span>
            </div>
          )}
        </div>

        {/* ── Content */}
        <div className="p-5 flex flex-col flex-1 gap-3">

          {/* Title + location */}
          <div>
            <h3 className={`font-bold text-lg line-clamp-1 mb-1 group-hover:text-accent transition-colors ${isSold ? "text-muted-foreground" : "text-primary dark:text-slate-100"}`}>
              {prop.title}
            </h3>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate">{prop.governorate}{prop.type ? ` · ${prop.type}` : ""}</span>
            </div>
          </div>

          {/* Price */}
          <div className={`text-2xl font-bold ${isSold ? "text-muted-foreground line-through" : "text-accent"}`}>
            {(prop.price || 0).toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground ms-1.5">
              {ar ? "د.أ" : "JD"}{prop.category === "إيجار" ? (ar ? "/شهر" : "/mo") : ""}
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground border-t border-border pt-3">
            {(prop.bedrooms || 0) > 0 && (
              <span className="flex items-center gap-1"><Bed className="w-4 h-4" />{prop.bedrooms} {ar ? "غرف" : "bed"}</span>
            )}
            {(prop.bathrooms || 0) > 0 && (
              <span className="flex items-center gap-1"><Bath className="w-4 h-4" />{prop.bathrooms}</span>
            )}
            {(prop.area || 0) > 0 && (
              <span className="flex items-center gap-1"><Maximize className="w-4 h-4" />{prop.area} {ar ? "م²" : "sqm"}</span>
            )}
            <span className="ms-auto flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{prop.likesCount || 0}</span>
          </div>

          {/* Rejection reason */}
          {prop.status === "rejected" && (prop.rejectionReason || prop.rejection_reason) && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
              <p className="text-xs font-black text-red-700 dark:text-red-300 mb-0.5">{ar ? "❌ سبب الرفض:" : "❌ Reason:"}</p>
              <p className="text-xs text-red-600 dark:text-red-400">{prop.rejectionReason || prop.rejection_reason}</p>
            </div>
          )}

          {/* Pending notice */}
          {prop.status === "pending" && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {ar ? "قيد المراجعة — سيظهر بعد موافقة الأدمن" : "Under review — will appear after admin approval"}
            </div>
          )}

          {/* ── Availability toggle */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mt-auto">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Tag className="w-3 h-3" />{ar ? "حالة العقار" : "Property Status"}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-black flex items-center gap-1 ${isSold ? "text-slate-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                {isSold ? "🔴" : "🟢"} {isSold ? (ar ? "تم البيع" : "Sold") : (ar ? "متاح" : "Available")}
              </span>
              {avLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <div className="flex gap-1.5">
                  <button type="button" disabled={!isSold} onClick={() => setAvailability("available")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${!isSold ? "bg-emerald-500 text-white border-emerald-500" : "border-emerald-400 text-emerald-600 dark:text-emerald-400 dark:border-emerald-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-500"}`}>
                    <ToggleLeft className="w-3.5 h-3.5" />{ar ? "متاح" : "Available"}
                  </button>
                  <button type="button" disabled={isSold} onClick={() => setAvailability("sold")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isSold ? "bg-slate-500 text-white border-slate-500" : "border-slate-400 text-slate-600 dark:text-slate-400 dark:border-slate-600 hover:bg-slate-500 hover:text-white hover:border-slate-500"}`}>
                    <ToggleRight className="w-3.5 h-3.5" />{ar ? "تم البيع" : "Sold"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            {(prop.status === "approved" || prop.status === "active") && (
              <Link to={`/property/${prop.id}`}
                className="flex items-center gap-1.5 px-3 py-2 bg-muted dark:bg-slate-700 text-foreground dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-muted/80 transition-colors shrink-0">
                <Eye className="w-4 h-4" />{ar ? "عرض" : "View"}
              </Link>
            )}
            <button type="button" onClick={openEdit}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800">
              <Edit2 className="w-4 h-4" />
              {prop.status === "rejected" ? (ar ? "تعديل وإعادة تقديم" : "Edit & Resubmit") : (ar ? "تعديل" : "Edit")}
            </button>
            <button type="button" onClick={() => setShowDelete(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800 shrink-0">
              <Trash2 className="w-4 h-4" />{ar ? "حذف" : "Delete"}
            </button>
          </div>

        </div>
      </motion.div>
    </>
  );
}
