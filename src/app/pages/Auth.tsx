import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Home, Mail, Lock, User, Eye, EyeOff,
  ArrowLeft, ArrowRight, Shield, MapPin,
  CheckCircle, Building2, Loader2, AlertCircle,
  KeyRound, Send, TimerIcon,
} from "lucide-react";
import { useApp, supabase } from "../context/AppContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

// Jordanian geometric SVG pattern
function GeoBg() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="auth-geo" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <polygon points="40,6 45,24 63,24 49,35 54,53 40,42 26,53 31,35 17,24 35,24" fill="none" stroke="#2A3348" strokeWidth="1" />
          <circle cx="40" cy="40" r="30" fill="none" stroke="#2A3348" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#auth-geo)" />
    </svg>
  );
}

const perks = [
  { icon: Building2, ar: "آلاف العقارات في كل الأردن",   en: "Thousands of properties across Jordan" },
  { icon: Shield,    ar: "عقارات موثّقة ومفحوصة",         en: "Verified & inspected properties" },
  { icon: MapPin,    ar: "خرائط تفاعلية لكل المحافظات",  en: "Interactive maps for all governorates" },
];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const MAX_FAILED = 3;
const LOCKOUT_SECONDS = 30;

export default function Auth() {
  const navigate = useNavigate();
  const { setUser, language } = useApp();
  const ar = language === "ar";

  // Set page title
  useEffect(() => {
    document.title = ar ? "بيتي - تسجيل الدخول" : "Baity - Login";
  }, [ar]);

  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [focused, setFocused] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Failed attempts
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(0);

  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const left = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (left <= 0) {
        setLockoutUntil(null);
        setLockoutSecondsLeft(0);
        clearInterval(interval);
      } else {
        setLockoutSecondsLeft(left);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // ── Validation ──────────────────────────────────────────────────────────
  const validateRegister = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) {
      errs.name = ar ? "الاسم الكامل مطلوب" : "Full name is required";
    }
    if (!formData.email.trim()) {
      errs.email = ar ? "البريد الإلكتروني مطلوب" : "Email is required";
    } else if (!isValidEmail(formData.email)) {
      errs.email = ar ? "البريد الإلكتروني غير صحيح" : "Invalid email address";
    }
    if (!formData.password) {
      errs.password = ar ? "كلمة المرور مطلوبة" : "Password is required";
    } else if (formData.password.length < 6) {
      errs.password = ar ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters";
    }
    return errs;
  };

  const validateLogin = () => {
    const errs: Record<string, string> = {};
    if (!formData.email.trim()) errs.email = ar ? "البريد الإلكتروني مطلوب" : "Email is required";
    if (!formData.password) errs.password = ar ? "كلمة المرور مطلوبة" : "Password is required";
    return errs;
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSuccess(false);

    if (lockoutUntil && Date.now() < lockoutUntil) {
      setError(ar ? `الرجاء الانتظار ${lockoutSecondsLeft} ثانية` : `Please wait ${lockoutSecondsLeft} seconds`);
      return;
    }

    const errs = mode === "register" ? validateRegister() : validateLogin();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setIsLoading(true);

    try {
      if (mode === "register") {
        const email = formData.email.trim().toLowerCase();
        const password = formData.password;
        const name = formData.name.trim();

        // منع تسجيل حساب بإيميل الأدمن
        if (email === "admin@baity.com") {
          setError(ar
            ? "هذا البريد الإلكتروني محجوز للإدارة فقط"
            : "This email is reserved for administration only");
          setIsLoading(false);
          return;
        }

        // ── المحاولة الأولى: Edge Function (تُنشئ حساباً مؤكداً وتُعيد جلسة مباشرة)
        let accountCreated = false;
        try {
          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-26c70f3b/signup`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${publicAnonKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ name, email, password }),
            }
          );
          const data = await res.json();
          if (data.success) {
            accountCreated = true;

            // ✅ الحالة المثلى: الدالة أعادت جلسة جاهزة — نستخدمها مباشرةً
            if (data.session?.access_token && data.session?.refresh_token) {
              const { error: setErr } = await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              });
              if (!setErr) {
                const { data: { user: sessionUser } } = await supabase.auth.getUser();
                setUser({
                  ...(sessionUser ?? {}),
                  name: data.data?.name || name,
                  email: data.data?.email || email,
                  user_metadata: { name: data.data?.name || name },
                });
                setIsLoading(false);
                navigate("/dashboard");
                return;
              }
            }
          } else {
            const msg = (data.error || "").toLowerCase();
            if (
              msg.includes("already") || msg.includes("exists") ||
              msg.includes("مسجّل") || msg.includes("مسجل") ||
              res.status === 409
            ) {
              setError(ar ? "هذا البريد مسجل مسبقاً" : "This email is already registered");
              setIsLoading(false);
              return;
            }
            // خطأ آخر من Edge Function → نجرب signUp مباشرةً
          }
        } catch {
          // Edge Function غير متاحة → نجرب signUp مباشرةً
        }

        // ── المحاولة الثانية: signUp مباشر (fallback)
        if (!accountCreated) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
          });
          if (signUpError) {
            const msg = signUpError.message.toLowerCase();
            if (msg.includes("already") || msg.includes("registered")) {
              setError(ar ? "هذا البريد مسجل مسبقاً" : "This email is already registered");
            } else if (msg.includes("password")) {
              setError(ar ? "كلمة المرور ضعيفة جداً، استخدم 6 أحرف على الأقل" : "Password is too weak, use at least 6 characters");
            } else {
              setError(ar ? "تعذر إنشاء الحساب. يرجى المحاولة مجدداً." : "Failed to create account. Please try again.");
            }
            setIsLoading(false);
            return;
          }

          // ✅ إذا أعاد signUp جلسة مباشرة (التأكيد التلقائي مفعّل في Supabase)
          if (signUpData?.session?.access_token) {
            setUser({
              ...signUpData.session.user,
              name: signUpData.session.user.user_metadata?.name || name,
              email: signUpData.session.user.email,
            });
            setIsLoading(false);
            navigate("/dashboard");
            return;
          }

          accountCreated = !!signUpData?.user;
        }

        // ── تسجيل الدخول التلقائي بعد إنشاء الحساب (مع انتظار قصير)
        if (accountCreated) {
          await new Promise(r => setTimeout(r, 800));
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (!signInError && signInData.session?.user) {
            // ✅ دخول تلقائي ناجح
            setUser({
              ...signInData.session.user,
              name: signInData.session.user.user_metadata?.name || name,
              email: signInData.session.user.email,
            });
            navigate("/dashboard");
          } else {
            // الحساب مُنشأ لكن الدخول التلقائي لم ينجح → انتقل لتسجيل الدخول
            setIsSuccess(true);
            setError(ar ? "تم إنشاء الحساب بنجاح! سجّل دخولك الآن." : "Account created! Please sign in.");
            setMode("login");
          }
        }

      } else {
        // ── تسجيل الدخول
        const email = formData.email.trim().toLowerCase();

        // منع حساب الأدمن من تسجيل الدخول هنا
        if (email === "admin@baity.com") {
          setError(ar
            ? "هذا الحساب غير مسموح له الدخول من هنا. يرجى استخدام صفحة تسجيل دخول الأدمن."
            : "This account is not allowed to login here. Please use the admin login page.");
          setIsLoading(false);
          return;
        }

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: formData.password,
        });
        if (signInError) {
          const msg = signInError.message.toLowerCase();
          const newFailed = failedAttempts + 1;
          setFailedAttempts(newFailed);
          if (newFailed >= MAX_FAILED) {
            setLockoutUntil(Date.now() + LOCKOUT_SECONDS * 1000);
            setLockoutSecondsLeft(LOCKOUT_SECONDS);
            setError(
              ar
                ? `تم تجاوز الحد المسموح للمحاولات. يرجى الانتظار ${LOCKOUT_SECONDS} ثانية.`
                : `Too many failed attempts. Please wait ${LOCKOUT_SECONDS} seconds.`
            );
          } else if (msg.includes("email not confirmed")) {
            // البريد غير مؤكد — نحاول تأكيده تلقائياً عبر Edge Function
            setError(ar ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Incorrect email or password");
          } else if (
            msg.includes("invalid") || msg.includes("credentials") ||
            msg.includes("wrong") || msg.includes("not found")
          ) {
            setError(ar ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Incorrect email or password");
          } else {
            setError(ar ? "حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مجدداً." : "Login error. Please try again.");
          }
          setIsLoading(false);
          return;
        }
        setFailedAttempts(0);
        setLockoutUntil(null);
        if (data.session?.user) {
          setUser({
            ...data.session.user,
            name: data.session.user.user_metadata?.name || data.session.user.email?.split("@")[0],
            email: data.session.user.email,
          });
        }
        navigate("/dashboard");
      }
    } catch {
      setError(ar ? "حدث خطأ. يرجى المحاولة مجدداً." : "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Forgot Password ─────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!forgotEmail.trim()) {
      setError(ar ? "يرجى إدخال بريدك الإلكتروني" : "Please enter your email");
      return;
    }
    if (!isValidEmail(forgotEmail)) {
      setError(ar ? "البريد الإلكتروني غير صحيح" : "Invalid email address");
      return;
    }
    setIsLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        forgotEmail.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (resetError) throw resetError;
      setForgotSent(true);
    } catch {
      setError(
        ar
          ? "تعذر إرسال رابط الاسترجاع. يرجى المحاولة مجدداً."
          : "Failed to send reset link. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full py-2.5 ps-11 pe-4 bg-muted dark:bg-[#1A2035] dark:border-[#2A3348] dark:text-[#FFFFFF] rounded-xl border-2 transition-all text-sm outline-none placeholder:text-muted-foreground dark:placeholder:text-[#8892A4] ${
      fieldErrors[field]
        ? "border-red-400 bg-red-50 dark:bg-red-900/10"
        : focused === field
        ? "border-[#F5A623]"
        : "border-transparent"
    }`;

  const switchMode = (newMode: typeof mode) => {
    setMode(newMode);
    setError("");
    setIsSuccess(false);
    setFieldErrors({});
    setForgotSent(false);
  };

  return (
    <div className="h-screen flex items-stretch overflow-hidden">
      {/* ── Side panel ── */}
      <motion.div
        initial={{ opacity: 0, x: ar ? 60 : -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 bg-gradient-to-br from-[#131929] via-[#131929] to-[#1A2A4A] relative overflow-hidden p-12"
      >
        <GeoBg />
        <div className="absolute top-0 start-0 h-full w-1.5 flex flex-col">
          <div className="flex-1 bg-black" />
          <div className="flex-1 bg-white/30" />
          <div className="flex-1 bg-[#007A3D]" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-xl">
              <Home className="w-8 h-8 text-white" />
            </div>
            <div>
              <span className="text-3xl font-bold text-white block leading-none">{ar ? "بيتي" : "Baity"}</span>
              <span className="text-white/50 text-xs">baity.jo</span>
            </div>
          </div>
          <p className="text-[#C8D0E0] text-sm mt-5 leading-relaxed">
            {ar ? "منصتك العقارية الموثوقة في المملكة الأردنية الهاشمية" : "Your trusted real estate platform in the Hashemite Kingdom of Jordan"}
          </p>
        </div>
        <div className="relative z-10 space-y-4">
          {perks.map(({ icon: Icon, ar: arText, en }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: ar ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.12 }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-white/80 text-sm">{ar ? arText : en}</span>
            </motion.div>
          ))}
        </div>
        <div className="relative z-10 flex items-center gap-2 text-white/40 text-xs">
          <MapPin className="w-3.5 h-3.5" />
          <span>{ar ? "عمّان، الأردن" : "Amman, Jordan"}</span>
          <div className="flex gap-0.5 ms-auto">
            {["bg-black", "bg-white/40", "bg-[#007A3D]", "bg-[#CE1126]"].map((c, i) => (
              <span key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Main form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/20 dark:from-[#0D1117] dark:via-[#0D1117] dark:to-[#0D1117] p-4 relative overflow-y-auto">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 60, 0] }}
          transition={{ duration: 22, repeat: Infinity }}
          className="absolute -top-32 end-0 -translate-x-32 w-80 h-80 bg-[#F5A623]/5 rounded-full pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], rotate: [0, -60, 0] }}
          transition={{ duration: 18, repeat: Infinity }}
          className="absolute -bottom-32 start-0 translate-x-32 w-80 h-80 bg-primary/5 rounded-full pointer-events-none"
        />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45 }}
          className="relative z-10 w-full max-w-[420px] my-auto"
        >
          <div className="bg-card dark:bg-[#131929] border border-border dark:border-[#2A3348] rounded-3xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-br from-[#131929] to-[#1A2A4A] p-4 text-[#FFFFFF] text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-15">
                <svg width="100%" height="100%">
                  <defs>
                    <pattern id="hdr-pat" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                      <polygon points="20,2 23,13 34,13 25,19 28,30 20,24 12,30 15,19 6,13 17,13" fill="none" stroke="#FFFFFF" strokeWidth="0.7" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#hdr-pat)" />
                </svg>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-2 border border-white/25 shadow-lg relative z-10"
              >
                <Home className="w-5 h-5" />
              </motion.div>
              <h1 className="text-xl font-bold relative z-10 text-[#FFFFFF]">{ar ? "بيتي" : "Baity"}</h1>
              <p className="text-[#C8D0E0] text-xs mt-1 relative z-10">
                {ar ? "منصتك العقارية الموثوقة" : "Your Trusted Real Estate Platform"}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {/* ── FORGOT PASSWORD ── */}
              {mode === "forgot" ? (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="px-6 py-4 space-y-3"
                >
                  {forgotSent ? (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-9 h-9 text-green-500" />
                      </div>
                      <p className="font-bold text-primary dark:text-[#FFFFFF] mb-2">{ar ? "تم إرسال رابط الاسترجاع!" : "Reset link sent!"}</p>
                      <p className="text-sm text-muted-foreground dark:text-[#8892A4] mb-4">
                        {ar ? `تحقق من بريدك (${forgotEmail})` : `Check your inbox (${forgotEmail})`}
                      </p>
                      <button onClick={() => switchMode("login")} className="text-[#F5A623] dark:text-[#F5A623] text-sm hover:underline">
                        {ar ? "العودة لتسجيل الدخول" : "Back to sign in"}
                      </button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="text-center mb-2">
                        <div className="w-12 h-12 bg-[#F5A623]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <KeyRound className="w-6 h-6 text-[#F5A623]" />
                        </div>
                        <p className="font-bold text-primary dark:text-[#FFFFFF]">{ar ? "استرجاع كلمة المرور" : "Reset Password"}</p>
                        <p className="text-sm text-muted-foreground dark:text-[#8892A4] mt-1">
                          {ar ? "أدخل بريدك وسنرسل رابط الاسترجاع" : "Enter your email for a reset link"}
                        </p>
                      </div>
                      {error && (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl px-4 py-2.5 text-sm">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-bold text-primary dark:text-[#C8D0E0] mb-1.5">
                          {ar ? "البريد الإلكتروني" : "Email Address"}
                        </label>
                        <div className="relative">
                          <Mail className="absolute top-1/2 -translate-y-1/2 start-3.5 w-4 h-4 text-muted-foreground dark:text-[#8892A4]" />
                          <input
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="example@baity.jo"
                            className="w-full py-2.5 ps-11 pe-4 bg-muted dark:bg-[#1A2035] dark:text-[#FFFFFF] rounded-xl border-2 border-transparent dark:border-[#2A3348] focus:border-[#F5A623] transition-all text-sm outline-none dark:placeholder:text-[#8892A4]"
                            required
                          />
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        type="submit" disabled={isLoading}
                        className="w-full bg-gradient-to-r from-primary to-accent-blue text-white py-2.5 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" />{ar ? "إرسال الرابط" : "Send Link"}</>}
                      </motion.button>
                      <button type="button" onClick={() => switchMode("login")} className="w-full text-center text-sm text-muted-foreground dark:text-[#8892A4] hover:text-primary dark:hover:text-[#F5A623] transition-colors">
                        {ar ? "العودة لتسجيل الدخول" : "Back to sign in"}
                      </button>
                    </form>
                  )}
                </motion.div>
              ) : (
                /* ── LOGIN / REGISTER ── */
                <motion.div key="auth-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                  {/* Tabs */}
                  <div className="flex p-1 mx-6 mt-3 mb-1 bg-muted dark:bg-[#0D1117] border border-transparent dark:border-[#2A3348] rounded-xl">
                    {(["login", "register"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => switchMode(m)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                          mode === m
                            ? "bg-white dark:bg-[#2C3347] shadow-sm text-primary dark:text-[#FFFFFF] border border-transparent dark:border-transparent"
                            : "text-muted-foreground hover:text-foreground dark:text-[#8892A4] dark:hover:text-[#FFFFFF]"
                        }`}
                      >
                        {m === "login" ? (ar ? "تسجيل الدخول" : "Sign In") : (ar ? "حساب جديد" : "Register")}
                      </button>
                    ))}
                  </div>

                  <p className="text-center text-xs text-muted-foreground dark:text-[#8892A4] px-6 mb-2">
                    {mode === "login"
                      ? (ar ? "أهلاً بعودتك، سجّل دخولك للمتابعة" : "Welcome back! Sign in to continue")
                      : (ar ? "انضم إلينا وابدأ رحلتك العقارية" : "Join us and start your real estate journey")}
                  </p>

                  {/* Error / Success banner */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mx-6 mb-2"
                      >
                        <div className={`flex items-start gap-2 rounded-xl px-4 py-2.5 text-sm border ${
                          isSuccess
                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 text-green-700 dark:text-green-400"
                            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                        }`}>
                          {isSuccess
                            ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            : lockoutUntil
                            ? <TimerIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          }
                          <span>{error}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Lockout countdown */}
                  {lockoutUntil && (
                    <div className="mx-6 mb-2">
                      <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl px-4 py-2 text-xs">
                        <TimerIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{ar ? `يرجى الانتظار ${lockoutSecondsLeft} ثانية` : `Please wait ${lockoutSecondsLeft}s`}</span>
                        <div className="flex-1 h-1.5 bg-orange-100 rounded-full overflow-hidden ms-1">
                          <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${(lockoutSecondsLeft / LOCKOUT_SECONDS) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Failed attempts */}
                  {mode === "login" && failedAttempts > 0 && failedAttempts < MAX_FAILED && !lockoutUntil && (
                    <div className="mx-6 mb-2">
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-2 text-xs">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                          {ar
                            ? `محاولة ${failedAttempts} من ${MAX_FAILED}`
                            : `Attempt ${failedAttempts}/${MAX_FAILED}`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Form */}
                  <AnimatePresence mode="wait">
                    <motion.form
                      key={mode}
                      initial={{ opacity: 0, x: mode === "login" ? -16 : 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: mode === "login" ? 16 : -16 }}
                      transition={{ duration: 0.25 }}
                      onSubmit={handleSubmit}
                      className="px-6 pb-3 space-y-3"
                      noValidate
                    >
                      {/* Name (register only) */}
                      <AnimatePresence>
                        {mode === "register" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <label className="block text-sm font-bold text-primary dark:text-[#C8D0E0] mb-1">
                              {ar ? "الاسم الكامل" : "Full Name"} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <User className="absolute top-1/2 -translate-y-1/2 start-3.5 w-4 h-4 text-muted-foreground dark:text-[#8892A4]" />
                              <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: "" }); }}
                                onFocus={() => setFocused("name")}
                                onBlur={() => setFocused(null)}
                                placeholder={ar ? "أدخل اسمك الكامل" : "Enter your full name"}
                                className={inputClass("name")}
                              />
                            </div>
                            {fieldErrors.name && (
                              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {fieldErrors.name}
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-bold text-primary dark:text-[#C8D0E0] mb-1">
                          {ar ? "البريد الإلكتروني" : "Email Address"} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="absolute top-1/2 -translate-y-1/2 start-3.5 w-4 h-4 text-muted-foreground dark:text-[#8892A4]" />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" }); }}
                            onFocus={() => setFocused("email")}
                            onBlur={() => setFocused(null)}
                            placeholder="example@baity.jo"
                            className={inputClass("email")}
                          />
                        </div>
                        {fieldErrors.email && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {fieldErrors.email}
                          </p>
                        )}
                      </div>

                      {/* Password */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-bold text-primary dark:text-[#C8D0E0]">
                            {ar ? "كلمة المرور" : "Password"} <span className="text-red-500">*</span>
                          </label>
                          {mode === "login" && (
                            <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-[#F5A623] dark:text-[#F5A623] hover:underline">
                              {ar ? "نسيت كلمة المرور؟" : "Forgot password?"}
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <Lock className="absolute top-1/2 -translate-y-1/2 start-3.5 w-4 h-4 text-muted-foreground dark:text-[#8892A4]" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => { setFormData({ ...formData, password: e.target.value }); if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: "" }); }}
                            onFocus={() => setFocused("password")}
                            onBlur={() => setFocused(null)}
                            placeholder="••••••••"
                            className={`${inputClass("password")} pe-10`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute top-1/2 -translate-y-1/2 end-3.5 text-muted-foreground dark:text-[#8892A4] hover:text-primary dark:hover:text-[#FFFFFF] transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {fieldErrors.password && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {fieldErrors.password}
                          </p>
                        )}
                        {mode === "register" && !fieldErrors.password && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {ar ? "على الأقل 6 أحرف" : "At least 6 characters"}
                          </p>
                        )}
                      </div>

                      {/* Submit */}
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isLoading || !!lockoutUntil}
                        className="w-full bg-gradient-to-r from-primary to-[#F5A623] text-white py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-[#F5A623]/40 hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />{ar ? "جاري المعالجة..." : "Processing..."}</>
                        ) : (
                          <>
                            {mode === "login" ? (ar ? "تسجيل الدخول" : "Sign In") : (ar ? "إنشاء الحساب" : "Create Account")}
                            {ar ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                          </>
                        )}
                      </motion.button>

                      {/* Login perks */}
                      {mode === "login" && (
                        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                          {perks.map(({ icon: Icon, ar: arText, en }, i) => (
                            <div key={i} className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-muted/60 dark:bg-[#1A2035] border border-transparent dark:border-[#2A3348] text-center">
                              <Icon className="w-3.5 h-3.5 text-[#F5A623] dark:text-[#F5A623]" />
                              <span className="text-[10px] text-muted-foreground dark:text-[#8892A4] leading-tight">{ar ? arText : en}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.form>
                  </AnimatePresence>

                  {/* Footer */}
                  <div className="px-6 pb-4 text-center">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-px bg-border dark:bg-[#2A3348]" />
                      <span className="text-xs text-muted-foreground dark:text-[#8892A4] px-2">{ar ? "محمي بتقنية SSL" : "SSL protected"}</span>
                      <div className="flex-1 h-px bg-border dark:bg-[#2A3348]" />
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground dark:text-[#8892A4] mb-3">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      <span>{ar ? "بياناتك آمنة ومشفرة" : "Your data is safe & encrypted"}</span>
                    </div>

                    {/* Admin Login Button */}
                    <button
                      type="button"
                      onClick={() => navigate("/admin/login")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#131929] to-[#1A2A4A] hover:from-[#1A2035] hover:to-[#2A3348] border border-[#2A3348] dark:border-[#2A3348] text-[#C8D0E0] hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md"
                    >
                      <Shield className="w-3.5 h-3.5 text-[#F5A623]" />
                      <span>{ar ? "تسجيل دخول الأدمن" : "Admin Login"}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}