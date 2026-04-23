import { useState, useEffect } from "react";
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
import {
  LogOut, Users, Flame, Zap, TrendingUp, Snowflake,
  RefreshCw, Search, TrendingDown, BarChart3, Building2
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

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const username = getUsername();
  const [search, setSearch] = useState("");
  const [segFilter, setSegFilter] = useState("all");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

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

  useEffect(() => { loadStats(); }, []);

  function handleRefresh() {
    refetch();
    loadStats();
  }

  function handleLogout() {
    clearAuth();
    onLogout();
  }

  const filtered = leads.filter(l => {
    const matchSearch = search === "" ||
      l.full_name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.company_name.toLowerCase().includes(search.toLowerCase());
    const matchSeg = segFilter === "all" || l.segment === segFilter;
    return matchSearch && matchSeg;
  });

  const segmentData = stats
    ? Object.entries(stats.segment_counts).map(([name, value]) => ({ name, value }))
    : [];

  const industryData = stats
    ? Object.entries(stats.industry_counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([name, count]) => ({ name, count }))
    : [];

  const sourceData = stats
    ? Object.entries(stats.source_counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }))
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/20 border border-primary/30">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">Nexpoint Admin</span>
            <span className="text-muted-foreground text-xs hidden sm:block">· Lead Intelligence Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">Signed in as <strong>{username}</strong></span>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isFetching || statsLoading}>
              <RefreshCw className={`w-4 h-4 ${isFetching || statsLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold">Lead Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time view of all captured leads, scores, and pipeline health</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total Leads", value: stats?.total ?? "—", icon: Users, color: "text-primary", bg: "bg-primary/10" },
            { label: "Hot (SQL)", value: stats?.segment_counts?.hot ?? 0, icon: Flame, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "Warm (MQL)", value: stats?.segment_counts?.warm ?? 0, icon: Zap, color: "text-orange-400", bg: "bg-orange-500/10" },
            { label: "Nurture", value: stats?.segment_counts?.nurture ?? 0, icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Cold", value: stats?.segment_counts?.cold ?? 0, icon: Snowflake, color: "text-gray-400", bg: "bg-gray-500/10" },
            { label: "Avg Score", value: stats ? `${stats.avg_total_score}/100` : "—", icon: BarChart3, color: "text-green-400", bg: "bg-green-500/10" },
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
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-card-border">
              <CardContent className="pt-5 pb-4 px-4">
                <p className="text-xs text-muted-foreground">New Leads (7 days)</p>
                <p className="text-3xl font-bold mt-1">{stats.recent_7d}</p>
                <p className="text-xs text-muted-foreground mt-1">leads this week</p>
              </CardContent>
            </Card>
            <Card className="border-card-border">
              <CardContent className="pt-5 pb-4 px-4">
                <p className="text-xs text-muted-foreground">Avg Intent Score</p>
                <p className="text-3xl font-bold mt-1">{stats.avg_intent_score}<span className="text-lg text-muted-foreground">/40</span></p>
                <div className="mt-2">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(stats.avg_intent_score / 40) * 100}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-card-border">
              <CardContent className="pt-5 pb-4 px-4">
                <p className="text-xs text-muted-foreground">Avg Fit Score</p>
                <p className="text-3xl font-bold mt-1">{stats.avg_fit_score}<span className="text-lg text-muted-foreground">/30</span></p>
                <div className="mt-2">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${(stats.avg_fit_score / 30) * 100}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts row */}
        {stats && (
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
                  <BarChart data={stats.score_distribution} barSize={28}>
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
        {stats && industryData.length > 0 && (
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
                    {["#", "Name", "Company", "Role", "Industry", "Size", "CTA", "Segment", "Score", "Intent", "Fit", "Behavior", "Source", "Captured"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={14} className="text-center py-12 text-muted-foreground">Loading leads…</td>
                    </tr>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={14} className="text-center py-12 text-muted-foreground">No leads found</td>
                    </tr>
                  )}
                  {filtered.map((lead, i) => (
                    <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
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
                  ))}
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
                    "WhatsApp / Contact click → 30 pts",
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
