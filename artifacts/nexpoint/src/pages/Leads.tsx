import { useListLeads } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Users, Flame, TrendingUp, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTA_SOURCE_LABELS: Record<string, string> = {
  free_trial: "Trial Form",
  demo_request: "Demo Form",
  event_registration: "Event Form",
  pricing_trial: "Pricing Modal",
};

const SEGMENT_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType; color: string }> = {
  hot: { label: "Hot", variant: "destructive", icon: Flame, color: "text-red-500" },
  warm: { label: "Warm", variant: "default", icon: TrendingUp, color: "text-amber-500" },
  nurture: { label: "Nurture", variant: "secondary", icon: TrendingUp, color: "text-blue-500" },
  cold: { label: "Cold", variant: "outline", icon: Snowflake, color: "text-slate-400" },
};

function SegmentBadge({ segment }: { segment: string }) {
  const config = SEGMENT_CONFIG[segment] ?? SEGMENT_CONFIG.cold;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
      <Icon className={`h-3 w-3 ${config.color}`} />
      {config.label}
    </Badge>
  );
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 min-w-[80px]">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{value}/{max}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>{value} out of {max} points</TooltipContent>
    </Tooltip>
  );
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ctaSourceLabel(formType: string | null | undefined, campaign: string | null | undefined): string {
  // Campaign is the most precise signal — check it first
  if (campaign) {
    if (campaign.startsWith("pricing_")) return "Pricing Modal";
    if (campaign.includes("homepage_trial")) return "Trial Form";
    if (campaign.includes("homepage_demo")) return "Demo Form";
    if (campaign.includes("summit") || campaign.includes("event") || campaign.includes("growth_summit")) return "Event Form";
  }
  // Fall back to form type
  if (formType && CTA_SOURCE_LABELS[formType]) return CTA_SOURCE_LABELS[formType];
  return formType ?? "—";
}

export default function Leads() {
  const { data: leads = [], isLoading, isError, refetch, isFetching } = useListLeads();

  const total = leads.length;
  const hot = leads.filter(l => l.segment === "hot").length;
  const warm = leads.filter(l => l.segment === "warm").length;
  const nurture = leads.filter(l => l.segment === "nurture").length;
  const cold = leads.filter(l => l.segment === "cold").length;

  return (
    <div className="w-full min-h-screen bg-muted/20 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              Leads Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">All captured leads with scoring, fit data, and CTA source</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Leads", value: total, color: "text-foreground" },
            { label: "🔥 Hot", value: hot, color: "text-red-500" },
            { label: "⚡ Warm", value: warm, color: "text-amber-500" },
            { label: "📈 Nurture", value: nurture, color: "text-blue-500" },
            { label: "❄️ Cold", value: cold, color: "text-slate-400" },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-3">
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Leads Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>All Leads</CardTitle>
            <CardDescription>Sorted by total score — highest first. Score updates automatically on each form submission or page visit.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground">Loading leads…</div>
            ) : isError ? (
              <div className="py-16 text-center text-destructive">Failed to load leads. Is the API server running?</div>
            ) : leads.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">No leads yet. Submit a form on the landing page to capture the first lead.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Company Size</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Lead Source</TableHead>
                      <TableHead>CTA Source</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Marketing Challenge</TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead>Total Score</TableHead>
                      <TableHead>Intent /40</TableHead>
                      <TableHead>Fit /30</TableHead>
                      <TableHead>Behavior /20</TableHead>
                      <TableHead>Source /10</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Captured On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead, idx) => (
                      <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{lead.fullName ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{lead.email}</TableCell>
                        <TableCell className="whitespace-nowrap">{lead.companyName ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{lead.jobTitle ?? <span className="text-muted-foreground/50 text-xs italic">Not provided</span>}</TableCell>
                        <TableCell className="whitespace-nowrap">{lead.companySize ?? <span className="text-muted-foreground/50 text-xs italic">Not provided</span>}</TableCell>
                        <TableCell className="whitespace-nowrap">{lead.industry ?? <span className="text-muted-foreground/50 text-xs italic">Not provided</span>}</TableCell>
                        <TableCell>
                          {lead.referralSource ? (
                            <Badge variant="outline" className="text-xs">{lead.referralSource}</Badge>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs italic">Not provided</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">
                            {ctaSourceLabel(lead.formType, lead.campaign)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{lead.campaign ?? "—"}</TableCell>
                        <TableCell className="max-w-[180px]">
                          {lead.marketingChallenge ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs text-muted-foreground line-clamp-2 cursor-help">{lead.marketingChallenge}</span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">{lead.marketingChallenge}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs italic">Not provided</span>
                          )}
                        </TableCell>
                        <TableCell><SegmentBadge segment={lead.segment ?? "cold"} /></TableCell>
                        <TableCell>
                          <span className={`text-lg font-bold ${(lead.totalScore ?? 0) >= 80 ? "text-red-500" : (lead.totalScore ?? 0) >= 60 ? "text-amber-500" : (lead.totalScore ?? 0) >= 40 ? "text-blue-500" : "text-slate-400"}`}>
                            {lead.totalScore ?? 0}
                          </span>
                        </TableCell>
                        <TableCell><ScoreBar value={lead.intentScore ?? 0} max={40} color="bg-purple-500" /></TableCell>
                        <TableCell><ScoreBar value={lead.fitScore ?? 0} max={30} color="bg-emerald-500" /></TableCell>
                        <TableCell><ScoreBar value={lead.behaviorScore ?? 0} max={20} color="bg-blue-500" /></TableCell>
                        <TableCell><ScoreBar value={lead.sourceScore ?? 0} max={10} color="bg-orange-500" /></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(lead.lastActivityAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(lead.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Score Legend */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Scoring Model Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-semibold text-purple-600 mb-1">Intent (0–40)</div>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>Contact click / WhatsApp — 30 pts</li>
                  <li>Form submitted — 25 pts</li>
                  <li>Demo / Pricing page visit — 20 pts</li>
                  <li>Demo started — 15 pts</li>
                  <li>Event / Email click — 10 pts</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-emerald-600 mb-1">Fit (0–30)</div>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>Company size 51-500 — +10 pts</li>
                  <li>Target industry — +10 pts</li>
                  <li>C-level / VP / Director — +10 pts</li>
                  <li>Geography default — +5 pts</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-blue-600 mb-1">Behavior (0–20)</div>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>3+ active days in 7 days — +10 pts</li>
                  <li>2 active days — +5 pts</li>
                  <li>3+ total activities — +5 pts</li>
                  <li>Form completion — +5 pts</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-orange-600 mb-1">Source (0–10)</div>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>Direct — 10 pts</li>
                  <li>Referral / Event — 8 pts</li>
                  <li>Organic — 7 pts</li>
                  <li>Paid — 5 pts</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>🔥 <strong>Hot</strong>: 80–100</span>
              <span>⚡ <strong>Warm</strong>: 60–79</span>
              <span>📈 <strong>Nurture</strong>: 40–59</span>
              <span>❄️ <strong>Cold</strong>: &lt;40</span>
              <span className="ml-auto">Time decay: −10 after 3 days · −20 after 7 days · 0 after 14 days</span>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
