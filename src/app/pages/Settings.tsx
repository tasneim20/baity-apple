import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Settings as SettingsIcon, Sun, Moon, Languages, User, Mail,
  Phone, Lock, Save, CheckCircle, AlertCircle, Eye, EyeOff,
  LogIn, Loader2, ChevronRight,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useApp, getValidToken } from "../context/AppContext";
import { useNavigate } from "react-router";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

// ─── API Helper ────────────────────────────────────────────────────────────
async function apiRequest(
  method: string,
  path: string,
  body?: any,
  userToken?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicAnonKey}`,
    };
    if (userToken) headers["X-User-Token"] = userToken;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b${path}`,
      { method, headers, body: body ? JSON.stringify(body) : undefined }
    );
    const data = await res.json();
    return data;
  } catch (e: any) {
    console.error("API error:", e.message);
    return { success: false, error: e.message };
  }
}

// ─── Toast notification helper ─────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const show = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };
  return { toast, show };
}

// ─── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card dark:bg-[#1A2332] rounded-2xl p-6 shadow-sm border border-border dark:border-[#A0A8B8]/30"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#F5A623] flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#FFFFFF]" />
        </div>
        <h2 className="text-lg font-bold text-primary dark:text-[#E8EBF0]">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.div>
  );
}

// ─── Toggle row ─────────────────────────────────────────────────────────────
function ToggleRow({
  label, description, checked, onChange,
}: { label: string; description?: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium text-primary">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
          checked ? "bg-[#F5A623]" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-6 rtl:-translate-x-6" : "translate-x-1 rtl:-translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Editable field ─────────────────────────────────────────────────────────
function EditableField({
  label,
  value,
  onChange,
  onSave,
  saving,
  type = "text",
  placeholder,
  prefix,
  maxLength,
  inputMode,
  pattern,
  note,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  type?: string;
  placeholder?: string;
  prefix?: React.ReactNode;
  maxLength?: number;
  inputMode?: any;
  pattern?: string;
  note?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label className="block text-sm font-semibold text-primary mb-1.5">{label}</label>
      {note && <p className="text-xs text-muted-foreground mb-2">{note}</p>}
      <div className="flex gap-2">
        <div className={`flex-1 flex items-center rounded-xl border-2 overflow-hidden transition-colors ${
          focused ? "border-[#F5A623]" : "border-border"
        }`}>
          {prefix && (
            <div className="px-4 py-3 bg-[#F5A623] shrink-0 select-none flex items-center justify-center">
              {prefix}
            </div>
          )}
          <input
            type={type}
            value={value}
            onChange={(e) => {
              const v = maxLength ? e.target.value.slice(0, maxLength) : e.target.value;
              onChange(v);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            maxLength={maxLength}
            inputMode={inputMode}
            pattern={pattern}
            dir={type === "email" || type === "tel" ? "ltr" : undefined}
            className="flex-1 px-4 py-3 bg-transparent outline-none text-primary text-sm"
          />
        </div>
        <button
          onClick={onSave}
          disabled={saving || !value.trim()}
          className="flex items-center gap-2 px-4 py-3 bg-[#F5A623] text-[#FFFFFF] rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#D4901E] transition-colors shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Password field ─────────────────────────────────────────────────────────
function PasswordField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-semibold text-primary mb-1.5">{label}</label>
      <div className="flex items-center rounded-xl border-2 border-border focus-within:border-[#F5A623] overflow-hidden transition-colors">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir="ltr"
          className="flex-1 px-4 py-3 bg-transparent outline-none text-primary text-sm"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="px-3 py-3 text-muted-foreground hover:text-primary transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main Settings Page ─────────────────────────────────────────────────────
export default function SettingsPage() {
  const navigate = useNavigate();
  const {
    language, setLanguage,
    theme, setTheme,
    user, setUser,
    isAuthenticated,
  } = useApp();
  const ar = language === "ar";
  const { toast, show: showToast } = useToast();

  // Profile state
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(""); // 9 digits only
  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Load real profile from server
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const token = await getValidToken();
      if (!token) return;
      const res = await apiRequest("GET", "/user/profile", undefined, token);
      if (res.success && res.data) {
        setName(res.data.name || "");
        setEmail(res.data.email || "");
        // Strip +962 prefix for display if present
        const rawPhone = res.data.phone || "";
        const digits = rawPhone.replace(/^\+962/, "").replace(/\D/g, "");
        setPhone(digits);
      }
    })();
  }, [isAuthenticated]);

  // ── Save name ────────────────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!name.trim() || name.trim().length < 2) {
      showToast(ar ? "الاسم يجب أن يكون حرفين على الأقل" : "Name must be at least 2 characters", "error");
      return;
    }
    setSavingName(true);
    const token = await getValidToken();
    const res = await apiRequest("PUT", "/user/profile", { name: name.trim() }, token || undefined);
    setSavingName(false);
    if (res.success) {
      if (user) setUser({ ...user, name: res.data?.name || name.trim() });
      showToast(ar ? "تم تحديث الاسم بنجاح ✓" : "Name updated successfully ✓");
    } else {
      showToast(res.error || (ar ? "فشل تحديث الاسم" : "Failed to update name"), "error");
    }
  };

  // ── Save email ───────────────────────────────────────────────────────────
  const handleSaveEmail = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast(ar ? "البريد الإلكتروني غير صالح" : "Invalid email address", "error");
      return;
    }
    setSavingEmail(true);
    const token = await getValidToken();
    const res = await apiRequest("PUT", "/user/email", { email: email.trim().toLowerCase() }, token || undefined);
    setSavingEmail(false);
    if (res.success) {
      if (user) setUser({ ...user, email: res.data?.email || email.trim() });
      showToast(ar ? "تم تحديث البريد الإلكتروني بنجاح ✓" : "Email updated successfully ✓");
    } else {
      showToast(res.error || (ar ? "فشل تحديث البريد الإلكتروني" : "Failed to update email"), "error");
    }
  };

  // ── Save phone ───────────────────────────────────────────────────────────
  const handleSavePhone = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 9) {
      showToast(ar ? "رقم الهاتف يجب أن يكون 9 أرقام" : "Phone must be exactly 9 digits", "error");
      return;
    }
    setSavingPhone(true);
    const token = await getValidToken();
    const fullPhone = "+962" + digits;
    const res = await apiRequest("PUT", "/user/profile", { phone: fullPhone }, token || undefined);
    setSavingPhone(false);
    if (res.success) {
      showToast(ar ? "تم تحديث رقم الهاتف بنجاح ✓" : "Phone updated successfully ✓");
    } else {
      showToast(res.error || (ar ? "فشل تحديث رقم الهاتف" : "Failed to update phone"), "error");
    }
  };

  // ── Save password ────────────────────────────────────────────────────────
  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      showToast(ar ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(ar ? "كلمتا المرور غير متطابقتين" : "Passwords do not match", "error");
      return;
    }
    setSavingPassword(true);
    const token = await getValidToken();
    const res = await apiRequest("PUT", "/user/password", { newPassword }, token || undefined);
    setSavingPassword(false);
    if (res.success) {
      setNewPassword("");
      setConfirmPassword("");
      showToast(ar ? "تم تغيير كلمة المرور بنجاح ✓" : "Password changed successfully ✓");
    } else {
      showToast(res.error || (ar ? "فشل تغيير كلمة المرور" : "Failed to change password"), "error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-slate-900">
      <Navbar />

      <div className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <button onClick={() => navigate("/")} className="hover:text-[#F5A623] transition-colors">
                {ar ? "الرئيسية" : "Home"}
              </button>
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              <span className="text-primary font-medium">{ar ? "الإعدادات" : "Settings"}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F5A623] flex items-center justify-center shadow-lg">
                <SettingsIcon className="w-7 h-7 text-[#FFFFFF]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary">{ar ? "الإعدادات" : "Settings"}</h1>
                <p className="text-muted-foreground text-sm">
                  {ar ? "إدارة تفضيلاتك وبيانات حسابك" : "Manage your preferences and account information"}
                </p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-6">

            {/* ── General Settings ──────────────────────────────────────────── */}
            <Section title={ar ? "الإعدادات العامة" : "General Settings"} icon={SettingsIcon}>
              <ToggleRow
                label={ar ? "الوضع الليلي" : "Dark Mode"}
                description={ar ? "تبديل بين المظهر الفاتح والداكن" : "Switch between light and dark appearance"}
                checked={theme === "dark"}
                onChange={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
              <div className="border-t border-border pt-4">
                <p className="font-medium text-primary mb-3">{ar ? "اللغة" : "Language"}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "ar", label: "العربية", flag: "🇯🇴" },
                    { value: "en", label: "English", flag: "🇬🇧" },
                  ].map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => setLanguage(lang.value as "ar" | "en")}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all font-medium ${
                        language === lang.value
                          ? "border-[#F5A623] bg-[#F5A623]/10 text-[#F5A623]"
                          : "border-border hover:border-[#F5A623]/50 text-muted-foreground"
                      }`}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <span>{lang.label}</span>
                      {language === lang.value && (
                        <CheckCircle className="w-4 h-4 ms-auto text-[#F5A623]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            {/* ── Account Settings ──────────────────────────────────────────── */}
            {isAuthenticated ? (
              <Section title={ar ? "إعدادات الحساب" : "Account Settings"} icon={User}>

                {/* Name */}
                <EditableField
                  label={ar ? "الاسم الكامل" : "Full Name"}
                  value={name}
                  onChange={setName}
                  onSave={handleSaveName}
                  saving={savingName}
                  placeholder={ar ? "أدخل اسمك الكامل" : "Enter your full name"}
                  prefix={<User className="w-5 h-5 text-[#FFFFFF]" />}
                  maxLength={100}
                />

                {/* Email */}
                <EditableField
                  label={ar ? "البريد الإلكتروني" : "Email Address"}
                  value={email}
                  onChange={setEmail}
                  onSave={handleSaveEmail}
                  saving={savingEmail}
                  type="email"
                  placeholder={ar ? "example@email.com" : "example@email.com"}
                  prefix={<Mail className="w-5 h-5 text-[#FFFFFF]" />}
                  note={ar
                    ? "سيتم تحديث بريدك الإلكتروني مباشرة في قاعدة البيانات"
                    : "Your email will be updated directly in the database"}
                />

                {/* Phone with +962 prefix */}
                <div>
                  <label className="block text-sm font-semibold text-primary mb-1.5">
                    {ar ? "رقم الهاتف" : "Phone Number"}
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center rounded-xl border-2 border-border focus-within:border-[#F5A623] overflow-hidden transition-colors">
                      <div className="flex items-center gap-2 px-4 py-3 bg-[#F5A623] shrink-0 select-none text-[#FFFFFF]">
                        <span className="text-lg">🇯🇴</span>
                        <span className="font-bold text-sm" dir="ltr">+962</span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
                          setPhone(digits);
                        }}
                        placeholder="7XXXXXXXX"
                        dir="ltr"
                        maxLength={9}
                        className="flex-1 px-4 py-3 bg-transparent outline-none text-primary text-sm tracking-widest"
                      />
                      <span className={`px-3 text-xs font-bold shrink-0 ${phone.length === 9 ? "text-green-500" : "text-muted-foreground"}`}>
                        {phone.length}/9
                      </span>
                    </div>
                    <button
                      onClick={handleSavePhone}
                      disabled={savingPhone || phone.length !== 9}
                      className="flex items-center gap-2 px-4 py-3 bg-[#F5A623] text-[#FFFFFF] rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#D4901E] transition-colors shrink-0"
                    >
                      {savingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                  </div>
                  {phone.length === 9 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-mono">
                      ✓ +962 {phone}
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-border pt-6 mt-2">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[#F5A623] flex items-center justify-center">
                      <Lock className="w-5 h-5 text-[#FFFFFF]" />
                    </div>
                    <h3 className="text-lg font-bold text-primary dark:text-[#E8EBF0]">{ar ? "تغيير كلمة المرور" : "Change Password"}</h3>
                  </div>
                  <div className="space-y-3">
                    <PasswordField
                      label={ar ? "كلمة المرور الجديدة" : "New Password"}
                      value={newPassword}
                      onChange={setNewPassword}
                      placeholder={ar ? "6 أحرف على الأقل" : "At least 6 characters"}
                    />
                    <PasswordField
                      label={ar ? "تأكيد كلمة المرور" : "Confirm Password"}
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder={ar ? "أعد إدخال كلمة المرور" : "Re-enter password"}
                    />
                    <button
                      onClick={handleSavePassword}
                      disabled={savingPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-[#F5A623] text-[#FFFFFF] rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md hover:shadow-[#F5A623]/30 transition-all"
                    >
                      {savingPassword ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />{ar ? "جاري الحفظ..." : "Saving..."}</>
                      ) : (
                        <><Lock className="w-4 h-4" />{ar ? "تغيير كلمة المرور" : "Change Password"}</>
                      )}
                    </button>
                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {ar ? "كلمتا المرور غير متطابقتين" : "Passwords do not match"}
                      </p>
                    )}
                    {newPassword.length > 0 && newPassword.length < 6 && (
                      <p className="text-xs text-amber-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {ar ? "كلمة المرور قصيرة جداً (6 أحرف على الأقل)" : "Password too short (min 6 characters)"}
                      </p>
                    )}
                  </div>
                </div>
              </Section>
            ) : (
              /* Not logged in */
              <Section title={ar ? "إعدادات الحساب" : "Account Settings"} icon={User}>
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-[#F5A623] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#F5A623]/20">
                    <LogIn className="w-8 h-8 text-[#FFFFFF]" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {ar ? "يجب تسجيل الدخول لتعديل بيانات حسابك" : "Please login to edit your account information"}
                  </p>
                  <button
                    onClick={() => navigate("/auth")}
                    className="px-6 py-3 bg-[#F5A623] text-[#FFFFFF] rounded-xl font-bold hover:bg-[#D4901E] transition-colors"
                  >
                    {ar ? "تسجيل الدخول" : "Login"}
                  </button>
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 60, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 60, x: "-50%" }}
            className={`fixed bottom-8 left-1/2 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border font-medium text-sm ${
              toast.type === "success"
                ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300"
                : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300"
            }`}
          >
            {toast.type === "success"
              ? <CheckCircle className="w-5 h-5 shrink-0" />
              : <AlertCircle className="w-5 h-5 shrink-0" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
