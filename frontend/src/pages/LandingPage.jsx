import React from 'react';
import { Link } from "react-router-dom";
import { Brain, Zap, BarChart3, FileText, ArrowRight, Sparkles, Award, Globe, Shield, Target } from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    desc: "Nebius AI embeddings provide deep semantic understanding of your resume beyond simple keyword matching.",
    color: "from-purple-500/20 to-purple-500/0",
    iconColor: "text-purple-400",
  },
  {
    icon: Zap,
    title: "Instant Matching",
    desc: "Cosine similarity matching between your resume and job descriptions gives precise match percentages in seconds.",
    color: "from-blue-500/20 to-blue-500/0",
    iconColor: "text-blue-400",
  },
  {
    icon: BarChart3,
    title: "Skill Gap Insights",
    desc: "Know exactly which skills you're missing for your target role with actionable recommendations.",
    color: "from-teal-500/20 to-teal-500/0",
    iconColor: "text-teal-400",
  },
  {
    icon: FileText,
    title: "ATS Optimization",
    desc: "LLM-generated feedback ensures your resume passes Applicant Tracking Systems with flying colors.",
    color: "from-pink-500/20 to-pink-500/0",
    iconColor: "text-pink-400",
  },
];

const STATS = [
  { value: "98%", label: "ATS Pass Rate" },
  { value: "3x", label: "More Interviews" },
  { value: "60+", label: "Skills Tracked" },
  { value: "<5s", label: "Analysis Time" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

export default function LandingPage() {
  return (
    React.createElement('div', { className: "min-h-screen bg-background overflow-x-hidden"  ,}
      /* Navbar */
      , React.createElement('nav', { className: "fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl"        ,}
        , React.createElement('div', { className: "container mx-auto px-6 h-20 flex items-center justify-between"      ,}
          , React.createElement('div', { className: "flex items-center gap-3"  ,}
             , React.createElement('div', { className: "w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse-glow"           ,}
                , React.createElement(Brain, { size: 20, className: "text-white",} )
              )
            , React.createElement('span', { className: "font-extrabold text-xl tracking-tight uppercase"   ,}, "Resume"
              , React.createElement('span', { className: "premium-gradient-text tracking-widest" ,}, "AI")
            )
          )
          , React.createElement('div', { className: "hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-muted"        ,}
            , React.createElement('a', { href: "#features", className: "hover:text-white transition-colors" ,}, "Features")
            , React.createElement('a', { href: "#pipeline", className: "hover:text-white transition-colors" ,}, "Pipeline")
          )
          , React.createElement('div', { className: "flex items-center gap-4"  ,}
            , React.createElement(Link, { to: "/auth?mode=signup", className: "btn-premium-outline !py-2 !px-5 !text-xs"   ,}, "Sign Up" )
            , React.createElement(Link, { to: "/auth", className: "btn-premium-outline !py-2 !px-5 !text-xs"   ,}, "Sign In" )
            , React.createElement(Link, { to: "/upload", className: "btn-premium !py-2 !px-5 !text-xs group"    ,}, "Get Started "
                , React.createElement(ArrowRight, { size: 14, className: "group-hover:translate-x-1 transition-transform" ,} )
            )
          )
        )
      )

      /* Hero Section */
      , React.createElement('section', { className: "relative pt-40 pb-20 overflow-hidden"   ,}
        , React.createElement('div', { className: "absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10 animate-pulse"         ,} )
        , React.createElement('div', { className: "absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] -z-10 animate-float"         ,} )

        , React.createElement(motion.div, { 
          initial: "hidden",
          animate: "visible",
          variants: containerVariants,
          className: "container mx-auto px-6 text-center"   ,}

          , React.createElement(motion.div, { variants: itemVariants, className: "mb-8 inline-block" ,}
            , React.createElement('span', { className: "badge-premium !bg-primary/20 !text-white border-primary/30 py-2 px-4 shadow-[0_0_20px_rgba(139,92,246,0.3)]"      ,}
              , React.createElement(Sparkles, { size: 14, className: "text-primary",} ), " AI-Powered Next-Gen Matcher"
            )
          )

          , React.createElement(motion.h1, { 
            variants: itemVariants,
            className: "text-5xl md:text-7xl font-black mb-8 leading-[1.1] tracking-tight max-w-4xl mx-auto"       ,}
, "Smarter Resumes for "
               , React.createElement('br', null )
            , React.createElement('span', { className: "premium-gradient-text",}, "Elite Opportunities" )
          )

          , React.createElement(motion.p, { 
            variants: itemVariants,
            className: "text-lg md:text-xl text-muted max-w-2xl mx-auto mb-12 leading-relaxed"      ,}
, "Leverage state-of-the-art neural embeddings and Nebius LLaMA 3.1 to decode resume DNA and match you with 10k+ industry job profiles."

          )

          , React.createElement(motion.div, { variants: itemVariants, className: "flex flex-col sm:flex-row items-center justify-center gap-6"     ,}
            , React.createElement(Link, { to: "/upload", className: "btn-premium !py-4 !px-10 text-lg group"    ,}, "Analyze My Resume "
                 , React.createElement(ArrowRight, { size: 20, className: "group-hover:translate-x-1 transition-transform" ,} )
            )
            , React.createElement('a', { href: "#features", className: "btn-premium-outline !py-4 !px-10 text-lg"   ,}, "Explore Features"

            )
          )

          /* Stats Grid */
          , React.createElement(motion.div, { 
            variants: itemVariants,
            className: "grid grid-cols-2 md:grid-cols-4 gap-4 mt-24 max-w-4xl mx-auto"      ,}

            , STATS.map((stat) => (
              React.createElement('div', { key: stat.label, className: "glass-card p-8 border-white/5 hover:border-primary/20 hover:bg-white/[0.03] transition-all group"      ,}
                , React.createElement('div', { className: "text-3xl font-black premium-gradient-text mb-2 group-hover:scale-110 transition-transform"     ,}
                  , stat.value
                )
                , React.createElement('div', { className: "text-[10px] font-bold uppercase tracking-widest text-muted"    ,}, stat.label)
              )
            ))
          )
        )
      )

      /* Features Section */
      , React.createElement('section', { id: "features", className: "py-32 relative" ,}
        , React.createElement('div', { className: "container mx-auto px-6"  ,}
          , React.createElement(motion.div, { 
            initial: { opacity: 0, y: 20 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true },
            className: "text-center mb-20" ,}

            , React.createElement('h2', { className: "text-4xl font-extrabold mb-4 uppercase tracking-tight"    ,}, "Built for "
                , React.createElement('span', { className: "premium-gradient-text",}, "High-Efficiency"), " Teams"
            )
            , React.createElement('p', { className: "text-muted max-w-lg mx-auto font-medium"   ,}, "We've integrated a full-stack AI pipeline into one seamless experience."

            )
          )

          , React.createElement('div', { className: "grid md:grid-cols-2 lg:grid-cols-4 gap-6"   ,}
            , FEATURES.map((f, i) => (
              React.createElement(motion.div, { 
                key: f.title,
                initial: { opacity: 0, y: 20 },
                whileInView: { opacity: 1, y: 0 },
                viewport: { once: true },
                transition: { delay: i * 0.1 },
                className: "glass-card p-8 border-white/5 hover:border-primary/20 group relative"     ,}

                , React.createElement('div', { className: `absolute inset-0 bg-gradient-to-b ${f.color} opacity-0 group-hover:opacity-100 transition-opacity`,} )
                , React.createElement('div', { className: `w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 ${f.iconColor}`,}
                  , React.createElement(f.icon, { size: 24,} )
                )
                , React.createElement('h3', { className: "text-xl font-bold mb-4 relative z-10"    ,}, f.title)
                , React.createElement('p', { className: "text-muted text-sm leading-relaxed relative z-10 font-medium"     ,}, f.desc)
              )
            ))
          )
        )
      )

      /* Pipeline Visualization */
      , React.createElement('section', { id: "pipeline", className: "py-32 bg-white/[0.02] border-y border-white/5 overflow-hidden"    ,}
        , React.createElement('div', { className: "container mx-auto px-6"  ,}
          , React.createElement('div', { className: "text-center mb-16" ,}
            , React.createElement('h2', { className: "text-3xl font-black uppercase tracking-widest mb-2"    ,}, "Neural Pipeline" )
            , React.createElement('div', { className: "h-1 w-20 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full"      ,} )
          )

          , React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-5 gap-6 items-center"    ,}
            , [
              { icon: FileText, title: "Ingestion", desc: "Secure Store" },
              { icon: Globe, title: "Parsing", desc: "PDF content decomposition" },
              { icon: Brain, title: "Embedding", desc: "Neural Vectors" },
              { icon: Target, title: "Alignment", desc: "Cosine Multi-matching" },
              { icon: Shield, title: "Feedback", desc: "LLM Strategic Insights" },
            ].map((step, i) => (
              React.createElement(motion.div, { 
                key: step.title,
                initial: { opacity: 0, x: -20 },
                whileInView: { opacity: 1, x: 0 },
                viewport: { once: true },
                transition: { delay: i * 0.1 },
                className: "relative flex flex-col items-center group"    ,}

                , React.createElement('div', { className: "w-16 h-16 rounded-full bg-card flex items-center justify-center border border-white/10 shadow-xl group-hover:border-primary/50 transition-colors z-10 bg-background"             ,}
                  , React.createElement(step.icon, { size: 28, className: "text-primary",} )
                )
                , React.createElement('div', { className: "mt-6 text-center" ,}
                  , React.createElement('h4', { className: "font-bold text-sm mb-1 uppercase tracking-wider"    ,}, step.title)
                  , React.createElement('p', { className: "text-[10px] text-muted font-bold tracking-widest uppercase"    ,}, step.desc)
                )
                , i < 4 && (
                  React.createElement('div', { className: "hidden md:block absolute top-8 left-[70%] w-full h-[1px] bg-white/5 z-0"        ,} )
                )
              )
            ))
          )
        )
      )

      /* CTA Section */
      , React.createElement('section', { className: "py-40 relative" ,}
        , React.createElement('div', { className: "container mx-auto px-6"  ,}
          , React.createElement(motion.div, { 
             initial: { opacity: 0, scale: 0.95 },
             whileInView: { opacity: 1, scale: 1 },
             viewport: { once: true },
             className: "glass-card max-w-4xl mx-auto p-16 text-center border-primary/20 relative overflow-hidden"       ,}

            , React.createElement('div', { className: "absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-[0.03]"     ,} )
            , React.createElement('div', { className: "relative z-10" ,}
              , React.createElement('div', { className: "w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-float"         ,}
                , React.createElement(Brain, { size: 32, className: "text-primary",} )
              )
              , React.createElement('h2', { className: "text-4xl md:text-5xl font-black mb-6 tracking-tight"    ,}, "Ready for a Strategic Advantage?"    )
              , React.createElement('p', { className: "text-muted text-lg max-w-xl mx-auto mb-12 font-medium"     ,}, "The average ATS rejects 75% of resumes. Our AI ensures yours stays in the remaining 25% by optimizing for the exact match vectors recruiters need."

              )
              , React.createElement(Link, { to: "/upload", className: "btn-premium !py-4 !px-12 text-xl group"    ,}, "Begin Analysis "
                  , React.createElement(ArrowRight, { size: 22, className: "group-hover:translate-x-1 transition-transform" ,} )
              )
            )
          )
        )
      )

      /* Footer */
      , React.createElement('footer', { className: "py-12 border-t border-white/5"  ,}
        , React.createElement('div', { className: "container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8"        ,}
           , React.createElement('div', { className: "flex items-center gap-3 opacity-50"   ,}
            , React.createElement(Brain, { size: 20, className: "text-white",} )
            , React.createElement('span', { className: "font-bold text-sm uppercase tracking-widest"   ,}, "Resume"
              , React.createElement('span', { className: "premium-gradient-text tracking-widest" ,}, "AI")
            )
          )
          , React.createElement('p', { className: "text-[11px] font-bold uppercase tracking-[0.2em] text-muted/50 text-center"     ,}, "© 2026 ResumAI Strategy Engine // BAAI-Vector Powered"

          )
          , React.createElement('div', { className: "flex items-center gap-6 opacity-40"   ,}
            , React.createElement(Award, { size: 16,} )
            , React.createElement(Globe, { size: 16,} )
            , React.createElement(Shield, { size: 16,} )
          )
        )
      )
    )
  );
}

