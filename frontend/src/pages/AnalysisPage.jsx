import React from 'react';
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, } from "framer-motion";
import { 
  Brain, ArrowLeft, Target, 
  CheckCircle, XCircle, Sparkles,
 Layers
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,

} from "recharts";
import api from "../services/api";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

function ScoreRing({ value, size = 160 }) {
  const radius = 65;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(value, 100) / 100;
  const color = value >= 80 ? "#14b8a6" : value >= 60 ? "#8b5cf6" : "#f43f5e";

  return (
    React.createElement('div', { className: "relative flex items-center justify-center"   , style: { width: size, height: size },}
      , React.createElement('svg', { width: size, height: size, className: "-rotate-90",}
        , React.createElement('circle', { cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: "currentColor", strokeWidth: "12", className: "text-white/5",} )
        , React.createElement(motion.circle, {
          cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: color, strokeWidth: "12", strokeDasharray: circ,
          initial: { strokeDashoffset: circ }, animate: { strokeDashoffset: circ * (1 - pct) },
          transition: { duration: 1.5, ease: "easeInOut", delay: 0.5 },
          strokeLinecap: "round", className: "drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]",}
        )
      )
      , React.createElement('div', { className: "absolute inset-0 flex flex-col items-center justify-center"     ,}
        , React.createElement(motion.span, { 
          initial: { opacity: 0, scale: 0.5 }, animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.5, delay: 1 },
          className: "text-4xl font-black tracking-tighter"  , style: { color },}

          , Math.round(value), "%"
        )
        , React.createElement('span', { className: "text-[10px] font-bold uppercase tracking-widest text-dimmed mt-1"     ,}, "Match Score" )
      )
    )
  );
}

function TypewriterText({ text }) {
  const [displayedText, setDisplayedText] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    let index = 0;
    setDisplayedText(""); 
    if (!text) return;
    
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text[index]);
      index++;
      if (index === text.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [text]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedText]);

  return (
    React.createElement('div', { ref: containerRef, className: "max-h-[360px] overflow-y-auto pr-4 scroll-smooth custom-scrollbar"    ,}
      , React.createElement('div', { className: "text-dimmed leading-relaxed text-[15px] space-y-4 whitespace-pre-wrap font-medium"     ,}
        , displayedText
        , React.createElement(motion.span, { animate: { opacity: [0, 1, 0] }, transition: { repeat: Infinity, duration: 0.8 }, className: "inline-block w-2 h-4 bg-primary ml-1 translate-y-0.8"     ,} )
      )
    )
  );
}

export default function AnalysisPage() {
  const { resumeId } = useParams();
  const [resume, setResume] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [improving, setImproving] = useState(false);

  const handleImprove = async () => {
    try {
      setImproving(true);
      const res = await api.get(`/resumes/${resumeId}/improve`);
      if (res.data.success) {
        const link = document.createElement('a');
        link.href = `http://localhost:4000${res.data.improvedFileUrl}`;
        link.download = res.data.improvedFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Failed to improve resume:", err);
      alert("Failed to generate improved resume. Please try again.");
    } finally {
      setImproving(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setErrorMessage("");
        const [res, ana] = await Promise.all([
          api.get(`/resumes/${resumeId}`),
          api.get("/analytics/overview")
        ]);
        setResume(res.data);
        setAnalytics(ana.data);
        if (res.data.status === "COMPLETED" && res.data.feedback) {
          setPolling(false);
        }
      } catch (err) {
        console.error(err);
        const status = _optionalChain([err, 'optionalAccess', _ => _.response, 'optionalAccess', _2 => _2.status]);
        if (status === 404) {
          setErrorMessage("This resume was not found or is no longer accessible.");
          setPolling(false);
        } else if (status === 401) {
          setErrorMessage("Your session expired. Please sign in again.");
          setPolling(false);
        } else {
          setErrorMessage(_optionalChain([err, 'optionalAccess', _3 => _3.response, 'optionalAccess', _4 => _4.data, 'optionalAccess', _5 => _5.error]) || "Could not load analysis data.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    let interval;
    if (polling) {
      interval = setInterval(fetchData, 5000);
    }
    return () => clearInterval(interval);
  }, [resumeId, polling]);

  if (loading) return (
    React.createElement('div', { className: "min-h-screen flex items-center justify-center bg-background"    ,}
      , React.createElement('div', { className: "spinner w-12 h-12 border-4"   ,} )
    )
  );

  if (errorMessage && !resume) {
    return (
      React.createElement('div', { className: "min-h-screen bg-background text-white flex items-center justify-center px-6"      ,}
        , React.createElement('div', { className: "glass-card p-8 max-w-lg w-full text-center border-red-500/20"     ,}
          , React.createElement('h2', { className: "text-2xl font-black mb-3"  ,}, "Unable To Load Analysis"   )
          , React.createElement('p', { className: "text-dimmed mb-6" ,}, errorMessage)
          , React.createElement(Link, { to: "/dashboard", className: "btn-premium-outline !py-2 !px-5 !text-xs"   ,}, "Back To Dashboard"

          )
        )
      )
    );
  }

  const topMatch = _optionalChain([resume, 'optionalAccess', _6 => _6.matchResults, 'optionalAccess', _7 => _7[0]]);
  const presentSkills = _optionalChain([resume, 'optionalAccess', _8 => _8.skills]) || [];
  const skillGap = _optionalChain([topMatch, 'optionalAccess', _9 => _9.skillGap]) || [];
  const radarData = skillGap.slice(0, 6).map((skill) => ({
    skill, hasSkill: presentSkills.includes(skill) ? 80 : 20,
  }));

  return (
    React.createElement('div', { className: "min-h-screen bg-background text-white selection:bg-primary/30"   ,}
      , React.createElement('nav', { className: "fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl"        ,}
        , React.createElement('div', { className: "container mx-auto px-6 h-20 flex items-center justify-between"      ,}
          , React.createElement('div', { className: "flex items-center gap-6"  ,}
            , React.createElement(Link, { to: "/dashboard", className: "btn-premium-outline !py-2 !px-4 !text-xs group"    ,}
              , React.createElement(ArrowLeft, { size: 14, className: "group-hover:-translate-x-1 transition-transform" ,} ), "Back"

            )
            , React.createElement('div', { className: "flex items-center gap-3"  ,}
              , React.createElement('div', { className: "w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center"        ,}
                , React.createElement(Brain, { size: 20,} )
              )
              , React.createElement('span', { className: "font-black text-xl tracking-tight uppercase"   ,}, "Resume", React.createElement('span', { className: "premium-gradient-text tracking-widest" ,}, "AI"))
            )
          )
            , React.createElement('span', { className: `badge-premium ${_optionalChain([resume, 'optionalAccess', _10 => _10.status]) === 'COMPLETED' ? 'text-accent' : 'text-primary'}`,}
              , _optionalChain([resume, 'optionalAccess', _11 => _11.status]) === "COMPLETED" ? React.createElement(CheckCircle, { size: 10,} ) : React.createElement(Sparkles, { size: 10, className: "animate-spin",} )
              , _optionalChain([resume, 'optionalAccess', _12 => _12.status])
            )
            , _optionalChain([resume, 'optionalAccess', _status => _status.status]) === "COMPLETED" && (
              React.createElement('button', { 
                onClick: handleImprove, 
                disabled: improving,
                className: "btn-premium !py-2 !px-4 !text-xs flex items-center gap-2 ml-4",}
                , improving ? React.createElement(Sparkles, { size: 12, className: "animate-spin",} ) : React.createElement(Sparkles, { size: 12,} )
                , improving ? "Improving..." : "Improve Resume (PDF)"
              )
            )
          )
        )

      , React.createElement(motion.main, { variants: containerVariants, initial: "hidden", animate: "visible", className: "container mx-auto px-6 pt-32 pb-20"    ,}
        , _optionalChain([resume, 'optionalAccess', _13 => _13.status]) !== "COMPLETED" && (
           React.createElement('div', { className: "glass-card mb-8 p-8 border-primary/30 bg-primary/5"    ,}
             , React.createElement('div', { className: "flex items-center gap-6"  ,}
               , React.createElement('div', { className: "spinner !w-10 !h-10 border-4"   ,} )
               , React.createElement('div', null
                  , React.createElement('h3', { className: "text-xl font-bold mb-1"  ,}, "Deep Analysis in Progress"   )
                  , React.createElement('p', { className: "text-dimmed text-sm" ,}, "Extracting skill vectors and cross-referencing with target roleRequirements..."       )
               )
             )
           )
        )

        , React.createElement('div', { className: "grid lg:grid-cols-[380px_1fr] gap-8"  ,}
          , React.createElement(motion.div, { variants: itemVariants, className: "space-y-8",}
            , React.createElement('div', { className: "glass-card p-10 flex flex-col items-center justify-center text-center"      ,}
              , React.createElement(ScoreRing, { value: _optionalChain([topMatch, 'optionalAccess', _14 => _14.matchPercentage]) || 0,} )
              , React.createElement('div', { className: "mt-8 space-y-4 w-full"  ,}
                , React.createElement('div', { className: "p-4 rounded-2xl bg-white/5 border border-white/5"    ,}
                  , React.createElement('p', { className: "text-[10px] font-bold uppercase tracking-widest text-dimmed mb-1"     ,}, "Confidence Vector" )
                  , React.createElement('p', { className: "text-2xl font-black text-white"  ,}, Math.round((_optionalChain([topMatch, 'optionalAccess', _15 => _15.confidence]) || 0) * 100), "%")
                )
                , _optionalChain([topMatch, 'optionalAccess', _basis => _basis.basis]) && (
                  React.createElement('div', { className: "p-4 rounded-2xl bg-primary/10 border border-primary/20 mt-4"     ,}
                    , React.createElement('p', { className: "text-[10px] font-bold uppercase tracking-widest text-primary mb-1"     ,}, "Scoring Basis" )
                    , React.createElement('p', { className: "text-sm font-medium text-white/90 leading-tight"   ,}, topMatch.basis)
                  )
                )
              )
            )
            , React.createElement('div', { className: "grid grid-cols-2 gap-4"  ,}
              , React.createElement('div', { className: "glass-card p-6 border-white/5"  ,}
                , React.createElement(CheckCircle, { size: 16, className: "text-accent mb-4" ,} )
                , React.createElement('p', { className: "text-2xl font-black" ,}, presentSkills.length)
                , React.createElement('p', { className: "text-[10px] uppercase font-bold text-dimmed tracking-tighter"    ,}, "Skills Found" )
              )
              , React.createElement('div', { className: "glass-card p-6 border-white/5"  ,}
                , React.createElement(XCircle, { size: 16, className: "text-red-400 mb-4" ,} )
                , React.createElement('p', { className: "text-2xl font-black" ,}, skillGap.length)
                , React.createElement('p', { className: "text-[10px] uppercase font-bold text-dimmed tracking-tighter"    ,}, "Gap Detected" )
              )
            )
          )

          , React.createElement('div', { className: "space-y-8",}
            , React.createElement(motion.div, { variants: itemVariants, className: "glass-card p-8 flex items-center justify-between"    ,}
              , React.createElement('div', { className: "flex items-center gap-4"  ,}
                , React.createElement(Layers, { size: 24, className: "text-primary",} )
                , React.createElement('div', null
                  , React.createElement('h2', { className: "text-2xl font-bold" ,}, _optionalChain([resume, 'optionalAccess', _16 => _16.fileName]))
                  , React.createElement('p', { className: "text-dimmed text-xs" ,}, "ATS Strategy Optimized • AI-Generated Feedback"     )
                )
              )
            )

            , _optionalChain([resume, 'optionalAccess', _17 => _17.feedback]) && (
              React.createElement(motion.div, { variants: itemVariants, className: "glass-card p-10 border-primary/20 bg-primary/[0.02] relative group shadow-2xl mt-8"       ,}
                 , React.createElement('div', { className: "flex justify-start mb-8"  ,}
                   , React.createElement('span', { className: "badge-premium !bg-primary !text-white flex items-center gap-2.5 shadow-xl py-2.5 px-5 rounded-full font-black tracking-widest border-0"            ,}
                     , React.createElement(Brain, { size: 14, className: "animate-pulse",} ), " NEBIUS INTELLIGENCE"
                   )
                 )
                 , React.createElement('div', { className: "",}
                   , React.createElement(TypewriterText, { text: resume.feedback,} )
                 )
              )
            )

            , React.createElement('div', { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-8"   ,}
               , React.createElement('div', { className: "glass-card p-8" ,}
                 , React.createElement('h3', { className: "text-lg font-bold mb-6 flex items-center gap-2"     ,}
                   , React.createElement(Target, { size: 18, className: "text-primary",} ), " Skill Radar"
                 )
                 , React.createElement('div', { className: "h-[240px] w-full" ,}
                   , React.createElement(ResponsiveContainer, { width: "100%", height: "100%",}
                     , React.createElement(RadarChart, { data: radarData,}
                       , React.createElement(PolarGrid, { stroke: "rgba(255,255,255,0.05)",} )
                       , React.createElement(PolarAngleAxis, { dataKey: "skill", tick: { fill: "rgba(255,255,255,0.4)", fontSize: 10 },} )
                       , React.createElement(Radar, { name: "Matching", dataKey: "hasSkill", stroke: "#8b5cf6", fill: "#8b5cf6", fillOpacity: 0.15,} )
                     )
                   )
                 )
               )

               , React.createElement('div', { className: "glass-card p-8 group border-emerald-500/20"   ,}
                  , React.createElement('h3', { className: "text-lg font-bold mb-6 flex items-center gap-2"     ,}
                    , React.createElement(CheckCircle, { size: 18, className: "text-emerald-400",} ), " Extracted Skills"
                  )
                  , React.createElement('div', { className: "flex flex-wrap gap-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar"      ,}
                    , presentSkills.length > 0 ? (
                      presentSkills.map((s) => (
                        React.createElement('span', { key: s, className: "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 group-hover:bg-gradient-to-r group-hover:from-emerald-500 group-hover:to-teal-500 group-hover:text-white group-hover:border-transparent transition-all duration-300"                 ,}
                          , s
                        )
                      ))
                    ) : (
                      React.createElement('p', { className: "text-xs text-dimmed italic"  ,}, "No specific tech skills identified."    )
                    )
                  )
               )

               , React.createElement('div', { className: "glass-card p-8 group border-red-500/20"   ,}
                  , React.createElement('h3', { className: "text-lg font-bold mb-6 flex items-center gap-2"     ,}
                    , React.createElement(XCircle, { size: 18, className: "text-red-400",} ), " Market Gaps"
                  )
                  , React.createElement('div', { className: "flex flex-wrap gap-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar"      ,}
                    , skillGap.length > 0 ? (
                      skillGap.map((s) => (
                        React.createElement('span', { key: s, className: "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-300 border border-red-500/20 group-hover:bg-gradient-to-r group-hover:from-red-500 group-hover:to-pink-600 group-hover:text-white group-hover:border-transparent transition-all duration-300"                 ,}
                          , s
                        )
                      ))
                    ) : (
                      React.createElement('p', { className: "text-xs text-accent italic"  ,}, "Zero alignment gaps detected!"   )
                    )
                  )
               )
            )
          )
        )
      )
    )
  );
}

