import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Lock, Eye, EyeOff, CheckCircle, Loader2, AlertCircle, Home } from "lucide-react";
import { supabase } from "../context/AppContext";
import { useApp } from "../context/AppContext";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { language } = useApp();
  const ar = language === "ar";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Supabase sends the session via URL hash on password reset
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // User is in password recovery mode - allow form
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError(ar ? "يرجى إدخال كلمة المرور الجديدة" : "Please enter a new password");
      return;
    }
    if (password.length < 6) {
      setError(ar ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError(ar ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate("/auth"), 3000);
    } catch (e: any) {
      setError(e.message || (ar ? "تعذر تحديث كلمة المرور" : "Failed to update password"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/40 via-background to-muted/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary to-accent-blue p-6 text-white text-center">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Home className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold">{ar ? "بيتي" : "Baity"}</h1>
            <p className="text-white/75 text-sm mt-1">
              {ar ? "إعادة تعيين كلمة المرور" : "Reset Password"}
            </p>
          </div>

          <div className="p-6">
            {success ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-4"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-9 h-9 text-green-500" />
                </div>
                <p className="font-bold text-primary mb-2">
                  {ar ? "تم تحديث كلمة المرور!" : "Password updated!"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {ar ? "سيتم توجيهك لتسجيل الدخول..." : "Redirecting to sign in..."}
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2.5 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-primary mb-2">
                    {ar ? "كلمة المرور الجديدة" : "New Password"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full py-3 ps-12 pe-12 bg-muted rounded-xl border-2 border-transparent focus:border-accent transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 -translate-y-1/2 end-4 text-muted-foreground hover:text-primary"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-primary mb-2">
                    {ar ? "تأكيد كلمة المرور" : "Confirm Password"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full py-3 ps-12 pe-4 bg-muted rounded-xl border-2 transition-all outline-none ${
                        confirm && confirm !== password ? "border-red-400" : "border-transparent focus:border-accent"
                      }`}
                    />
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-red-500 text-xs mt-1">
                      {ar ? "كلمتا المرور غير متطابقتين" : "Passwords don't match"}
                    </p>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-primary to-accent-blue text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    ar ? "تحديث كلمة المرور" : "Update Password"
                  )}
                </motion.button>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
