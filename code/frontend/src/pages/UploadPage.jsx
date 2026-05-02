import React from 'react';
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, Upload, FileText, Briefcase, 
  CheckCircle, AlertCircle, CloudUpload, 
  ArrowRight, Sparkles, ShieldCheck, Zap, Target
} from "lucide-react";
import api from "../services/api";







export default function UploadPage({ user }) {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [step, setStep] = useState("idle");
  const [error, setError] = useState("");

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleSubmit = async () => {
    if (!file || !jobDescription) return;
    setError("");
    setStep("uploading");

    try {
      // 1. Upload file to our backend
      const formData = new FormData();
      formData.append("file", file);
      
      const uploadFileRes = await api.post("/resumes/file", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      const fileUrl = uploadFileRes.data.fileUrl;

      setStep("parsing");
      
      // 2. Create resume entry and job entry
      const [uploadRes, jobRes] = await Promise.all([
        api.post("/resumes/upload", { fileUrl, fileName: file.name }),
        api.post("/jobs", { title: jobTitle || "Target Job", company: jobCompany, description: jobDescription })
      ]);

      const rId = uploadRes.data.id;
      const jId = jobRes.data.id;

      setStep("analyzing");
      await api.post("/resumes/analyze", { resumeId: rId, jobId: jId });

      setStep("done");
      setTimeout(() => navigate(`/dashboard`), 1500);
    } catch (err) {
      console.error(err);
      setError(_optionalChain([err, 'access', _ => _.response, 'optionalAccess', _2 => _2.data, 'optionalAccess', _3 => _3.error]) || err.message || "Something went wrong. Please try again.");
      setStep("error");
    }
  };

  const isProcessing = ["uploading", "parsing", "analyzing"].includes(step);

  return (
    React.createElement('div', { className: "min-h-screen bg-background pb-20"  ,}
      /* Nav */
      , React.createElement('nav', { className: "fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl"        ,}
        , React.createElement('div', { className: "container mx-auto px-6 h-20 flex items-center justify-between"      ,}
          , React.createElement(Link, { to: "/", className: "flex items-center gap-3"  ,}
            , React.createElement('div', { className: "w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse-glow"           ,}
              , React.createElement(Brain, { size: 20, className: "text-white",} )
            )
            , React.createElement('span', { className: "font-extrabold text-xl tracking-tight uppercase"   ,}, "Resume"
              , React.createElement('span', { className: "premium-gradient-text tracking-widest" ,}, "AI")
            )
          )
          , React.createElement('div', { className: "flex items-center gap-4"  ,}
             , React.createElement('span', { className: "text-xs font-bold text-muted uppercase tracking-widest mr-4"     ,}, _optionalChain([user, 'optionalAccess', _4 => _4.email]))
             , React.createElement(Link, { to: "/dashboard", className: "btn-premium-outline !py-2 !px-5 !text-xs"   ,}, "Dashboard")
          )
        )
      )

      , React.createElement('main', { className: "container mx-auto px-6 pt-32 max-w-4xl"    ,}
        , React.createElement(motion.div, { 
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          className: "text-center mb-16" ,}

          , React.createElement('h1', { className: "text-4xl md:text-5xl font-black mb-4 tracking-tight text-white"     ,}, "Strategic "
             , React.createElement('span', { className: "premium-gradient-text",}, "Ingestion")
          )
          , React.createElement('p', { className: "text-dimmed text-lg font-medium max-w-xl mx-auto"    ,}, "Upload your resume and target role to begin the multi-dimensional alignment analysis."

          )
        )

        , React.createElement('div', { className: "grid gap-8" ,}
          /* File Upload Area */
          , React.createElement(motion.div, { 
            initial: { opacity: 0, scale: 0.98 },
            animate: { opacity: 1, scale: 1 },
            transition: { delay: 0.1 },
            className: "glass-card p-10 relative overflow-hidden group"    ,}

            , React.createElement('div', { className: "absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity"       ,}
              , React.createElement(Upload, { size: 120,} )
            )

            , React.createElement('div', { className: "flex items-center gap-4 mb-8"   ,}
              , React.createElement('div', { className: "w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20"        ,}
                , React.createElement(FileText, { size: 20, className: "text-primary",} )
              )
              , React.createElement('h3', { className: "text-xl font-bold uppercase tracking-widest text-white/90"    ,}, "01. Document Upload"  )
            )

            , React.createElement('div', {
              ...getRootProps(),
              className: `relative border-2 border-dashed rounded-3xl p-16 text-center transition-all cursor-pointer bg-white/[0.01] hover:bg-white/[0.03] ${
                isDragActive ? "border-primary bg-primary/5" : "border-white/10"
              } ${file ? "border-accent/40 bg-accent/5" : ""}`,}

              , React.createElement('input', { ...getInputProps(),} )
              , React.createElement(AnimatePresence, { mode: "wait",}
                , file ? (
                  React.createElement(motion.div, { 
                    key: "file",
                    initial: { opacity: 0, scale: 0.9 },
                    animate: { opacity: 1, scale: 1 },
                    exit: { opacity: 0, scale: 0.9 },
                    className: "flex flex-col items-center"  ,}

                    , React.createElement('div', { className: "w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-accent/20"         ,}
                      , React.createElement(CheckCircle, { size: 32, className: "text-accent",} )
                    )
                    , React.createElement('p', { className: "text-xl font-black text-white mb-2"   ,}, file.name)
                    , React.createElement('p', { className: "text-xs font-bold uppercase tracking-[0.2em] text-accent/60"    ,}
                      , (file.size / 1024).toFixed(0), " KB READY // CLICK TO SWAP"
                    )
                  )
                ) : (
                  React.createElement(motion.div, { 
                    key: "upload",
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    className: "flex flex-col items-center"  ,}

                    , React.createElement('div', { className: "w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/20 group-hover:bg-primary/20 transition-colors"           ,}
                      , React.createElement(CloudUpload, { size: 32, className: "text-primary opacity-70 group-hover:opacity-100 transition-opacity"   ,} )
                    )
                    , React.createElement('p', { className: "text-lg font-bold mb-2"  ,}
                       , isDragActive ? "Inbound Transmission Detected" : "Drag & Drop Vector Source"
                    )
                    , React.createElement('p', { className: "text-xs font-bold uppercase tracking-[0.2em] text-dimmed"    ,}, "PDF // MAX 10MB // ENCRYPTED"

                    )
                  )
                )
              )
            )
          )

          /* Job Details Area */
          , React.createElement(motion.div, { 
             initial: { opacity: 0, scale: 0.98 },
             animate: { opacity: 1, scale: 1 },
             transition: { delay: 0.2 },
             className: "glass-card p-10 relative overflow-hidden group"    ,}

             , React.createElement('div', { className: "absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity"       ,}
              , React.createElement(Briefcase, { size: 120,} )
            )

            , React.createElement('div', { className: "flex items-center gap-4 mb-10"   ,}
              , React.createElement('div', { className: "w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20"        ,}
                , React.createElement(Target, { size: 20, className: "text-secondary",} )
              )
              , React.createElement('h3', { className: "text-xl font-bold uppercase tracking-widest text-white/90"    ,}, "02. Alignment Target"  )
            )

            , React.createElement('div', { className: "grid md:grid-cols-2 gap-8 mb-8"   ,}
              , React.createElement('div', { className: "space-y-3",}
                , React.createElement('label', { className: "text-[10px] font-black uppercase tracking-widest text-dimmed/80 ml-1"     ,}, "Job Title Vector"  )
                , React.createElement('input', {
                  className: "input-field",
                  placeholder: "e.g. Lead System Architect"   ,
                  value: jobTitle,
                  onChange: (e) => setJobTitle(e.target.value),}
                )
              )
              , React.createElement('div', { className: "space-y-3",}
                , React.createElement('label', { className: "text-[10px] font-black uppercase tracking-widest text-dimmed/80 ml-1"     ,}, "Market Identity (Optional)"  )
                , React.createElement('input', {
                  className: "input-field",
                  placeholder: "e.g. OpenAI // Tesla"   ,
                  value: jobCompany,
                  onChange: (e) => setJobCompany(e.target.value),}
                )
              )
            )

            , React.createElement('div', { className: "space-y-3",}
                , React.createElement('label', { className: "text-[10px] font-black uppercase tracking-widest text-dimmed/80 ml-1"     ,}, "Role Description / Requirements Matrix *"     )
                , React.createElement('textarea', {
                  className: "w-full bg-white/[0.03] border border-white/5 focus:border-primary/50 focus:bg-white/[0.05] rounded-2xl px-6 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-muted/40 min-h-[160px] resize-none leading-relaxed"                 ,
                  placeholder: "Paste the full job specification here to begin neural mapping..."         ,
                  value: jobDescription,
                  onChange: (e) => setJobDescription(e.target.value),}
                )
            )
          )

          /* Status Indicators */
          , React.createElement(AnimatePresence, null
            , step !== "idle" && (
              React.createElement(motion.div, { 
                initial: { opacity: 0, height: 0 },
                animate: { opacity: 1, height: "auto" },
                exit: { opacity: 0, height: 0 },
                className: "overflow-hidden",}

                , React.createElement('div', { className: `glass-card p-6 border-l-4 flex items-center justify-between ${
                  step === "error" ? "border-red-500 bg-red-500/5" : 
                  step === "done" ? "border-accent bg-accent/5" : 
                  "border-primary bg-primary/5"
                }`,}
                  , React.createElement('div', { className: "flex items-center gap-4"  ,}
                    , step === "error" ? (
                      React.createElement(AlertCircle, { size: 20, className: "text-red-400",} )
                    ) : step === "done" ? (
                      React.createElement(CheckCircle, { size: 20, className: "text-accent",} )
                    ) : (
                      React.createElement('div', { className: "spinner !border-white/10 !border-t-primary"  ,} )
                    )
                    , React.createElement('div', null
                      , React.createElement('p', { className: `text-xs font-bold uppercase tracking-widest ${
                        step === "error" ? "text-red-300" : 
                        step === "done" ? "text-accent" : 
                        "text-primary"
                      }`,}
                        , step === "uploading" ? "Syncing Document to Cloud Node" :
                         step === "parsing" ? "Neural Structure Decomposition" :
                         step === "analyzing" ? "Cross-Alignment Execution" :
                         step === "done" ? "Path Alignment Secured" :
                         error
                      )
                    )
                  )
                )
              )
            )
          )

          /* Large Action Button */
          , React.createElement(motion.div, {
             whileHover: { scale: 1.01 },
             whileTap: { scale: 0.99 },}

            , React.createElement('button', {
              className: "btn-premium w-full py-6 text-xl justify-center font-black tracking-widest shadow-2xl shadow-primary/40 group overflow-hidden"          ,
              onClick: handleSubmit,
              disabled: !file || !jobDescription || isProcessing,}

              , React.createElement('div', { className: "absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out skew-x-12"        ,} )
              , React.createElement('div', { className: "flex items-center gap-4 relative z-10"    ,}
                , isProcessing ? (
                  React.createElement(React.Fragment, null
                    , React.createElement(Zap, { size: 24, className: "animate-pulse text-white" ,} ), "SYSTEM OCCUPIED"

                  )
                ) : (
                  React.createElement(React.Fragment, null
                    , React.createElement(Brain, { size: 24,} ), "EXECUTE ANALYSIS"

                    , React.createElement(ArrowRight, { size: 24, className: "group-hover:translate-x-2 transition-transform" ,} )
                  )
                )
              )
            )
          )

          /* Footer Hint */
          , React.createElement('div', { className: "flex items-center justify-center gap-6 mt-4"    ,}
             , React.createElement('div', { className: "flex items-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default"       ,}
                , React.createElement(ShieldCheck, { size: 14,} )
                , React.createElement('span', { className: "text-[9px] font-black uppercase tracking-[0.3em]"   ,}, "End-to-End Encrypted" )
             )
             , React.createElement('div', { className: "w-[1px] h-3 bg-white/10"  ,} )
             , React.createElement('div', { className: "flex items-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default"       ,}
                , React.createElement(Sparkles, { size: 14,} )
                , React.createElement('span', { className: "text-[9px] font-black uppercase tracking-[0.3em]"   ,}, "Neural Precision v2.4"  )
             )
          )
        )
      )
    )
  );
}

