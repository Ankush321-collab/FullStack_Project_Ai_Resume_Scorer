import React from 'react';
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Brain, FileText, Plus, 
  Clock, BarChart3, ChevronRight, Zap, Trash2
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

export default function DashboardPage({ user }) {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resumesRes, analyticsRes] = await Promise.all([
          api.get("/resumes"),
          api.get("/analytics/overview")
        ]);
        setResumes(resumesRes.data);
        setAnalytics(analyticsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleDeleteResume = async (resumeId, fileName, e) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Delete resume history for \"${fileName}\"?`);
    if (!confirmed) return;

    try {
      setDeletingId(resumeId);
      await api.delete(`/resumes/${resumeId}`);
      setResumes((prev) => prev.filter((r) => r.id !== resumeId));
      setAnalytics((prev) =>
        prev ? { ...prev, totalResumes: Math.max(0, (prev.totalResumes || 0) - 1) } : prev
      );
      toast.success("Resume history deleted.");
    } catch (err) {
      toast.error(_optionalChain([err, 'optionalAccess', _ => _.response, 'optionalAccess', _2 => _2.data, 'optionalAccess', _3 => _3.error]) || "Failed to delete resume history.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAllHistory = async () => {
    if (resumes.length === 0) {
      toast.error("No resume history to clear.");
      return;
    }

    const confirmed = window.confirm("Delete all resume history? This cannot be undone.");
    if (!confirmed) return;

    try {
      setClearingAll(true);
      await api.delete("/resumes/history");
      setResumes([]);
      setAnalytics((prev) => (prev ? { ...prev, totalResumes: 0, avgScore: 0 } : prev));
      toast.success("All resume history cleared.");
    } catch (err) {
      toast.error(_optionalChain([err, 'optionalAccess', _4 => _4.response, 'optionalAccess', _5 => _5.data, 'optionalAccess', _6 => _6.error]) || "Failed to clear history.");
    } finally {
      setClearingAll(false);
    }
  };

  if (loading) {
    return (
      React.createElement('div', { className: "min-h-screen bg-background flex items-center justify-center"    ,}
        , React.createElement('div', { className: "spinner !w-12 !h-12 border-4"   ,} )
      )
    );
  }

  return (
    React.createElement('div', { className: "min-h-screen bg-background text-white pb-20"   ,}
      /* Navbar */
      , React.createElement('nav', { className: "fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl"        ,}
        , React.createElement('div', { className: "container mx-auto px-6 h-20 flex items-center justify-between"      ,}
          , React.createElement('div', { className: "flex items-center gap-3"  ,}
             , React.createElement('div', { className: "w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20"          ,}
                , React.createElement(Brain, { size: 20, className: "text-white",} )
              )
            , React.createElement('span', { className: "font-extrabold text-xl tracking-tight uppercase"   ,}, "Resume"
              , React.createElement('span', { className: "premium-gradient-text tracking-widest" ,}, "AI")
            )
          )
          , React.createElement('div', { className: "flex items-center gap-6"  ,}
            , React.createElement('span', { className: "text-xs font-bold text-dimmed uppercase tracking-widest hidden md:block"      ,}, _optionalChain([user, 'optionalAccess', _7 => _7.email]))
            , React.createElement('button', { onClick: handleLogout, className: "btn-premium-outline !py-2 !px-5 !text-xs"   ,}, "Sign Out" )
          )
        )
      )

      , React.createElement('main', { className: "container mx-auto px-6 pt-32"   ,}
        /* Header Section */
        , React.createElement('div', { className: "flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"      ,}
          , React.createElement('div', null
            , React.createElement('h1', { className: "text-4xl font-black tracking-tight mb-2"   ,}, "Command " , React.createElement('span', { className: "premium-gradient-text",}, "Center"))
            , React.createElement('p', { className: "text-dimmed font-medium" ,}, "Manage and analyze your strategic career assets."      )
          )
          , React.createElement(Link, { to: "/upload", className: "btn-premium flex items-center gap-2"   ,}
            , React.createElement(Plus, { size: 20,} ), "New Analysis"

          )
        )

        /* Stats Grid */
        , React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"    ,}
          , React.createElement('div', { className: "glass-card p-8 group"  ,}
            , React.createElement('div', { className: "w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20"         ,}
              , React.createElement(FileText, { size: 24, className: "text-primary",} )
            )
            , React.createElement('p', { className: "text-4xl font-black mb-1"  ,}, _optionalChain([analytics, 'optionalAccess', _8 => _8.totalResumes]) || 0)
            , React.createElement('p', { className: "text-xs font-bold uppercase tracking-widest text-dimmed"    ,}, "Total Resumes" )
          )
          , React.createElement('div', { className: "glass-card p-8 group"  ,}
             , React.createElement('div', { className: "w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 border border-accent/20"         ,}
              , React.createElement(Zap, { size: 24, className: "text-accent",} )
            )
            , React.createElement('p', { className: "text-4xl font-black mb-1"  ,}, Math.round(_optionalChain([analytics, 'optionalAccess', _9 => _9.avgScore]) || 0), "%")
            , React.createElement('p', { className: "text-xs font-bold uppercase tracking-widest text-dimmed"    ,}, "Avg Match Score"  )
          )
          , React.createElement('div', { className: "glass-card p-8 group"  ,}
             , React.createElement('div', { className: "w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20"         ,}
              , React.createElement(BarChart3, { size: 24, className: "text-secondary",} )
            )
            , React.createElement('p', { className: "text-4xl font-black mb-1"  ,}, _optionalChain([analytics, 'optionalAccess', _10 => _10.topMissingSkills, 'optionalAccess', _11 => _11.length]) || 0)
            , React.createElement('p', { className: "text-xs font-bold uppercase tracking-widest text-dimmed"    ,}, "Skills Tracked" )
          )
        )

        /* Resumes List */
        , React.createElement('div', { className: "space-y-4",}
          , React.createElement('div', { className: "mb-6 px-2 flex items-center justify-between gap-3"     ,}
            , React.createElement('h2', { className: "text-xl font-bold uppercase tracking-widest flex items-center gap-3"      ,}
               , React.createElement(Clock, { size: 18, className: "text-primary",} ), " Recent Activities"
            )
            , React.createElement('button', {
              onClick: handleClearAllHistory,
              disabled: clearingAll || resumes.length === 0,
              className: "btn-premium-outline !py-2 !px-4 !text-xs disabled:opacity-50 disabled:cursor-not-allowed"     ,}

              , clearingAll ? "Clearing..." : "Clear History"
            )
          )

          , resumes.length === 0 ? (
            React.createElement('div', { className: "glass-card p-20 text-center border-dashed"   ,}
               , React.createElement(FileText, { size: 48, className: "text-dimmed/20 mx-auto mb-6"  ,} )
               , React.createElement('p', { className: "text-dimmed font-medium" ,}, "No analysis data found. Ready to start?"      )
               , React.createElement(Link, { to: "/upload", className: "text-primary font-bold hover:underline mt-4 inline-block"    ,}, "Upload your first resume"   )
            )
          ) : (
            resumes.map((resume) => (
              React.createElement(motion.div, { 
                key: resume.id,
                initial: { opacity: 0, y: 10 },
                animate: { opacity: 1, y: 0 },
                whileHover: { scale: 1.005, backgroundColor: "var(--bg-card-hover)" },
                onClick: () => navigate(`/dashboard/${resume.id}`),
                className: "glass-card p-6 flex items-center justify-between cursor-pointer group"      ,}

                , React.createElement('div', { className: "flex items-center gap-6"  ,}
                  , React.createElement('div', { className: "w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10"        ,}
                    , React.createElement(FileText, { size: 24, className: "text-dimmed group-hover:text-white transition-colors"  ,} )
                  )
                  , React.createElement('div', null
                    , React.createElement('h3', { className: "font-bold text-lg text-white group-hover:text-primary transition-colors"    ,}, resume.fileName)
                    , React.createElement('div', { className: "flex items-center gap-4 mt-1"   ,}
                       , React.createElement('span', { className: `text-[10px] font-black uppercase tracking-widest py-1 px-2 rounded-md ${
                         resume.status === 'COMPLETED' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
                       }`,}
                         , resume.status
                       )
                       , React.createElement('span', { className: "text-[10px] text-dimmed font-bold uppercase tracking-widest"    ,}
                         , new Date(resume.createdAt).toLocaleDateString()
                       )
                    )
                  )
                )
                , React.createElement('div', { className: "flex items-center gap-8"  ,}
                  , React.createElement('button', {
                    onClick: (e) => handleDeleteResume(resume.id, resume.fileName, e),
                    disabled: deletingId === resume.id,
                    className: "p-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"         ,
                    title: "Delete this history item"   ,}

                    , React.createElement(Trash2, { size: 16,} )
                  )
                  , React.createElement('div', { className: "text-right hidden sm:block"  ,}
                     , React.createElement('p', { className: "text-2xl font-black" ,}, Math.round(_optionalChain([resume, 'access', _12 => _12.matchResults, 'access', _13 => _13[0], 'optionalAccess', _14 => _14.matchPercentage]) || 0), "%")
                     , React.createElement('p', { className: "text-[10px] font-bold uppercase tracking-widest text-dimmed"    ,}, "Best Match" )
                  )
                  , React.createElement(ChevronRight, { size: 20, className: "text-dimmed group-hover:text-white group-hover:translate-x-1 transition-all"   ,} )
                )
              )
            ))
          )
        )
      )
    )
  );
}

