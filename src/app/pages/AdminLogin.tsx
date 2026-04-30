import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Shield, Lock, Mail, Eye, EyeOff,
  AlertCircle, CheckCircle, LogIn, Home,
} from "lucide-react";
import { useApp, supabase } from "../context/AppContext";

const ADMIN_EMAIL = "admin@baity.com";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { language, user } = useApp();
  const ar = language === "ar";

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [isLoading, setIsLoading]       = useState(false);
  const [step, setStep]                 = useState<"form" | "success">("form");

  // If already logged in as admin, redirect immediately
  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) {
      navigate("/admin", { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError("");
    setIsLoading(true);

    try {
      // ── 1. Sign in via Supabase (real auth — not a mock check)
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        // Map common Supabase error messages to Arabic/English
        const msg = signInError.message.toLowerCase();
        if (msg.includes("invalid") || msg.includes("credentials") || msg.includes("email") || msg.includes("password")) {
          setError(ar
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            : "Incorrect email or password");
        } else if (msg.includes("too many")) {
          setError(ar
            ? "تم تجاوز عدد المحاولات. يرجى الانتظار قليلاً"
            : "Too many attempts. Please wait a moment");
        } else {
          setError(ar ? `خطأ في تسجيل الدخول: ${signInError.message}` : signInError.message);
        }
        setIsLoading(false);
        return;
      }

      // ── 2. Verify the signed-in user is the admin
      if (data?.user?.email !== ADMIN_EMAIL) {
        // Signed in as non-admin — sign them out immediately
        await supabase.auth.signOut();
        setError(ar
          ? "هذا الحساب ليس لديه صلاحيات الأدمن"
          : "This account does not have admin privileges");
        setIsLoading(false);
        return;
      }

      // ── 3. Success — AppContext's onAuthStateChange will update user automatically
      setStep("success");
      setTimeout(() => {
        navigate("/admin", { replace: true });
      }, 1200);

    } catch (err: any) {
      console.error("Admin login error:", err);
      setError(ar
        ? "حدث خطأ غير متوقع. يرجى المحاولة مجدداً"
        : "An unexpected error occurred. Please try again");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -end-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -start-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-gradient-to-br from-accent to-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-accent/40"
          >
            <Shield className="w-10 h-10 text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-3xl font-black text-white mb-1"
          >
            {ar ? "لوحة تحكم الأدمن" : "Admin Panel"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-[#C8D0E0] text-sm"
          >
            {ar ? "سجّل دخولك للوصول إلى لوحة التحكم" : "Sign in to access the admin dashboard"}
          </motion.p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#131929] border border-[#2A3348] rounded-3xl shadow-2xl overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {step === "success" ? (
              /* ── Success State */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-10 text-center"
              >
                <div className="w-20 h-20 bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">
                  {ar ? "تم تسجيل الدخول بنجاح!" : "Login Successful!"}
                </h2>
                <p className="text-[#C8D0E0] text-sm">
                  {ar ? "جارٍ التوجيه إلى لوحة التحكم..." : "Redirecting to dashboard..."}
                </p>
                <div className="mt-4 w-8 h-8 border-2 border-accent/40 border-t-accent rounded-full animate-spin mx-auto" />
              </motion.div>
            ) : (
              /* ── Login Form */
              <motion.form
                key="form"
                onSubmit={handleLogin}
                className="p-6 space-y-4"
              >
                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-[#C8D0E0] mb-2">
                    {ar ? "البريد الإلكتروني" : "Email Address"}
                  </label>
                  <div className="relative">
                    <Mail className="absolute top-1/2 -translate-y-1/2 start-3.5 w-5 h-5 text-[#8892A4]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      placeholder={ar ? "admin@baity.com" : "admin@baity.com"}
                      dir="ltr"
                      required
                      autoComplete="username"
                      className="w-full ps-11 pe-4 py-3 bg-[#1A2035] border border-[#2A3348] text-[#FFFFFF] placeholder:text-[#8892A4] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent/60 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-bold text-[#C8D0E0] mb-2">
                    {ar ? "كلمة المرور" : "Password"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute top-1/2 -translate-y-1/2 start-3.5 w-5 h-5 text-[#8892A4]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      placeholder={ar ? "كلمة المرور" : "Password"}
                      required
                      autoComplete="current-password"
                      className="w-full ps-11 pe-12 py-3 bg-[#1A2035] border border-[#2A3348] text-[#FFFFFF] placeholder:text-[#8892A4] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent/60 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 -translate-y-1/2 end-3.5 text-[#8892A4] hover:text-[#FFFFFF] transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                      <p className="text-sm text-red-300">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading || !email.trim() || !password}
                  className="w-full bg-gradient-to-r from-accent to-amber-500 text-white py-3 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-accent/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2.5 mt-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>{ar ? "جارٍ التحقق..." : "Verifying..."}</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>{ar ? "تسجيل الدخول" : "Sign In"}</span>
                    </>
                  )}
                </button>

                {/* Security note */}
                <div className="flex items-center gap-2 justify-center pt-1">
                  <Shield className="w-3.5 h-3.5 text-[#8892A4]" />
                  <p className="text-xs text-[#8892A4]">
                    {ar
                      ? "اتصال آمن — بيانات مشفرة عبر Supabase Auth"
                      : "Secure connection — encrypted via Supabase Auth"}
                  </p>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Back to home & user login */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="text-center mt-6 space-y-2"
        >
          <button
            onClick={() => navigate("/auth")}
            className="inline-flex items-center gap-2 text-[#8892A4] hover:text-[#FFFFFF] transition-colors text-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>{ar ? "تسجيل دخول المستخدمين" : "User Login"}</span>
          </button>
          <div className="text-[#8892A4]">•</div>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-[#8892A4] hover:text-[#FFFFFF] transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
            <span>{ar ? "العودة إلى الصفحة الرئيسية" : "Back to Home"}</span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
