import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Brain, FileText, Plus, Search, 
  Clock, BarChart3, ChevronRight, Zap, Trash2
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

export default function DashboardPage({ user }: { user: any }) {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const handleDeleteResume = async (resumeId: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Delete resume history for \"${fileName}\"?`);
    if (!confirmed) return;

    try {
      setDeletingId(resumeId);
      await api.delete(`/resumes/${resumeId}`);
      setResumes((prev) => prev.filter((r) => r.id !== resumeId));
      setAnalytics((prev: any) =>
        prev ? { ...prev, totalResumes: Math.max(0, (prev.totalResumes || 0) - 1) } : prev
      );
      toast.success("Resume history deleted.");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete resume history.");
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
      setAnalytics((prev: any) => (prev ? { ...prev, totalResumes: 0, avgScore: 0 } : prev));
      toast.success("All resume history cleared.");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to clear history.");
    } finally {
      setClearingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="spinner !w-12 !h-12 border-4" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white pb-20">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Brain size={20} className="text-white" />
              </div>
            <span className="font-extrabold text-xl tracking-tight uppercase">
              Resume<span className="premium-gradient-text tracking-widest">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-xs font-bold text-dimmed uppercase tracking-widest hidden md:block">{user?.email}</span>
            <button onClick={handleLogout} className="btn-premium-outline !py-2 !px-5 !text-xs">Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 pt-32">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2">Command <span className="premium-gradient-text">Center</span></h1>
            <p className="text-dimmed font-medium">Manage and analyze your strategic career assets.</p>
          </div>
          <Link to="/upload" className="btn-premium flex items-center gap-2">
            <Plus size={20} />
            New Analysis
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-card p-8 group">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
              <FileText size={24} className="text-primary" />
            </div>
            <p className="text-4xl font-black mb-1">{analytics?.totalResumes || 0}</p>
            <p className="text-xs font-bold uppercase tracking-widest text-dimmed">Total Resumes</p>
          </div>
          <div className="glass-card p-8 group">
             <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 border border-accent/20">
              <Zap size={24} className="text-accent" />
            </div>
            <p className="text-4xl font-black mb-1">{Math.round(analytics?.avgScore || 0)}%</p>
            <p className="text-xs font-bold uppercase tracking-widest text-dimmed">Avg Match Score</p>
          </div>
          <div className="glass-card p-8 group">
             <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
              <BarChart3 size={24} className="text-secondary" />
            </div>
            <p className="text-4xl font-black mb-1">{analytics?.topMissingSkills?.length || 0}</p>
            <p className="text-xs font-bold uppercase tracking-widest text-dimmed">Skills Tracked</p>
          </div>
        </div>

        {/* Resumes List */}
        <div className="space-y-4">
          <div className="mb-6 px-2 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold uppercase tracking-widest flex items-center gap-3">
               <Clock size={18} className="text-primary" /> Recent Activities
            </h2>
            <button
              onClick={handleClearAllHistory}
              disabled={clearingAll || resumes.length === 0}
              className="btn-premium-outline !py-2 !px-4 !text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearingAll ? "Clearing..." : "Clear History"}
            </button>
          </div>
          
          {resumes.length === 0 ? (
            <div className="glass-card p-20 text-center border-dashed">
               <FileText size={48} className="text-dimmed/20 mx-auto mb-6" />
               <p className="text-dimmed font-medium">No analysis data found. Ready to start?</p>
               <Link to="/upload" className="text-primary font-bold hover:underline mt-4 inline-block">Upload your first resume</Link>
            </div>
          ) : (
            resumes.map((resume) => (
              <motion.div 
                key={resume.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.005, backgroundColor: "var(--bg-card-hover)" }}
                onClick={() => navigate(`/dashboard/${resume.id}`)}
                className="glass-card p-6 flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    <FileText size={24} className="text-dimmed group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{resume.fileName}</h3>
                    <div className="flex items-center gap-4 mt-1">
                       <span className={`text-[10px] font-black uppercase tracking-widest py-1 px-2 rounded-md ${
                         resume.status === 'COMPLETED' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
                       }`}>
                         {resume.status}
                       </span>
                       <span className="text-[10px] text-dimmed font-bold uppercase tracking-widest">
                         {new Date(resume.createdAt).toLocaleDateString()}
                       </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <button
                    onClick={(e) => handleDeleteResume(resume.id, resume.fileName, e)}
                    disabled={deletingId === resume.id}
                    className="p-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete this history item"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="text-right hidden sm:block">
                     <p className="text-2xl font-black">{Math.round(resume.matchResults[0]?.matchPercentage || 0)}%</p>
                     <p className="text-[10px] font-bold uppercase tracking-widest text-dimmed">Best Match</p>
                  </div>
                  <ChevronRight size={20} className="text-dimmed group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
