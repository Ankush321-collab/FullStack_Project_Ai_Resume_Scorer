import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, Upload, FileText, Briefcase, 
  CheckCircle, AlertCircle, CloudUpload, 
  ArrowRight, Sparkles, ShieldCheck, Zap, Target
} from "lucide-react";
import api from "../services/api";

type Step = "idle" | "uploading" | "parsing" | "analyzing" | "done" | "error";

interface UploadPageProps {
  user: any;
}

export default function UploadPage({ user }: UploadPageProps) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");

  const onDrop = useCallback((accepted: File[]) => {
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
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || "Something went wrong. Please try again.");
      setStep("error");
    }
  };

  const isProcessing = ["uploading", "parsing", "analyzing"].includes(step);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse-glow">
              <Brain size={20} className="text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight uppercase">
              Resume<span className="premium-gradient-text tracking-widest">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
             <span className="text-xs font-bold text-muted uppercase tracking-widest mr-4">{user?.email}</span>
             <Link to="/dashboard" className="btn-premium-outline !py-2 !px-5 !text-xs">Dashboard</Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 pt-32 max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-white">
            Strategic <span className="premium-gradient-text">Ingestion</span>
          </h1>
          <p className="text-dimmed text-lg font-medium max-w-xl mx-auto">
            Upload your resume and target role to begin the multi-dimensional alignment analysis.
          </p>
        </motion.div>

        <div className="grid gap-8">
          {/* File Upload Area */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-10 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
              <Upload size={120} />
            </div>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <FileText size={20} className="text-primary" />
              </div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-white/90">01. Document Upload</h3>
            </div>

            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-3xl p-16 text-center transition-all cursor-pointer bg-white/[0.01] hover:bg-white/[0.03] ${
                isDragActive ? "border-primary bg-primary/5" : "border-white/10"
              } ${file ? "border-accent/40 bg-accent/5" : ""}`}
            >
              <input {...getInputProps()} />
              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div 
                    key="file"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-accent/20">
                      <CheckCircle size={32} className="text-accent" />
                    </div>
                    <p className="text-xl font-black text-white mb-2">{file.name}</p>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent/60">
                      {(file.size / 1024).toFixed(0)} KB READY // CLICK TO SWAP
                    </p>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="upload"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                      <CloudUpload size={32} className="text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-lg font-bold mb-2">
                       {isDragActive ? "Inbound Transmission Detected" : "Drag & Drop Vector Source"}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-dimmed">
                        PDF // MAX 10MB // ENCRYPTED
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Job Details Area */}
          <motion.div 
             initial={{ opacity: 0, scale: 0.98 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.2 }}
             className="glass-card p-10 relative overflow-hidden group"
          >
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
              <Briefcase size={120} />
            </div>

            <div className="flex items-center gap-4 mb-10">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Target size={20} className="text-secondary" />
              </div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-white/90">02. Alignment Target</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-dimmed/80 ml-1">Job Title Vector</label>
                <input
                  className="input-field"
                  placeholder="e.g. Lead System Architect"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-dimmed/80 ml-1">Market Identity (Optional)</label>
                <input
                  className="input-field"
                  placeholder="e.g. OpenAI // Tesla"
                  value={jobCompany}
                  onChange={(e) => setJobCompany(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-dimmed/80 ml-1">Role Description / Requirements Matrix *</label>
                <textarea
                  className="w-full bg-white/[0.03] border border-white/5 focus:border-primary/50 focus:bg-white/[0.05] rounded-2xl px-6 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-muted/40 min-h-[160px] resize-none leading-relaxed"
                  placeholder="Paste the full job specification here to begin neural mapping..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
            </div>
          </motion.div>

          {/* Status Indicators */}
          <AnimatePresence>
            {step !== "idle" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={`glass-card p-6 border-l-4 flex items-center justify-between ${
                  step === "error" ? "border-red-500 bg-red-500/5" : 
                  step === "done" ? "border-accent bg-accent/5" : 
                  "border-primary bg-primary/5"
                }`}>
                  <div className="flex items-center gap-4">
                    {step === "error" ? (
                      <AlertCircle size={20} className="text-red-400" />
                    ) : step === "done" ? (
                      <CheckCircle size={20} className="text-accent" />
                    ) : (
                      <div className="spinner !border-white/10 !border-t-primary" />
                    )}
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-widest ${
                        step === "error" ? "text-red-300" : 
                        step === "done" ? "text-accent" : 
                        "text-primary"
                      }`}>
                        {step === "uploading" ? "Syncing Document to Cloud Node" :
                         step === "parsing" ? "Neural Structure Decomposition" :
                         step === "analyzing" ? "Cross-Alignment Execution" :
                         step === "done" ? "Path Alignment Secured" :
                         error}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Large Action Button */}
          <motion.div
             whileHover={{ scale: 1.01 }}
             whileTap={{ scale: 0.99 }}
          >
            <button
              className="btn-premium w-full py-6 text-xl justify-center font-black tracking-widest shadow-2xl shadow-primary/40 group overflow-hidden"
              onClick={handleSubmit}
              disabled={!file || !jobDescription || isProcessing}
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out skew-x-12" />
              <div className="flex items-center gap-4 relative z-10">
                {isProcessing ? (
                  <>
                    <Zap size={24} className="animate-pulse text-white" />
                    SYSTEM OCCUPIED
                  </>
                ) : (
                  <>
                    <Brain size={24} />
                    EXECUTE ANALYSIS
                    <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </motion.div>

          {/* Footer Hint */}
          <div className="flex items-center justify-center gap-6 mt-4">
             <div className="flex items-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
                <ShieldCheck size={14} />
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">End-to-End Encrypted</span>
             </div>
             <div className="w-[1px] h-3 bg-white/10" />
             <div className="flex items-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
                <Sparkles size={14} />
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Neural Precision v2.4</span>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
