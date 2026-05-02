import React from 'react';
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Brain, Lock, Mail, User } from "lucide-react";
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

  const handleSubmit = async (e) => {
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
    } catch (err) {
      const message = _optionalChain([err, 'access', _ => _.response, 'optionalAccess', _2 => _2.data, 'optionalAccess', _3 => _3.error]) || err.message || "Authentication failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    React.createElement('div', { className: "min-h-screen flex flex-col bg-background relative overflow-hidden"     ,}
      , React.createElement('div', { className: "absolute -top-24 -left-24 w-[420px] h-[420px] bg-primary/20 rounded-full blur-[120px] animate-pulse"        ,} )
      , React.createElement('div', { className: "absolute bottom-0 right-0 w-[360px] h-[360px] bg-secondary/20 rounded-full blur-[120px] animate-float"        ,} )

      , React.createElement('nav', { className: "p-6",}
        , React.createElement('div', { className: "container mx-auto flex justify-center"   ,}
          , React.createElement(Link, { to: "/", className: "flex items-center gap-2 no-underline"   ,}
            , React.createElement('div', { className: "w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center"        ,}
              , React.createElement(Brain, { size: 20, className: "text-white",} )
            )
            , React.createElement('span', { className: "font-extrabold text-xl tracking-tighter text-white"   ,}, "Resume"
              , React.createElement('span', { className: "premium-gradient-text",}, "AI")
            )
          )
        )
      )

      , React.createElement('div', { className: "flex-1 flex items-center justify-center p-6 relative z-10"      ,}
        , React.createElement(motion.div, {
          initial: { opacity: 0, y: 24, scale: 0.98 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { duration: 0.6, ease: "easeOut" },
          className: "glass-card w-full max-w-[440px] p-10 group relative"     ,}

          , React.createElement('div', { className: "absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"        ,} )

          , React.createElement('div', { className: "text-center mb-8 relative"  ,}
            , React.createElement('h2', { className: "text-2xl font-bold mb-2 text-white"   ,}, isLogin ? "Welcome Back" : "Create Account")
            , React.createElement('p', { className: "text-sm text-dimmed" ,}
              , isLogin ? "Sign in to access your analysis history" : "Join today to optimize your resume with AI"
            )
          )

          , React.createElement('form', { onSubmit: handleSubmit, className: "flex flex-col gap-4"  ,}
            , !isLogin && (
              React.createElement('div', null
                , React.createElement('label', { className: "text-[13px] text-dimmed mb-1.5 block font-medium"    ,}, "Full Name" )
                , React.createElement('div', { className: "relative",}
                  , React.createElement(User, { size: 18, className: "text-muted absolute left-3.5 top-3.5"   ,} )
                  , React.createElement('input', {
                    type: "text",
                    className: "input-field pl-11" ,
                    placeholder: "John Doe" ,
                    value: name,
                    onChange: (e) => setName(e.target.value),
                    required: !isLogin,}
                  )
                )
              )
            )

            , React.createElement('div', null
              , React.createElement('label', { className: "text-[13px] text-dimmed mb-1.5 block font-medium"    ,}, "Email Address" )
              , React.createElement('div', { className: "relative",}
                , React.createElement(Mail, { size: 18, className: "text-muted absolute left-3.5 top-3.5"   ,} )
                , React.createElement('input', {
                  type: "email",
                  className: "input-field pl-11" ,
                  placeholder: "you@example.com",
                  value: email,
                  onChange: (e) => setEmail(e.target.value),
                  required: true,}
                )
              )
            )

            , React.createElement('div', null
              , React.createElement('label', { className: "text-[13px] text-dimmed mb-1.5 block font-medium"    ,}, "Password")
              , React.createElement('div', { className: "relative",}
                , React.createElement(Lock, { size: 18, className: "text-muted absolute left-3.5 top-3.5"   ,} )
                , React.createElement('input', {
                  type: "password",
                  className: "input-field pl-11" ,
                  placeholder: "••••••••",
                  value: password,
                  onChange: (e) => setPassword(e.target.value),
                  minLength: isLogin ? undefined : 6,
                  required: true,}
                )
              )
            )

            , error && (
              React.createElement('div', { className: "p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-[13px] flex items-start gap-2"         ,}
                , React.createElement(RiErrorWarningFill, { className: "mt-0.5 shrink-0 text-red-400"  ,} )
                , React.createElement('span', null, error)
              )
            )

            , React.createElement(motion.button, {
              type: "submit",
              className: "btn-premium w-full justify-center mt-4"   ,
              whileHover: { scale: 1.02 },
              whileTap: { scale: 0.98 },
              disabled: loading,}

              , loading ? React.createElement('div', { className: "spinner",} ) : (isLogin ? "Sign In" : "Sign Up")
            )
          )

          , React.createElement('div', { className: "text-center mt-6 text-sm text-dimmed"   ,}
            , isLogin ? "Don't have an account? " : "Already have an account? "
            , React.createElement('button', {
              onClick: () => { setIsLogin(!isLogin); setError(""); },
              className: "bg-transparent border-none text-primary font-bold hover:underline cursor-pointer p-0"      ,}

              , isLogin ? "Sign up" : "Sign in"
            )
          )
        )
      )
    )
  );
}

