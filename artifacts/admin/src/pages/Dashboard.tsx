import { useState, useEffect, Fragment, useRef, useCallback } from "react";
import nexPointLogo from "@assets/ChatGPT_Image_Apr_23,_2026,_05_53_31_PM_1776947023096.png";
import { clearAuth, getUsername, adminFetch, API } from "@/lib/auth";
import { useListLeads } from "@workspace/api-client-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LogOut, Users, Flame, Zap, TrendingUp, Snowflake,
  RefreshCw, Search, BarChart3, Building2, Sheet, ExternalLink,
  Phone, MessageSquare, Mail, UserCheck, MailOpen, Target, Clock,
  ChevronDown, ChevronRight, Play, Sparkles, Layers, CheckCircle2,
  AlertCircle, Timer, Calendar, Download, BrainCircuit, FileText,
  Filter
} from "lucide-react";

const SEGMENT_COLORS: Record<string, string> = {
  hot: "#ef4444",
  warm: "#f97316",
  nurture: "#3b82f6",
  cold: "#6b7280",
};

const CHART_COLORS = ["#3b82f6", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const SEGMENT_ICONS: Record<string, any> = {
  hot: Flame,
  warm: Zap,
  nurture: TrendingUp,
  cold: Snowflake,
};

function SegmentBadge({ segment }: { segment: string }) {
  const map: Record<string, string> = {
    hot: "bg-red-500/20 text-red-400 border-red-500/30",
    warm: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    nurture: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    cold: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  const icons: Record<string, string> = { hot: "🔥", warm: "⚡", nurture: "📈", cold: "❄️" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${map[segment] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
      {icons[segment]} {segment.charAt(0).toUpperCase() + segment.slice(1)}
    </span>
  );
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-5 text-right">{value}</span>
    </div>
  );
}

function ctaLabel(formType: string | null | undefined, campaign: string | null | undefined): string {
  if (campaign?.startsWith("pricing_")) return "Pricing";
  if (campaign?.includes("homepage_trial")) return "Trial";
  if (campaign?.includes("homepage_demo")) return "Demo";
  if (campaign?.includes("summit") || campaign?.includes("event") || campaign?.includes("growth_summit")) return "Event";
  if (formType === "free_trial") return "Trial";
  if (formType === "demo_request") return "Demo";
  if (formType === "event_registration") return "Event";
  return formType ?? "—";
}

type DatePreset = "today" | "7d" | "30d" | "90d" | "all";

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d",    label: "Last 7 Days" },
  { key: "30d",   label: "Last 30 Days" },
  { key: "90d",   label: "Last 90 Days" },
  { key: "all",   label: "All Time" },
];

function presetToSince(preset: DatePreset): Date | null {
  const now = new Date();
  if (preset === "today")  { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
  if (preset === "7d")  return new Date(now.getTime() - 7  * 86400000);
  if (preset === "30d") return new Date(now.getTime() - 30 * 86400000);
  if (preset === "90d") return new Date(now.getTime() - 90 * 86400000);
  return null;
}

function computeStatsFromLeads(rawLeads: any[]): Stats {
  const total = rawLeads.length;
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const recent_7d = rawLeads.filter(l => new Date(l.created_at) >= sevenDaysAgo).length;
  const avg_total_score   = total > 0 ? Math.round(rawLeads.reduce((s, l) => s + (l.total_score ?? 0), 0) / total) : 0;
  const avg_intent_score  = total > 0 ? Math.round(rawLeads.reduce((s, l) => s + (l.intent_score ?? 0), 0) / total) : 0;
  const avg_fit_score     = total > 0 ? Math.round(rawLeads.reduce((s, l) => s + (l.fit_score ?? 0), 0) / total) : 0;
  const segment_counts    = rawLeads.reduce<Record<string, number>>((acc, l) => { acc[l.segment] = (acc[l.segment] ?? 0) + 1; return acc; }, {});
  const industry_counts   = rawLeads.reduce<Record<string, number>>((acc, l) => { const k = l.industry ?? "Unknown"; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
  const source_counts     = rawLeads.reduce<Record<string, number>>((acc, l) => { const k = l.referral_source ?? l.lead_source ?? "Direct"; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
  const form_type_counts  = rawLeads.reduce<Record<string, number>>((acc, l) => { const k = l.form_type ?? "Unknown"; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
  const score_distribution = [
    { range: "0–20",   count: rawLeads.filter(l => (l.total_score ?? 0) <= 20).length },
    { range: "21–40",  count: rawLeads.filter(l => (l.total_score ?? 0) > 20 && (l.total_score ?? 0) <= 40).length },
    { range: "41–60",  count: rawLeads.filter(l => (l.total_score ?? 0) > 40 && (l.total_score ?? 0) <= 60).length },
    { range: "61–80",  count: rawLeads.filter(l => (l.total_score ?? 0) > 60 && (l.total_score ?? 0) <= 80).length },
    { range: "81–100", count: rawLeads.filter(l => (l.total_score ?? 0) > 80).length },
  ];
  return { total, recent_7d, avg_total_score, avg_intent_score, avg_fit_score, segment_counts, industry_counts, source_counts, form_type_counts, score_distribution };
}

interface InsightData {
  period: string;
  periodLabel: string;
  bullets: string[];
  summary: { newLeads: number; hot: number; warm: number; avgScore: number; deliveredActions: number; failedActions: number };
  generatedAt: string;
}

interface Stats {
  total: number;
  recent_7d: number;
  avg_total_score: number;
  avg_intent_score: number;
  avg_fit_score: number;
  segment_counts: Record<string, number>;
  industry_counts: Record<string, number>;
  source_counts: Record<string, number>;
  form_type_counts: Record<string, number>;
  score_distribution: { range: string; count: number }[];
}

interface WorkflowSummary {
  total: number; delivered: number; pending: number;
  scheduled: number; failed: number; overdue: number; healthScore: number;
}
interface WorkflowByType {
  actionType: string; label: string;
  total: number; delivered: number; pending: number;
  scheduled: number; failed: number; overdue: number;
}
interface WorkflowPendingAction {
  id: number; leadId: number; leadName: string | null; email: string | null;
  companyName: string | null; jobTitle: string | null;
  actionType: string; label: string; segment: string; status: string;
  createdAt: string; slaMins: number | null; ageMins: number;
  overdue: boolean; overdueByMins: number;
}
interface WorkflowHealth {
  summary: WorkflowSummary;
  byType: WorkflowByType[];
  pendingActions: WorkflowPendingAction[];
  generatedAt: string;
}

function fmtAge(mins: number): string {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ${mins % 60}m`;
  return `${Math.round(mins / 1440)}d`;
}

const ACTION_META: Record<string, { icon: any; label: string; color: string }> = {
  immediate_sales_call:  { icon: Phone,          label: "Sales Call",          color: "text-red-400" },
  telegram_outreach:     { icon: MessageSquare,   label: "Telegram",            color: "text-blue-400" },
  whatsapp_outreach:     { icon: MessageSquare,   label: "WhatsApp (legacy)",   color: "text-green-400" },
  email_outreach:        { icon: Mail,            label: "Email Outreach",      color: "text-blue-400" },
  sdr_followup:          { icon: UserCheck,       label: "SDR Follow-Up",       color: "text-orange-400" },
  drip_email_day0:       { icon: MailOpen,        label: "Drip Day 0",          color: "text-violet-400" },
  drip_email_day3:       { icon: MailOpen,        label: "Drip Day 3",          color: "text-violet-400" },
  drip_email_day7:       { icon: MailOpen,        label: "Drip Day 7",          color: "text-violet-400" },
  drip_email_day14:      { icon: MailOpen,        label: "Drip Day 14",         color: "text-violet-400" },
  retargeting_trigger:   { icon: Target,          label: "Retargeting",         color: "text-cyan-400" },
  cold_drip:             { icon: Clock,           label: "Cold Drip",           color: "text-gray-400" },
  periodic_reeval:       { icon: RefreshCw,       label: "Re-Evaluation",       color: "text-gray-400" },
};

const STATUS_META: Record<string, { icon: any; label: string; cls: string }> = {
  success:   { icon: CheckCircle2, label: "Success",   cls: "text-green-400 bg-green-500/10 border-green-500/25" },
  delivered: { icon: CheckCircle2, label: "Delivered", cls: "text-green-400 bg-green-500/10 border-green-500/25" },
  pending:   { icon: Timer,        label: "Pending",    cls: "text-orange-400 bg-orange-500/10 border-orange-500/25" },
  scheduled: { icon: Calendar,     label: "Scheduled",  cls: "text-blue-400 bg-blue-500/10 border-blue-500/25" },
  failed:    { icon: AlertCircle,  label: "Failed",     cls: "text-red-400 bg-red-500/10 border-red-500/25" },
};

function ActionStatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.pending;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${m.cls}`}>
      <Icon className="w-2.5 h-2.5" /> {m.label}
    </span>
  );
}

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const username = getUsername();
  const [search, setSearch] = useState("");
  const [segFilter, setSegFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  const [leadActions, setLeadActions] = useState<any[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [pdfingDashboard, setPdfingDashboard] = useState(false);

  // Workflow health state
  const [wfHealth, setWfHealth] = useState<WorkflowHealth | null>(null);
  const [wfLoading, setWfLoading] = useState(true);
  const [wfSyncing, setWfSyncing] = useState(false);
  const [wfSyncMsg, setWfSyncMsg] = useState("");

  // Lead insights state
  const [insights, setInsights] = useState<Record<string, InsightData>>({});
  const [insightsLoading, setInsightsLoading] = useState<Record<string, boolean>>({});
  const [activeInsightPeriod, setActiveInsightPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [pdfingInsights, setPdfingInsights] = useState(false);
  const insightsRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const { data: leads = [], isLoading, refetch, isFetching } = useListLeads();

  async function loadStats() {
    setStatsLoading(true);
    try {
      const res = await adminFetch("/admin/stats");
      if (res.ok) setStats(await res.json());
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadWorkflowHealth() {
    setWfLoading(true);
    try {
      const res = await adminFetch("/admin/workflow-health");
      if (res.ok) setWfHealth(await res.json());
    } finally {
      setWfLoading(false);
    }
  }

  async function handleSyncWorkflowHealth() {
    setWfSyncing(true);
    setWfSyncMsg("");
    try {
      const res = await adminFetch("/admin/sheets/workflow-health-sync", { method: "POST" });
      const data = await res.json() as any;
      if (res.ok) {
        setWfSyncMsg("Synced to Google Sheets");
        await loadWorkflowHealth();
      } else {
        setWfSyncMsg(data.error ?? "Sync failed");
      }
    } catch {
      setWfSyncMsg("Network error — sync failed");
    } finally {
      setWfSyncing(false);
      setTimeout(() => setWfSyncMsg(""), 6000);
    }
  }

  useEffect(() => {
    loadStats();
    loadWorkflowHealth();
    loadInsights("weekly");
    adminFetch("/admin/sheets/info")
      .then(r => r.json())
      .then((d: any) => { if (d.exists) setSheetUrl(d.url); })
      .catch(() => {});
  }, []);

  async function handleSyncSheets() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await adminFetch("/admin/sheets/sync", { method: "POST" });
      const data = await res.json() as any;
      if (res.ok) {
        setSheetUrl(data.url);
        setSyncMsg(`Synced ${data.rowCount} lead${data.rowCount !== 1 ? "s" : ""} to Google Sheets`);
      } else {
        setSyncMsg(data.error ?? "Sync failed");
      }
    } catch {
      setSyncMsg("Network error — sync failed");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 6000);
    }
  }

  function handleRefresh() {
    refetch();
    loadStats();
    loadWorkflowHealth();
  }

  async function loadLeadActions(leadId: number) {
    setActionsLoading(true);
    try {
      const res = await adminFetch(`/leads/${leadId}/actions`);
      if (res.ok) setLeadActions(await res.json());
      else setLeadActions([]);
    } finally {
      setActionsLoading(false);
    }
  }

  function toggleLeadExpand(leadId: number) {
    if (expandedLeadId === leadId) {
      setExpandedLeadId(null);
      setLeadActions([]);
    } else {
      setExpandedLeadId(leadId);
      loadLeadActions(leadId);
    }
  }

  async function handleTriggerActions(leadId: number) {
    setTriggering(true);
    try {
      const res = await adminFetch(`/leads/${leadId}/trigger-actions`, { method: "POST" });
      if (res.ok) await loadLeadActions(leadId);
    } finally {
      setTriggering(false);
    }
  }

  async function loadInsights(period: string) {
    if (insights[period] || insightsLoading[period]) return;
    setInsightsLoading(prev => ({ ...prev, [period]: true }));
    try {
      const res = await adminFetch(`/admin/insights?period=${period}`);
      if (res.ok) {
        const data = await res.json() as InsightData;
        setInsights(prev => ({ ...prev, [period]: data }));
      }
    } finally {
      setInsightsLoading(prev => ({ ...prev, [period]: false }));
    }
  }

  async function refreshInsights(period: string) {
    setInsights(prev => { const next = { ...prev }; delete next[period]; return next; });
    setInsightsLoading(prev => ({ ...prev, [period]: false }));
    await loadInsights(period);
  }

  async function downloadInsightsPDF(period: string) {
    if (!insightsRef.current) return;
    setPdfingInsights(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(insightsRef.current, { scale: 2, backgroundColor: "#0f1623", useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`nexpoint-insights-${period}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setPdfingInsights(false);
    }
  }

  async function downloadDashboardPDF() {
    if (!dashboardRef.current) return;
    setPdfingDashboard(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(dashboardRef.current, { scale: 1.5, backgroundColor: "#0f1623", useCORS: true, windowHeight: dashboardRef.current.scrollHeight });
      const imgData = canvas.toDataURL("image/png");
      const pdfW = 1190;
      const pdfH = Math.round((canvas.height / canvas.width) * pdfW);
      const pdf = new jsPDF({ orientation: pdfW > pdfH ? "landscape" : "portrait", unit: "px", format: [pdfW, pdfH] });
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`nexpoint-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setPdfingDashboard(false);
    }
  }

  function handleLogout() {
    clearAuth();
    onLogout();
  }

  const since = presetToSince(datePreset);

  const dateFilteredLeads = since ? leads.filter(l => new Date(l.created_at) >= since) : leads;

  const filtered = dateFilteredLeads.filter(l => {
    const matchSearch = search === "" ||
      l.full_name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.company_name.toLowerCase().includes(search.toLowerCase());
    const matchSeg = segFilter === "all" || l.segment === segFilter;
    return matchSearch && matchSeg;
  });

  const displayStats: Stats | null = datePreset === "all"
    ? stats
    : leads.length > 0 ? computeStatsFromLeads(dateFilteredLeads) : null;

  const segmentData = displayStats
    ? Object.entries(displayStats.segment_counts).map(([name, value]) => ({ name, value }))
    : [];

  const industryData = displayStats
    ? Object.entries(displayStats.industry_counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([name, count]) => ({ name, count }))
    : [];

  const sourceData = displayStats
    ? Object.entries(displayStats.source_counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }))
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <img src={nexPointLogo} alt="Nexpoint" className="h-7 w-auto rounded" />
            <span className="font-semibold text-sm">Nexpoint Admin</span>
            <span className="text-muted-foreground text-xs hidden sm:block">· Lead Intelligence Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">Signed in as <strong>{username}</strong></span>
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition-colors"
              >
                <Sheet className="w-3.5 h-3.5" />
                Open Sheet
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncSheets}
              disabled={syncing}
              className="text-xs h-8 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
            >
              {syncing ? (
                <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Syncing…</>
              ) : (
                <><Sheet className="w-3.5 h-3.5 mr-1.5" /> Sync to Sheets</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadDashboardPDF}
              disabled={pdfingDashboard}
              className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/10"
            >
              {pdfingDashboard ? (
                <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating…</>
              ) : (
                <><Download className="w-3.5 h-3.5 mr-1.5" /> Download PDF</>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isFetching || statsLoading}>
              <RefreshCw className={`w-4 h-4 ${isFetching || statsLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-1.5" /> Sign out
            </Button>
          </div>
          {syncMsg && (
            <div className={`absolute top-14 right-6 text-xs px-3 py-2 rounded-lg border shadow-lg ${syncMsg.includes("failed") || syncMsg.includes("error") ? "bg-destructive/20 text-destructive border-destructive/30" : "bg-green-500/15 text-green-400 border-green-500/25"}`}>
              {syncMsg}
            </div>
          )}
        </div>
      </header>

      <div ref={dashboardRef} className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        {/* Page title + date filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Lead Intelligence</h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time view of all captured leads, scores, and pipeline health</p>
          </div>
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg p-1">
            <Filter className="w-3.5 h-3.5 text-muted-foreground ml-1.5 mr-0.5 shrink-0" />
            {DATE_PRESETS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDatePreset(key)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  datePreset === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total Leads", value: displayStats?.total ?? "—", icon: Users, color: "text-primary", bg: "bg-primary/10" },
            { label: "Hot (SQL)", value: displayStats?.segment_counts?.hot ?? 0, icon: Flame, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "Warm (MQL)", value: displayStats?.segment_counts?.warm ?? 0, icon: Zap, color: "text-orange-400", bg: "bg-orange-500/10" },
            { label: "Nurture", value: displayStats?.segment_counts?.nurture ?? 0, icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Cold", value: displayStats?.segment_counts?.cold ?? 0, icon: Snowflake, color: "text-gray-400", bg: "bg-gray-500/10" },
            { label: "Avg Score", value: displayStats ? `${displayStats.avg_total_score}/100` : "—", icon: BarChart3, color: "text-green-400", bg: "bg-green-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-card-border">
              <CardContent className="pt-5 pb-4 px-4">
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${bg} mb-3`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Secondary metrics */}
        {displayStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-card-border">
              <CardContent className="pt-5 pb-4 px-4">
                <p className="text-xs text-muted-foreground">New Leads (7 days)</p>
                <p className="text-3xl font-bold mt-1">{displayStats.recent_7d}</p>
                <p className="text-xs text-muted-foreground mt-1">leads this week</p>
              </CardContent>
            </Card>
            <Card className="border-card-border">
              <CardContent className="pt-5 pb-4 px-4">
                <p className="text-xs text-muted-foreground">Avg Intent Score</p>
                <p className="text-3xl font-bold mt-1">{displayStats.avg_intent_score}<span className="text-lg text-muted-foreground">/40</span></p>
                <div className="mt-2">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(displayStats.avg_intent_score / 40) * 100}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-card-border">
              <CardContent className="pt-5 pb-4 px-4">
                <p className="text-xs text-muted-foreground">Avg Fit Score</p>
                <p className="text-3xl font-bold mt-1">{displayStats.avg_fit_score}<span className="text-lg text-muted-foreground">/30</span></p>
                <div className="mt-2">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${(displayStats.avg_fit_score / 30) * 100}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts row */}
        {displayStats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Segment pie */}
            <Card className="border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Pipeline by Segment</CardTitle>
                <CardDescription className="text-xs">Lead quality distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={segmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {segmentData.map((entry) => (
                        <Cell key={entry.name} fill={SEGMENT_COLORS[entry.name] ?? "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(222 40% 14%)", border: "1px solid hsl(217 33% 22%)", borderRadius: "8px", fontSize: "12px" }}
                      labelStyle={{ color: "hsl(210 40% 96%)" }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span style={{ fontSize: "11px", color: "hsl(215 20% 60%)" }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Score distribution */}
            <Card className="border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Score Distribution</CardTitle>
                <CardDescription className="text-xs">Leads by total score range</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={displayStats!.score_distribution} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 22%)" />
                    <XAxis dataKey="range" tick={{ fontSize: 10, fill: "hsl(215 20% 60%)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(215 20% 60%)" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(222 40% 14%)", border: "1px solid hsl(217 33% 22%)", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar dataKey="count" fill="hsl(221 83% 58%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Lead source */}
            <Card className="border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Lead Source Breakdown</CardTitle>
                <CardDescription className="text-xs">Where leads discovered Nexpoint</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sourceData} layout="vertical" barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 22%)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(215 20% 60%)" }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10, fill: "hsl(215 20% 60%)" }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(222 40% 14%)", border: "1px solid hsl(217 33% 22%)", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar dataKey="count" fill="hsl(189 94% 43%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Industry chart */}
        {displayStats && industryData.length > 0 && (
          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Industry Breakdown
              </CardTitle>
              <CardDescription className="text-xs">Top industries among captured leads</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={industryData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 22%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(215 20% 60%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(215 20% 60%)" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(222 40% 14%)", border: "1px solid hsl(217 33% 22%)", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {industryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Workflow Monitor ──────────────────────────────────────── */}
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Timer className="w-4 h-4 text-primary" />
                  Workflow Monitor
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Action queue, SLA tracking, and delivery health
                  {wfHealth && (
                    <span className="ml-2 text-[10px] text-muted-foreground/60">
                      · Updated {new Date(wfHealth.generatedAt).toLocaleTimeString()}
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 relative">
                {wfSyncMsg && (
                  <span className={`absolute -top-8 right-0 text-[10px] px-2 py-1 rounded border shadow-md whitespace-nowrap ${
                    wfSyncMsg.includes("failed") || wfSyncMsg.includes("error")
                      ? "bg-destructive/20 text-destructive border-destructive/30"
                      : "bg-green-500/15 text-green-400 border-green-500/25"
                  }`}>{wfSyncMsg}</span>
                )}
                <Button
                  size="sm" variant="outline"
                  onClick={handleSyncWorkflowHealth}
                  disabled={wfSyncing}
                  className="h-8 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                >
                  {wfSyncing
                    ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Syncing…</>
                    : <><Sheet className="w-3.5 h-3.5 mr-1.5" /> Sync to Sheet</>}
                </Button>
                <a
                  href="https://docs.google.com/spreadsheets/d/1mE5u20YienuuUYiihyLIrKiQT0oTtt0TwJCpX3YGLe0"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Workbook
                </a>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={loadWorkflowHealth} disabled={wfLoading}>
                  <RefreshCw className={`w-3.5 h-3.5 ${wfLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {wfLoading && !wfHealth ? (
              <div className="text-xs text-muted-foreground py-6 text-center">Loading workflow data…</div>
            ) : wfHealth ? (
              <>
                {/* KPI summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                  {[
                    { label: "Total Actions",   value: wfHealth.summary.total,     color: "text-primary",    bg: "bg-primary/10" },
                    { label: "Delivered",        value: wfHealth.summary.delivered, color: "text-green-400",  bg: "bg-green-500/10" },
                    { label: "Pending",          value: wfHealth.summary.pending,   color: "text-orange-400", bg: "bg-orange-500/10" },
                    { label: "Scheduled",        value: wfHealth.summary.scheduled, color: "text-blue-400",   bg: "bg-blue-500/10" },
                    { label: "Failed",           value: wfHealth.summary.failed,    color: "text-red-400",    bg: "bg-red-500/10" },
                    { label: "Overdue (past SLA)", value: wfHealth.summary.overdue, color: "text-red-400",    bg: "bg-red-500/10" },
                    {
                      label: "Health Score",
                      value: `${wfHealth.summary.healthScore}%`,
                      color: wfHealth.summary.healthScore >= 80 ? "text-green-400" : wfHealth.summary.healthScore >= 60 ? "text-yellow-400" : "text-red-400",
                      bg: wfHealth.summary.healthScore >= 80 ? "bg-green-500/10" : wfHealth.summary.healthScore >= 60 ? "bg-yellow-500/10" : "bg-red-500/10",
                    },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`rounded-lg border border-border/50 px-3 py-2.5 ${bg}`}>
                      <div className={`text-xl font-bold ${color}`}>{value}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Health score bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Workflow health</span>
                    <span className={
                      wfHealth.summary.healthScore >= 80 ? "text-green-400 font-medium" :
                      wfHealth.summary.healthScore >= 60 ? "text-yellow-400 font-medium" :
                      "text-red-400 font-medium"
                    }>{wfHealth.summary.healthScore}% delivered</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${wfHealth.summary.healthScore}%`,
                        backgroundColor: wfHealth.summary.healthScore >= 80 ? "#22c55e" : wfHealth.summary.healthScore >= 60 ? "#eab308" : "#ef4444",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground/50">
                    <span>0%</span><span>Critical &lt;60%</span><span>Good &gt;80%</span><span>100%</span>
                  </div>
                </div>

                {/* Two-column: by-type breakdown + pending/overdue table */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
                  {/* By-type breakdown */}
                  <div className="xl:col-span-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">By Action Type</p>
                    <div className="rounded-lg border border-border/50 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/30 border-b border-border/50">
                            {["Action", "Done", "Pending", "Sched.", "Failed", "Overdue"].map(h => (
                              <th key={h} className="px-2.5 py-2 text-left text-[10px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {wfHealth.byType.map((t) => (
                            <tr key={t.actionType} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                              <td className="px-2.5 py-2 font-medium text-[10px] whitespace-nowrap">{t.label}</td>
                              <td className="px-2.5 py-2">
                                <span className={t.delivered > 0 ? "text-green-400 font-semibold" : "text-muted-foreground"}>{t.delivered}</span>
                              </td>
                              <td className="px-2.5 py-2">
                                <span className={t.pending > 0 ? "text-orange-400" : "text-muted-foreground"}>{t.pending}</span>
                              </td>
                              <td className="px-2.5 py-2 text-muted-foreground">{t.scheduled}</td>
                              <td className="px-2.5 py-2">
                                <span className={t.failed > 0 ? "text-red-400 font-semibold" : "text-muted-foreground"}>{t.failed}</span>
                              </td>
                              <td className="px-2.5 py-2">
                                <span className={t.overdue > 0 ? "text-red-400 font-bold" : "text-muted-foreground"}>{t.overdue}</span>
                              </td>
                            </tr>
                          ))}
                          {wfHealth.byType.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-2.5 py-4 text-center text-muted-foreground text-[10px]">No actions recorded yet</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pending / overdue actions detail */}
                  <div className="xl:col-span-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Pending & Overdue Queue
                      {wfHealth.pendingActions.length > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/25 text-[9px]">
                          {wfHealth.pendingActions.length}
                        </span>
                      )}
                    </p>
                    <div className="rounded-lg border border-border/50 overflow-hidden max-h-72 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-card z-10">
                          <tr className="bg-muted/40 border-b border-border/50">
                            {["Lead", "Action", "Status", "Age", "SLA", "Overdue By"].map(h => (
                              <th key={h} className="px-2.5 py-2 text-left text-[10px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {wfHealth.pendingActions.map((a) => (
                            <tr
                              key={a.id}
                              className={`border-b border-border/30 transition-colors ${
                                a.overdue
                                  ? "bg-red-500/5 hover:bg-red-500/10 border-l-2 border-l-red-500/50"
                                  : "hover:bg-muted/10"
                              }`}
                            >
                              <td className="px-2.5 py-2">
                                <div className="font-medium text-[10px] whitespace-nowrap">{a.leadName ?? "—"}</div>
                                <div className="text-[9px] text-muted-foreground">{a.companyName ?? ""}</div>
                              </td>
                              <td className="px-2.5 py-2">
                                <div className="text-[10px] whitespace-nowrap">{a.label}</div>
                                <SegmentBadge segment={a.segment} />
                              </td>
                              <td className="px-2.5 py-2">
                                <ActionStatusBadge status={a.status} />
                              </td>
                              <td className="px-2.5 py-2 text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                                {fmtAge(a.ageMins)}
                              </td>
                              <td className="px-2.5 py-2 text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                                {a.slaMins !== null ? fmtAge(a.slaMins) : <span className="italic opacity-50">N/A</span>}
                              </td>
                              <td className="px-2.5 py-2 whitespace-nowrap">
                                {a.overdue ? (
                                  <span className="text-red-400 font-bold text-[10px] font-mono">+{fmtAge(a.overdueByMins)}</span>
                                ) : (
                                  <span className="text-green-400 text-[10px]">On time</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {wfHealth.pendingActions.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-2.5 py-6 text-center text-muted-foreground text-[10px]">
                                <CheckCircle2 className="w-4 h-4 inline mr-1.5 text-green-400" />
                                All actions delivered — no pending items
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {wfHealth.pendingActions.some(a => a.overdue) && (
                      <p className="text-[10px] text-red-400/70 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Red rows have exceeded their SLA. Investigate and re-trigger as needed.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground py-6 text-center">No workflow data available</div>
            )}
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold">All Leads</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {filtered.length} of {leads.length} leads · sorted by score
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search leads…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs w-48 bg-background/50"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {["all", "hot", "warm", "nurture", "cold"].map(seg => (
                    <button
                      key={seg}
                      onClick={() => setSegFilter(seg)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        segFilter === seg
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {seg === "all" ? "All" : seg.charAt(0).toUpperCase() + seg.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-y border-border bg-muted/30">
                    {["", "#", "Name", "Company", "Role", "Industry", "Size", "CTA", "Segment", "Score", "Intent", "Fit", "Behavior", "Source", "Captured"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={15} className="text-center py-12 text-muted-foreground">Loading leads…</td>
                    </tr>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={15} className="text-center py-12 text-muted-foreground">No leads found</td>
                    </tr>
                  )}
                  {filtered.map((lead, i) => {
                    const isExpanded = expandedLeadId === lead.id;
                    return (
                      <Fragment key={lead.id}>
                        <tr
                          onClick={() => toggleLeadExpand(lead.id)}
                          className={`border-b border-border/50 cursor-pointer transition-colors ${isExpanded ? "bg-muted/30" : "hover:bg-muted/20"}`}
                        >
                          <td className="pl-4 pr-1 py-3 text-muted-foreground">
                            {isExpanded
                              ? <ChevronDown className="w-3.5 h-3.5" />
                              : <ChevronRight className="w-3.5 h-3.5" />}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground whitespace-nowrap">{lead.full_name}</div>
                            <div className="text-muted-foreground text-[10px]">{lead.email}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-medium">{lead.company_name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{lead.job_title ?? <span className="italic opacity-50">—</span>}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{lead.industry ?? <span className="italic text-muted-foreground/50">—</span>}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{lead.company_size ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-primary/15 text-primary rounded text-[10px] font-medium whitespace-nowrap">
                              {ctaLabel(lead.form_type, lead.campaign)}
                            </span>
                          </td>
                          <td className="px-4 py-3"><SegmentBadge segment={lead.segment} /></td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-sm text-foreground">{lead.total_score}</span>
                            <span className="text-muted-foreground text-[10px]">/100</span>
                          </td>
                          <td className="px-4 py-3 min-w-[80px]">
                            <ScoreBar value={lead.intent_score} max={40} color="#3b82f6" />
                          </td>
                          <td className="px-4 py-3 min-w-[80px]">
                            <ScoreBar value={lead.fit_score} max={30} color="#06b6d4" />
                          </td>
                          <td className="px-4 py-3 min-w-[80px]">
                            <ScoreBar value={lead.behavior_score} max={20} color="#22c55e" />
                          </td>
                          <td className="px-4 py-3 min-w-[80px]">
                            <ScoreBar value={lead.source_score} max={10} color="#f59e0b" />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                        </tr>

                        {/* Expanded Action Panel */}
                        {isExpanded && (
                          <tr key={`${lead.id}-actions`} className="bg-muted/10 border-b border-border/50">
                            <td colSpan={15} className="px-6 py-4">
                              <div className="space-y-3">
                                {/* Panel header */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                    <Layers className="w-3.5 h-3.5 text-primary" />
                                    Action Log — {lead.full_name}
                                    <SegmentBadge segment={lead.segment} />
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => { e.stopPropagation(); handleTriggerActions(lead.id); }}
                                    disabled={triggering}
                                    className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                                  >
                                    {triggering
                                      ? <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> Running…</>
                                      : <><Play className="w-3 h-3 mr-1.5" /> Trigger Actions</>}
                                  </Button>
                                </div>

                                {/* Action cards grid */}
                                {actionsLoading ? (
                                  <div className="text-xs text-muted-foreground py-4 text-center">Loading actions…</div>
                                ) : leadActions.length === 0 ? (
                                  <div className="text-xs text-muted-foreground py-4 text-center">
                                    No actions triggered yet — click "Trigger Actions" to run the logic layer
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {leadActions.map((action: any) => {
                                      const meta = ACTION_META[action.actionType] ?? { icon: Layers, label: action.actionType, color: "text-muted-foreground" };
                                      const Icon = meta.icon;
                                      const isAI = action.metadata?.messageSource === "ai" || action.metadata?.emailSource === "ai";
                                      const msgLines = action.messageContent?.split("\n").filter(Boolean).slice(0, 4) ?? [];
                                      return (
                                        <div
                                          key={action.id}
                                          className="bg-card border border-border/60 rounded-lg p-3 space-y-2.5 text-xs"
                                        >
                                          {/* Action header */}
                                          <div className="flex items-center justify-between gap-2">
                                            <div className={`flex items-center gap-1.5 font-semibold ${meta.color}`}>
                                              <Icon className="w-3.5 h-3.5" />
                                              {meta.label}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              {isAI && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-500/15 text-violet-400 border border-violet-500/25">
                                                  <Sparkles className="w-2 h-2" /> AI
                                                </span>
                                              )}
                                              <ActionStatusBadge status={action.status} />
                                            </div>
                                          </div>

                                          {/* Scheduled time */}
                                          {action.scheduledAt && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                              <Calendar className="w-3 h-3" />
                                              <span>
                                                {action.status === "scheduled" ? "Scheduled: " : "At: "}
                                                {new Date(action.scheduledAt).toLocaleString("en-US", {
                                                  month: "short", day: "numeric",
                                                  hour: "2-digit", minute: "2-digit"
                                                })}
                                              </span>
                                            </div>
                                          )}

                                          {/* Assignment */}
                                          {action.metadata?.assignedTo && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                              <UserCheck className="w-3 h-3" />
                                              <span>Assigned to: <strong className="text-foreground">{action.metadata.assignedTo}</strong></span>
                                              {action.metadata.priority && (
                                                <span className={`ml-1 px-1 py-0.5 rounded text-[9px] font-medium ${
                                                  action.metadata.priority === "high"
                                                    ? "bg-red-500/10 text-red-400"
                                                    : "bg-orange-500/10 text-orange-400"
                                                }`}>
                                                  {action.metadata.priority}
                                                </span>
                                              )}
                                              {action.metadata.sla && (
                                                <span className="text-[9px] text-muted-foreground ml-1">SLA: {action.metadata.sla}</span>
                                              )}
                                            </div>
                                          )}

                                          {/* AI message preview */}
                                          {msgLines.length > 0 && (
                                            <div className="bg-muted/40 rounded p-2 space-y-1 text-[10px] text-muted-foreground font-mono leading-relaxed border border-border/40">
                                              {msgLines.map((line: string, li: number) => (
                                                <p key={li} className={line.startsWith("Subject:") ? "font-semibold text-foreground" : ""}>{line}</p>
                                              ))}
                                              {(action.messageContent?.split("\n").filter(Boolean).length ?? 0) > 4 && (
                                                <p className="text-[9px] opacity-60">…and more</p>
                                              )}
                                            </div>
                                          )}

                                          {/* Retargeting channels */}
                                          {action.metadata?.channels && (
                                            <div className="flex gap-1">
                                              {action.metadata.channels.map((ch: string) => (
                                                <span key={ch} className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 rounded text-[9px] font-medium capitalize">{ch}</span>
                                              ))}
                                            </div>
                                          )}

                                          {/* Triggered at */}
                                          <div className="text-[9px] text-muted-foreground/50 pt-0.5 border-t border-border/30">
                                            Triggered {new Date(action.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Showing {filtered.length} lead{filtered.length !== 1 ? "s" : ""}</span>
              <span>Last refreshed: {new Date().toLocaleTimeString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* ── Lead Insights ─────────────────────────────────────── */}
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-violet-400" />
                  Lead Insights
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  AI-generated executive intelligence — actionable, period-specific, and board-ready
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="weekly"
              onValueChange={(period) => { setActiveInsightPeriod(period as any); loadInsights(period); }}
            >
              <div className="flex items-center justify-between mb-4">
                <TabsList className="bg-muted/50 border border-border/50">
                  <TabsTrigger value="daily"   className="text-xs px-4">Daily</TabsTrigger>
                  <TabsTrigger value="weekly"  className="text-xs px-4">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs px-4">Monthly</TabsTrigger>
                </TabsList>
              </div>

              {(["daily", "weekly", "monthly"] as const).map(period => (
                <TabsContent key={period} value={period}>
                  {/* Insights card — ref tracks active tab for PDF download */}
                  <div ref={period === activeInsightPeriod ? insightsRef : undefined} className="space-y-4">
                    {insightsLoading[period] ? (
                      <div className="flex items-center gap-3 py-10 justify-center text-muted-foreground">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Generating AI insights…</span>
                      </div>
                    ) : insights[period] ? (
                      <>
                        {/* Summary bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-2">
                          {[
                            { label: "New Leads", value: insights[period].summary.newLeads, color: "text-primary" },
                            { label: "Hot (SQL)", value: insights[period].summary.hot, color: "text-red-400" },
                            { label: "Warm (MQL)", value: insights[period].summary.warm, color: "text-orange-400" },
                            { label: "Avg Score", value: `${insights[period].summary.avgScore}/100`, color: "text-green-400" },
                            { label: "Delivered", value: insights[period].summary.deliveredActions, color: "text-emerald-400" },
                            { label: "Failed", value: insights[period].summary.failedActions, color: insights[period].summary.failedActions > 0 ? "text-red-400" : "text-muted-foreground" },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="bg-muted/30 rounded-lg px-3 py-2.5 border border-border/50">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                              <p className={`text-base font-bold mt-0.5 ${color}`}>{value}</p>
                            </div>
                          ))}
                        </div>

                        {/* AI bullets */}
                        <div className="bg-gradient-to-br from-violet-500/5 to-blue-500/5 border border-violet-500/20 rounded-xl p-5 space-y-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                            <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">AI Analysis — {insights[period].periodLabel}</span>
                          </div>
                          <ul className="space-y-3">
                            {insights[period].bullets.map((bullet, i) => (
                              <li key={i} className="flex gap-3 text-sm text-foreground leading-relaxed">
                                <span className="mt-0.5 w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-[10px] font-bold text-violet-400 shrink-0">
                                  {i + 1}
                                </span>
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Footer: generated at + actions */}
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-[10px] text-muted-foreground">
                            Generated {new Date(insights[period].generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => refreshInsights(period)}
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <RefreshCw className="w-3 h-3 mr-1.5" /> Refresh
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadInsightsPDF(period)}
                              disabled={pdfingInsights}
                              className="h-7 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                            >
                              {pdfingInsights
                                ? <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> Generating…</>
                                : <><FileText className="w-3 h-3 mr-1.5" /> Download PDF</>}
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                        <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                          <BrainCircuit className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">No insights loaded yet</p>
                          <p className="text-xs text-muted-foreground mt-1">Click below to generate AI-powered intelligence for the {period} period</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => loadInsights(period)}
                          className="bg-violet-600 hover:bg-violet-700 text-white text-xs mt-1"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate {period.charAt(0).toUpperCase() + period.slice(1)} Insights
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Scoring model reference */}
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Scoring Model Reference</CardTitle>
            <CardDescription className="text-xs">How the AI-powered lead score is calculated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
              {[
                {
                  label: "Intent (0–40)", color: "text-primary", items: [
                    "Telegram / Contact click → 30 pts",
                    "Trial / Event form → 25 pts",
                    "Demo form submitted → 20 pts",
                    "Pricing page visit → 20 pts",
                    "Demo / Event page → 10 pts",
                  ]
                },
                {
                  label: "Fit (0–30)", color: "text-cyan-400", items: [
                    "Company 51–500 → +10 pts",
                    "Target industry → +10 pts",
                    "Decision-maker role → +10 pts",
                  ]
                },
                {
                  label: "Behavior (0–20)", color: "text-green-400", items: [
                    "3+ active days (7d) → +10 pts",
                    "2 active days (7d) → +5 pts",
                    "1 active day (7d) → +2 pts",
                    "3+ total activities → +10 pts",
                  ]
                },
                {
                  label: "Source (0–10)", color: "text-amber-400", items: [
                    "Direct → 10 pts",
                    "Referral / Event → 8 pts",
                    "Organic / LinkedIn → 6 pts",
                    "Paid → 4 pts",
                    "Cold list → 2 pts",
                  ]
                },
              ].map(({ label, color, items }) => (
                <div key={label}>
                  <p className={`font-semibold mb-2 ${color}`}>{label}</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {items.map(item => <li key={item}>· {item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>🔥 <strong>Hot (SQL)</strong> — Score ≥ 70</span>
              <span>⚡ <strong>Warm (MQL)</strong> — Score 45–69</span>
              <span>📈 <strong>Nurture</strong> — Score 20–44</span>
              <span>❄️ <strong>Cold</strong> — Score &lt; 20</span>
              <span className="ml-auto">Scores decay 10% after 7 days of inactivity</span>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground pb-4">
          Nexpoint Admin Portal · Confidential · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
