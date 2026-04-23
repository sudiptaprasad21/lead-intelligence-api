const CANVAS_W = 2480;
const CANVAS_H = 1460;

const COL = { hot: 290, warm: 840, nurture: 1430, cold: 1970 };
const MID_X = (COL.hot + COL.cold) / 2; // ≈ 1130

const NW = 260;  // node width
const NH = 72;   // standard node height
const NS = 96;   // scorer node height (taller)
const NX = (cx: number) => cx - NW / 2;

const PALETTE = {
  trigger:    { border: "#22c55e", glow: "#22c55e30", icon: "⚡", type: "TRIGGER",    bg: "#0c1f14" },
  scorer:     { border: "#3b82f6", glow: "#3b82f630", icon: "🧮", type: "PROCESSOR",  bg: "#0c1522" },
  classifier: { border: "#8b5cf6", glow: "#8b5cf630", icon: "🔀", type: "CLASSIFIER", bg: "#140c22" },
  hot:        { border: "#ef4444", glow: "#ef444430", icon: "🔥", type: "ACTION",      bg: "#1e0c0c" },
  warm:       { border: "#f97316", glow: "#f9731630", icon: "⚡", type: "ACTION",      bg: "#1e140c" },
  nurture:    { border: "#3b82f6", glow: "#3b82f630", icon: "📈", type: "ACTION",      bg: "#0c1522" },
  cold:       { border: "#6b7280", glow: "#6b728030", icon: "❄️", type: "ACTION",      bg: "#121214" },
};

type Theme = keyof typeof PALETTE;

interface NodeBox {
  cx: number;
  y: number;
  w?: number;
  h?: number;
  theme: Theme;
  title: string;
  subtitle: string;
  sla?: string;
}

function Node({ cx, y, w = NW, h = NH, theme, title, subtitle, sla }: NodeBox) {
  const p = PALETTE[theme];
  const x = cx - w / 2;
  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h} rx={10}
        fill={p.bg}
        stroke={p.border}
        strokeWidth={1.5}
        style={{ filter: `drop-shadow(0 0 8px ${p.glow})` }}
      />
      <rect x={x} y={y} width={w} height={4} rx={2} fill={p.border} />
      <text x={x + 14} y={y + 22} fontSize={9} fill={p.border} fontWeight="700" letterSpacing="1.5" fontFamily="monospace">
        {p.type}
      </text>
      {sla && (
        <g>
          <rect x={x + w - 78} y={y + 10} width={64} height={16} rx={8} fill={p.border + "25"} />
          <text x={x + w - 46} y={y + 22} fontSize={9} fill={p.border} textAnchor="middle" fontFamily="monospace">
            SLA {sla}
          </text>
        </g>
      )}
      <text x={x + 14} y={y + 40} fontSize={13} fill="#f1f5f9" fontWeight="600" fontFamily="system-ui">
        {p.icon}{"  "}{title}
      </text>
      <text x={x + 14} y={y + 58} fontSize={10} fill="#64748b" fontFamily="system-ui">
        {subtitle}
      </text>
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, color = "#334155", label }: { x1: number; y1: number; x2: number; y2: number; color?: string; label?: string }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const cp1y = y1 + Math.abs(y2 - y1) * 0.5;
  const cp2y = y2 - Math.abs(y2 - y1) * 0.3;
  const d = `M ${x1} ${y1} C ${x1} ${cp1y}, ${x2} ${cp2y}, ${x2} ${y2}`;
  return (
    <g>
      <path d={d} stroke={color} strokeWidth={1.5} fill="none" strokeDasharray="0" markerEnd={`url(#arr-${color.replace("#", "")})`} opacity={0.7} />
      {label && (
        <>
          <rect x={mx - 22} y={my - 9} width={44} height={16} rx={8} fill={color + "25"} />
          <text x={mx} y={my + 4} textAnchor="middle" fontSize={9} fill={color} fontWeight="600" fontFamily="monospace">{label}</text>
        </>
      )}
    </g>
  );
}

function BranchLabel({ cx, y, label, color, score }: { cx: number; y: number; label: string; color: string; score: string }) {
  return (
    <g>
      <rect x={cx - 64} y={y} width={128} height={36} rx={18} fill={color + "22"} stroke={color} strokeWidth={1.2} />
      <text x={cx} y={y + 14} textAnchor="middle" fontSize={12} fill={color} fontWeight="700" fontFamily="system-ui">{label}</text>
      <text x={cx} y={y + 28} textAnchor="middle" fontSize={9} fill={color} fontFamily="monospace" opacity={0.8}>{score}</text>
    </g>
  );
}

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill={color} opacity={0.7} />
    </marker>
  );
}

export function WorkflowDiagram() {
  const Y_TRIG = 40;
  const Y_SCOR = 168;
  const Y_CLAS = 330;
  const Y_BLAB = 470;
  const Y_A0   = 530;  // first action row
  const GAP    = 104;  // gap between action rows

  return (
    <div style={{ background: "#080c14", minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px 8px", overflow: "auto" }}>
      <svg
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ fontFamily: "system-ui, sans-serif", flexShrink: 0 }}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      >
        <defs>
          <ArrowMarker id="arr-334155" color="#334155" />
          <ArrowMarker id="arr-22c55e" color="#22c55e" />
          <ArrowMarker id="arr-3b82f6" color="#3b82f6" />
          <ArrowMarker id="arr-8b5cf6" color="#8b5cf6" />
          <ArrowMarker id="arr-ef4444" color="#ef4444" />
          <ArrowMarker id="arr-f97316" color="#f97316" />
          <ArrowMarker id="arr-6b7280" color="#6b7280" />
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#1e2535" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Grid background */}
        <rect width={CANVAS_W} height={CANVAS_H} fill="url(#grid)" />

        {/* ── Title ── */}
        <text x={MID_X} y={22} textAnchor="middle" fontSize={13} fill="#475569" letterSpacing="2" fontFamily="monospace" fontWeight="600">
          NEXPOINT · AI-POWERED OUTREACH WORKFLOW
        </text>

        {/* ══════════════ SHARED NODES ══════════════ */}

        {/* TRIGGER */}
        <Node cx={MID_X} y={Y_TRIG} theme="trigger"
          title="Lead Form Submitted"
          subtitle="Webhook fires on form submit (trial / demo / event / pricing)"
          w={420}
        />

        {/* Arrow: Trigger → Scorer */}
        <Arrow x1={MID_X} y1={Y_TRIG + NH} x2={MID_X} y2={Y_SCOR} color="#22c55e" />

        {/* SCORER — taller with sub-scores */}
        <g>
          <rect x={NX(MID_X) - 20} y={Y_SCOR} width={NW + 40} height={NS} rx={10}
            fill="#0c1522" stroke="#3b82f6" strokeWidth={1.5}
            style={{ filter: "drop-shadow(0 0 8px #3b82f630)" }}
          />
          <rect x={NX(MID_X) - 20} y={Y_SCOR} width={NW + 40} height={4} rx={2} fill="#3b82f6" />
          <text x={NX(MID_X) - 6} y={Y_SCOR + 22} fontSize={9} fill="#3b82f6" fontWeight="700" letterSpacing="1.5" fontFamily="monospace">PROCESSOR</text>
          <text x={NX(MID_X) - 6} y={Y_SCOR + 40} fontSize={13} fill="#f1f5f9" fontWeight="600">🧮  AI Score Calculator</text>
          <text x={NX(MID_X) - 6} y={Y_SCOR + 58} fontSize={10} fill="#64748b">Intent (0–40)  ·  Fit (0–30)  ·  Behavior (0–20)  ·  Source (0–10)</text>
          <text x={NX(MID_X) - 6} y={Y_SCOR + 75} fontSize={10} fill="#3b82f6" fontFamily="monospace">Total Score = Σ → 0–100</text>
        </g>

        {/* Arrow: Scorer → Classifier */}
        <Arrow x1={MID_X} y1={Y_SCOR + NS} x2={MID_X} y2={Y_CLAS} color="#3b82f6" />

        {/* CLASSIFIER */}
        <Node cx={MID_X} y={Y_CLAS} theme="classifier"
          title="Segment Classifier"
          subtitle="Routes lead to Hot / Warm / Nurture / Cold based on total score"
          w={400}
        />

        {/* Fan-out arrows: Classifier → Branch labels */}
        <Arrow x1={MID_X} y1={Y_CLAS + NH} x2={COL.hot}     y2={Y_BLAB}    color="#8b5cf6" label="≥ 70" />
        <Arrow x1={MID_X} y1={Y_CLAS + NH} x2={COL.warm}    y2={Y_BLAB}    color="#8b5cf6" label="45–69" />
        <Arrow x1={MID_X} y1={Y_CLAS + NH} x2={COL.nurture} y2={Y_BLAB}    color="#8b5cf6" label="20–44" />
        <Arrow x1={MID_X} y1={Y_CLAS + NH} x2={COL.cold}    y2={Y_BLAB}    color="#8b5cf6" label="< 20" />

        {/* ══════════════ BRANCH LABELS ══════════════ */}
        <BranchLabel cx={COL.hot}     y={Y_BLAB} label="🔥 HOT"    color="#ef4444" score="SQL — Score ≥ 70" />
        <BranchLabel cx={COL.warm}    y={Y_BLAB} label="⚡ WARM"   color="#f97316" score="MQL — Score 45–69" />
        <BranchLabel cx={COL.nurture} y={Y_BLAB} label="📈 NURTURE" color="#3b82f6" score="Score 20–44" />
        <BranchLabel cx={COL.cold}    y={Y_BLAB} label="❄️ COLD"   color="#6b7280" score="Score < 20" />

        {/* ══════════════ HOT BRANCH ══════════════ */}
        <Arrow x1={COL.hot} y1={Y_BLAB + 36} x2={COL.hot} y2={Y_A0}         color="#ef4444" />
        <Node cx={COL.hot} y={Y_A0}          theme="hot" title="Telegram Outreach"      subtitle="AI-personalized alert to sales team group"           sla="1 hr" />
        <Arrow x1={COL.hot} y1={Y_A0 + NH}   x2={COL.hot} y2={Y_A0 + GAP}   color="#ef4444" />
        <Node cx={COL.hot} y={Y_A0 + GAP}    theme="hot" title="Sales Call Assigned"    subtitle="Assign to next available AE with priority: High"       sla="1 hr" />
        <Arrow x1={COL.hot} y1={Y_A0+GAP+NH} x2={COL.hot} y2={Y_A0+2*GAP}   color="#ef4444" />

        {/* Re-score node after engagement */}
        <Node cx={COL.hot} y={Y_A0 + 2*GAP} theme="hot" title="Engagement Tracking"  subtitle="Log open / click / reply events, trigger re-score" />
        <Arrow x1={COL.hot} y1={Y_A0+2*GAP+NH} x2={COL.hot} y2={Y_A0+3*GAP} color="#ef4444" />
        <Node cx={COL.hot} y={Y_A0 + 3*GAP} theme="hot" title="Suppression Check"    subtitle="Idempotency guard — skip if already actioned (24h)" />

        {/* ══════════════ WARM BRANCH ══════════════ */}
        <Arrow x1={COL.warm} y1={Y_BLAB + 36} x2={COL.warm} y2={Y_A0}        color="#f97316" />
        <Node cx={COL.warm} y={Y_A0}          theme="warm" title="Email Outreach"       subtitle="AI sales email sent directly to lead's inbox"           sla="30 min" />
        <Arrow x1={COL.warm} y1={Y_A0 + NH}   x2={COL.warm} y2={Y_A0 + GAP}  color="#f97316" />
        <Node cx={COL.warm} y={Y_A0 + GAP}    theme="warm" title="SDR Briefing"         subtitle="AI talking points sent to SDR via Telegram group"       sla="24 hr" />
        <Arrow x1={COL.warm} y1={Y_A0+GAP+NH} x2={COL.warm} y2={Y_A0+2*GAP}  color="#f97316" />
        <Node cx={COL.warm} y={Y_A0 + 2*GAP}  theme="warm" title="Engagement Tracking"  subtitle="Monitor open / click / reply → trigger re-score" />
        <Arrow x1={COL.warm} y1={Y_A0+2*GAP+NH} x2={COL.warm} y2={Y_A0+3*GAP} color="#f97316" />
        <Node cx={COL.warm} y={Y_A0 + 3*GAP}  theme="warm" title="Suppression Check"    subtitle="Skip if delivered within last 24 hours (idempotent)" />

        {/* ══════════════ NURTURE BRANCH ══════════════ */}
        <Arrow x1={COL.nurture} y1={Y_BLAB + 36} x2={COL.nurture} y2={Y_A0}      color="#3b82f6" />
        <Node cx={COL.nurture} y={Y_A0}          theme="nurture" title="Drip Day 0"         subtitle="Welcome email sent immediately via Gmail"              sla="1 hr" />
        <Arrow x1={COL.nurture} y1={Y_A0 + NH}   x2={COL.nurture} y2={Y_A0+GAP}  color="#3b82f6" />
        <Node cx={COL.nurture} y={Y_A0 + GAP}    theme="nurture" title="Drip Day 3"         subtitle="Follow-up: feature spotlight + social proof"           />
        <Arrow x1={COL.nurture} y1={Y_A0+GAP+NH} x2={COL.nurture} y2={Y_A0+2*GAP} color="#3b82f6" />
        <Node cx={COL.nurture} y={Y_A0 + 2*GAP}  theme="nurture" title="Drip Day 7"         subtitle="Mid-sequence: objection handling + case study"          />
        <Arrow x1={COL.nurture} y1={Y_A0+2*GAP+NH} x2={COL.nurture} y2={Y_A0+3*GAP} color="#3b82f6" />
        <Node cx={COL.nurture} y={Y_A0 + 3*GAP}  theme="nurture" title="Drip Day 14"        subtitle="Final push: limited offer or booking CTA"               />
        <Arrow x1={COL.nurture} y1={Y_A0+3*GAP+NH} x2={COL.nurture} y2={Y_A0+4*GAP} color="#3b82f6" />
        <Node cx={COL.nurture} y={Y_A0 + 4*GAP}  theme="nurture" title="Retargeting Trigger" subtitle="Fire ad retargeting pixels (LinkedIn / Google / Meta)"  sla="2 hr" />

        {/* ══════════════ COLD BRANCH ══════════════ */}
        <Arrow x1={COL.cold} y1={Y_BLAB + 36} x2={COL.cold} y2={Y_A0}         color="#6b7280" />
        <Node cx={COL.cold} y={Y_A0}          theme="cold" title="Retargeting Trigger"  subtitle="Enter paid retargeting audience pool immediately"       sla="2 hr" />
        <Arrow x1={COL.cold} y1={Y_A0 + NH}   x2={COL.cold} y2={Y_A0 + GAP}   color="#6b7280" />
        <Node cx={COL.cold} y={Y_A0 + GAP}    theme="cold" title="Cold Drip"            subtitle="Slow email nurture — 30 / 60 / 90 day cadence"           />
        <Arrow x1={COL.cold} y1={Y_A0+GAP+NH} x2={COL.cold} y2={Y_A0+2*GAP}   color="#6b7280" />
        <Node cx={COL.cold} y={Y_A0 + 2*GAP}  theme="cold" title="Periodic Re-Eval"     subtitle="Re-score on activity signal — may promote to Nurture"   />
        <Arrow x1={COL.cold} y1={Y_A0+2*GAP+NH} x2={COL.cold} y2={Y_A0+3*GAP}  color="#6b7280" />
        <Node cx={COL.cold} y={Y_A0 + 3*GAP}  theme="cold" title="Suppression Check"    subtitle="No outreach if unsubscribed or idle for 90+ days"        />

        {/* ══════════════ CROSS-CUTTING: RE-SCORE LOOP ══════════════ */}
        <text x={80} y={Y_A0 + 3*GAP + 30} fontSize={10} fill="#334155" fontFamily="monospace">RE-SCORE ENGINE</text>
        <rect x={70} y={Y_A0 + 3*GAP - 10} width={146} height={14} rx={7} fill="#1e2535" stroke="#334155" strokeWidth={1} />
        <text x={143} y={Y_A0 + 3*GAP} fontSize={9} fill="#475569" textAnchor="middle" fontFamily="monospace">Score decay · 10% / 7d</text>

        {/* Loop-back arrow from engagement back to classifier */}
        <path
          d={`M ${COL.hot + NW/2 + 8} ${Y_A0 + 2*GAP + NH/2} L ${COL.cold + NW/2 + 60} ${Y_A0 + 2*GAP + NH/2} L ${COL.cold + NW/2 + 60} ${Y_CLAS + NH/2} L ${MID_X + 210} ${Y_CLAS + NH/2}`}
          stroke="#334155" strokeWidth={1.2} fill="none" strokeDasharray="6 4"
          markerEnd="url(#arr-334155)"
        />
        <rect x={COL.cold + NW/2 + 16} y={Y_CLAS + NH/2 - 28} width={90} height={20} rx={10} fill="#1e2535" />
        <text x={COL.cold + NW/2 + 61} y={Y_CLAS + NH/2 - 14} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="monospace">re-score loop</text>

        {/* ══════════════ WORKING HOURS GATE ══════════════ */}
        <g>
          <rect x={MID_X + 220} y={Y_SCOR + 10} width={180} height={60} rx={10} fill="#12180c" stroke="#84cc16" strokeWidth={1.2} />
          <rect x={MID_X + 220} y={Y_SCOR + 10} width={180} height={4} rx={2} fill="#84cc16" />
          <text x={MID_X + 228} y={Y_SCOR + 30} fontSize={9} fill="#84cc16" fontWeight="700" letterSpacing="1.5" fontFamily="monospace">GATE</text>
          <text x={MID_X + 228} y={Y_SCOR + 46} fontSize={11} fill="#d9f99d" fontWeight="600">⏰ Working Hours</text>
          <text x={MID_X + 228} y={Y_SCOR + 62} fontSize={9} fill="#4d7c0f">Mon–Fri 8:30–17:30 WAT</text>
        </g>

        {/* ══════════════ LEGEND ══════════════ */}
        <g transform={`translate(64, ${Y_A0 + 3*GAP + 60})`}>
          <rect x={0} y={0} width={320} height={140} rx={12} fill="#0f1420" stroke="#1e2535" strokeWidth={1} />
          <text x={16} y={22} fontSize={10} fill="#475569" fontWeight="700" letterSpacing="1.5" fontFamily="monospace">LEGEND</text>
          {[
            { y: 40, color: "#22c55e", label: "Trigger — Form submission webhook" },
            { y: 60, color: "#3b82f6", label: "Processor — AI scoring + segmentation" },
            { y: 80, color: "#8b5cf6", label: "Classifier — Route to segment branch" },
            { y: 100, color: "#ef4444", label: "Action — Outreach / task / notification" },
            { y: 120, color: "#334155", label: "Re-score loop (dashed) — Engagement signal" },
          ].map(({ y, color, label }) => (
            <g key={y}>
              <rect x={16} y={y - 8} width={14} height={14} rx={4} fill={color + "33"} stroke={color} strokeWidth={1.2} />
              <text x={40} y={y + 3} fontSize={10} fill="#94a3b8" fontFamily="system-ui">{label}</text>
            </g>
          ))}
        </g>

        {/* SLA Legend */}
        <g transform={`translate(${CANVAS_W - 300}, ${Y_A0 + 3*GAP + 60})`}>
          <rect x={0} y={0} width={240} height={110} rx={12} fill="#0f1420" stroke="#1e2535" strokeWidth={1} />
          <text x={16} y={22} fontSize={10} fill="#475569" fontWeight="700" letterSpacing="1.5" fontFamily="monospace">SLA THRESHOLDS</text>
          {[
            { label: "Telegram alert", sla: "60 min", color: "#ef4444" },
            { label: "Sales call assign", sla: "60 min", color: "#ef4444" },
            { label: "Email outreach", sla: "30 min", color: "#f97316" },
            { label: "SDR briefing", sla: "24 hr", color: "#f97316" },
            { label: "Retargeting fire", sla: "2 hr", color: "#6b7280" },
          ].map(({ label, sla, color }, i) => (
            <g key={i}>
              <text x={16} y={46 + i * 16} fontSize={10} fill="#64748b" fontFamily="system-ui">{label}</text>
              <text x={224} y={46 + i * 16} textAnchor="end" fontSize={10} fill={color} fontFamily="monospace" fontWeight="600">{sla}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
