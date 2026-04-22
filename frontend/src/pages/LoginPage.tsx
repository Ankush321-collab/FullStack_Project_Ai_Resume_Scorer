import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Brain, ArrowRight, Lock, Mail, User } from "lucide-react";
import { RiErrorWarningFill } from "react-icons/ri";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import api from "../services/api";

export default function LoginPage() {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get("mode");
    setIsLogin(mode !== "signup");
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      const message = "Email and password are required.";
      setError(message);
      toast.error(message);
      return;
    }
    if (!isLogin && !name.trim()) {
      const message = "Please enter your full name.";
      setError(message);
      toast.error(message);
      return;
    }
    if (!isLogin && password.length < 6) {
      const message = "Password must be at least 6 characters.";
      setError(message);
      toast.error(message);
      return;
    }

    setError("");
    setLoading(true);

    try {
      let data;
      if (isLogin) {
        const res = await api.post("/auth/signin", { email, password });
        data = res.data;
      } else {
        const res = await api.post("/auth/signup", { email, password, name });
        data = res.data;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        toast.success(isLogin ? "Signed in successfully" : "Account created successfully");
        window.location.href = "/upload"; // Refresh to pick up new token/user state
      }
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || "Authentication failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-[420px] h-[420px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[360px] h-[360px] bg-secondary/20 rounded-full blur-[120px] animate-float" />
      
      <nav className="p-6">
        <div className="container mx-auto flex justify-center">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tighter text-white">
              Resume<span className="premium-gradient-text">AI</span>
            </span>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass-card w-full max-w-[440px] p-10 group relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="text-center mb-8 relative">
            <h2 className="text-2xl font-bold mb-2 text-white">{isLogin ? "Welcome Back" : "Create Account"}</h2>
            <p className="text-sm text-dimmed">
              {isLogin ? "Sign in to access your analysis history" : "Join today to optimize your resume with AI"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div>
                <label className="text-[13px] text-dimmed mb-1.5 block font-medium">Full Name</label>
                <div className="relative">
                  <User size={18} className="text-muted absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    className="input-field pl-11"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[13px] text-dimmed mb-1.5 block font-medium">Email Address</label>
              <div className="relative">
                <Mail size={18} className="text-muted absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  className="input-field pl-11"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[13px] text-dimmed mb-1.5 block font-medium">Password</label>
              <div className="relative">
                <Lock size={18} className="text-muted absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  className="input-field pl-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={isLogin ? undefined : 6}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-[13px] flex items-start gap-2">
                <RiErrorWarningFill className="mt-0.5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <motion.button
              type="submit"
              className="btn-premium w-full justify-center mt-4"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
            >
              {loading ? <div className="spinner" /> : (isLogin ? "Sign In" : "Sign Up")}
            </motion.button>
          </form>

          <div className="text-center mt-6 text-sm text-dimmed">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              className="bg-transparent border-none text-primary font-bold hover:underline cursor-pointer p-0"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
