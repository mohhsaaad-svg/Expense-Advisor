// Generates the Ember competitive analysis PDF from src/report-data.json.
// Run from the artifact dir: node scripts/generate-pdf.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { jsPDF } from "jspdf";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DATA = JSON.parse(readFileSync(join(ROOT, "src/report-data.json"), "utf8"));
const OUT = join(ROOT, "public/Ember-Competitive-Analysis.pdf");

// ---------- palette (Ember brand) ----------
const CREAM = [251, 247, 240];
const CREAM_DEEP = [244, 236, 223];
const INK = [32, 23, 19];
const EMBER = [217, 91, 41];
const EMBER_DARK = [173, 66, 26];
const MUTED = [138, 123, 110];
const LINE = [226, 214, 196];
const GREEN = [62, 124, 79];
const GREEN_SOFT = [223, 236, 224];
const RED = [179, 64, 42];
const WHITE = [255, 255, 255];

// ---------- page geometry ----------
const W = 612, H = 792, M = 46;
const TOP = 78, BOTTOM = 742;
const CW = W - 2 * M; // content width 520

const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });

// ---------- fonts (Playfair + Outfit if downloaded, else builtin) ----------
let SERIF = "times", SANS = "helvetica";
function tryFont(file, name, style) {
  const p = join(HERE, "fonts", file);
  if (!existsSync(p)) return false;
  doc.addFileToVFS(file, readFileSync(p).toString("base64"));
  doc.addFont(file, name, style);
  return true;
}
if (tryFont("PlayfairDisplay-Bold.ttf", "Playfair", "bold")) SERIF = "Playfair";
if (tryFont("Outfit-Regular.ttf", "Outfit", "normal") && tryFont("Outfit-SemiBold.ttf", "Outfit", "bold")) SANS = "Outfit";
console.log(`fonts: serif=${SERIF} sans=${SANS}`);

// ---------- state ----------
let y = TOP;
let pageNum = 1;
let sectionLabel = "";
const contentOps = { 1: 0 }; // ops per page, excluding chrome
const touch = () => { contentOps[pageNum] = (contentOps[pageNum] || 0) + 1; };

const F = (rgb) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
const S = (rgb) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
const T = (rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);

function chrome() {
  F(CREAM); doc.rect(0, 0, W, H, "F");
  if (pageNum > 1) {
    doc.setFont(SANS, "bold"); doc.setFontSize(7.5); T(EMBER);
    doc.text(sectionLabel.toUpperCase(), M, 44, { charSpace: 1.2 });
    doc.setFont(SERIF, "bold"); doc.setFontSize(8); T(MUTED);
    doc.text("Ember", W - M, 44, { align: "right" });
    S(LINE); doc.setLineWidth(0.8); doc.line(M, 52, W - M, 52);
  }
  // footer
  doc.setFont(SANS, "normal"); doc.setFontSize(7); T(MUTED);
  doc.text(`${DATA.meta.product} — ${DATA.meta.title} · ${DATA.meta.date}`, M, 764);
  doc.text(String(pageNum), W - M, 764, { align: "right" });
}

function newPage(label) {
  doc.addPage();
  pageNum += 1;
  contentOps[pageNum] = 0;
  if (label) sectionLabel = label;
  chrome();
  y = TOP;
}

function ensure(h) { if (y + h > BOTTOM) newPage(sectionLabel); }

function para(text, { size = 9.5, font = SANS, style = "normal", color = INK, width = CW, lh = 1.42, x = M, after = 8 } = {}) {
  doc.setFont(font, style); doc.setFontSize(size); T(color);
  const lines = doc.splitTextToSize(text, width);
  const lineH = size * lh;
  for (const ln of lines) {
    ensure(lineH);
    doc.text(ln, x, y);
    y += lineH;
    touch();
  }
  y += after;
}

function h2(text, { after = 14 } = {}) {
  ensure(46);
  doc.setFont(SERIF, "bold"); doc.setFontSize(17); T(INK);
  doc.text(text, M, y); touch();
  const w = doc.getTextWidth(text);
  S(EMBER); doc.setLineWidth(2); doc.line(M, y + 7, M + Math.min(w, 90), y + 7);
  y += 7 + after;
}

function h3(text, { color = EMBER_DARK, after = 9 } = {}) {
  ensure(24);
  doc.setFont(SANS, "bold"); doc.setFontSize(10.5); T(color);
  doc.text(text, M, y); touch();
  y += after + 4;
}

// generic table: cols = [{w, align?}], rows = string[][]; headRow bool
function table(cols, rows, { head = null, size = 8, pad = 5, zebra = true, headFill = INK, headColor = CREAM, lh = 1.35 } = {}) {
  const lineH = size * lh;
  const rowLines = (cells, bold) => {
    doc.setFont(SANS, bold ? "bold" : "normal"); doc.setFontSize(size);
    return cells.map((c, i) => doc.splitTextToSize(String(c), cols[i].w - 2 * pad));
  };
  const drawRow = (cells, { bold = false, fill = null, color = INK } = {}) => {
    const wrapped = rowLines(cells, bold);
    const hRow = Math.max(...wrapped.map((w) => w.length)) * lineH + 2 * pad;
    ensure(hRow + 2);
    let x = M;
    if (fill) { F(fill); doc.rect(M, y - pad - size * 0.75 + pad, CW, hRow, "F"); }
    doc.setFont(SANS, bold ? "bold" : "normal"); doc.setFontSize(size); T(color);
    const yText = y + pad - size * 0.2;
    wrapped.forEach((wl, i) => {
      const align = cols[i].align || "left";
      const tx = align === "left" ? x + pad : align === "right" ? x + cols[i].w - pad : x + cols[i].w / 2;
      wl.forEach((ln, k) => doc.text(ln, tx, yText + k * lineH, { align }));
      x += cols[i].w;
    });
    S(LINE); doc.setLineWidth(0.5); doc.line(M, y - pad - size * 0.75 + pad + hRow, M + CW, y - pad - size * 0.75 + pad + hRow);
    y += hRow;
    touch();
  };
  // normalize row draw baseline: shift so fills align — simpler: draw fill from current y, text baseline inside
  // (drawRow computes from y; adequate visual alignment for our sizes)
  if (head) {
    const wrapped = rowLines(head, true);
    const hRow = Math.max(...wrapped.map((w) => w.length)) * lineH + 2 * pad;
    ensure(hRow + 2);
    F(headFill); doc.rect(M, y - size * 0.75, CW, hRow, "F");
    let x = M;
    doc.setFont(SANS, "bold"); doc.setFontSize(size); T(headColor);
    wrapped.forEach((wl, i) => {
      const align = cols[i].align || "left";
      const tx = align === "left" ? x + pad : align === "right" ? x + cols[i].w - pad : x + cols[i].w / 2;
      wl.forEach((ln, k) => doc.text(ln, tx, y + pad + k * lineH, { align }));
      x += cols[i].w;
    });
    y += hRow; touch();
  }
  rows.forEach((cells, ri) => {
    const wrapped = rowLines(cells, false);
    const hRow = Math.max(...wrapped.map((w) => w.length)) * lineH + 2 * pad;
    ensure(hRow + 2);
    if (zebra && ri % 2 === 1) { F(CREAM_DEEP); doc.rect(M, y - size * 0.75, CW, hRow, "F"); }
    let x = M;
    doc.setFont(SANS, "normal"); doc.setFontSize(size); T(INK);
    wrapped.forEach((wl, i) => {
      const align = cols[i].align || "left";
      const tx = align === "left" ? x + pad : align === "right" ? x + cols[i].w - pad : x + cols[i].w / 2;
      wl.forEach((ln, k) => doc.text(ln, tx, y + pad + k * lineH, { align }));
      x += cols[i].w;
    });
    S(LINE); doc.setLineWidth(0.5); doc.line(M, y - size * 0.75 + hRow, M + CW, y - size * 0.75 + hRow);
    y += hRow; touch();
  });
  y += 10;
}

// vector cell glyphs for the matrix
function glyph(kind, cx, cy) {
  const r = 4.6;
  if (kind === "win") {
    F(GREEN); doc.circle(cx, cy, r, "F");
    S(WHITE); doc.setLineWidth(1.2);
    doc.line(cx - 2.2, cy + 0.2, cx - 0.6, cy + 1.9); doc.line(cx - 0.6, cy + 1.9, cx + 2.4, cy - 1.9);
  } else if (kind === "yes") {
    S(INK); doc.setLineWidth(1.2);
    doc.line(cx - 2.6, cy + 0.2, cx - 0.8, cy + 2.2); doc.line(cx - 0.8, cy + 2.2, cx + 2.8, cy - 2.2);
  } else if (kind === "partial") {
    S(MUTED); doc.setLineWidth(1); doc.circle(cx, cy, r - 1.2, "S");
    F(MUTED); doc.rect(cx - (r - 1.2), cy - (r - 1.2), r - 1.2, 2 * (r - 1.2), "F");
  } else {
    S([200, 122, 100]); doc.setLineWidth(1.1);
    doc.line(cx - 2.4, cy - 2.4, cx + 2.4, cy + 2.4); doc.line(cx - 2.4, cy + 2.4, cx + 2.4, cy - 2.4);
  }
  touch();
}

// ============================================================
// PAGE 1 — COVER + EXECUTIVE SUMMARY
// ============================================================
sectionLabel = "Executive summary";
chrome();
// cover band
F(INK); doc.rect(0, 0, W, 196, "F");
F(EMBER); doc.rect(0, 196, W, 5, "F");
// flame mark: three nested circles suggestion
F(EMBER); doc.circle(W - 92, 86, 30, "F");
F([238, 128, 66]); doc.circle(W - 92, 94, 19, "F");
F(CREAM); doc.circle(W - 92, 101, 8, "F");
doc.setFont(SANS, "bold"); doc.setFontSize(9); T([238, 176, 143]);
doc.text(DATA.meta.confidential.toUpperCase(), M, 58, { charSpace: 1.6 });
doc.setFont(SERIF, "bold"); doc.setFontSize(34); T(CREAM);
doc.text(`${DATA.meta.product} — ${DATA.meta.title}`, M, 102);
doc.setFont(SANS, "normal"); doc.setFontSize(11); T([222, 208, 191]);
doc.text(doc.splitTextToSize(DATA.meta.subtitle, 380), M, 128);
doc.setFont(SANS, "normal"); doc.setFontSize(9); T([180, 163, 146]);
doc.text(`${DATA.meta.category}  ·  ${DATA.meta.date}`, M, 172);
touch();

y = 236;
h3("POSITIONING", { color: EMBER });
para(DATA.positioning.statement, { size: 11.5, font: SERIF, style: "bold", lh: 1.5, after: 16 });

h3("THE MARKET IN ONE PARAGRAPH", { color: EMBER });
para(
  "Mint's 2024 shutdown fractured the category. Three paid bank-sync dashboards (YNAB, Monarch, Copilot) now charge $70–109 a year to review the past. The AI lane split into a chatbot that burned user trust (Cleo) and a regulated wealth planner (Origin). Between them sits an empty seat: a free, habit-first daily money companion with a coach inside. That seat is Ember's.",
  { size: 9.5, after: 14 }
);

h3("TOP 3 STRATEGIC MOVES", { color: EMBER });
DATA.recommendations.forEach((r, i) => {
  ensure(46);
  F(EMBER); doc.circle(M + 7, y - 3, 7.5, "F");
  doc.setFont(SANS, "bold"); doc.setFontSize(8.5); T(WHITE);
  doc.text(String(i + 1), M + 7, y - 0.2, { align: "center" });
  doc.setFont(SANS, "bold"); doc.setFontSize(10); T(INK);
  doc.text(r.title, M + 22, y);
  y += 13; touch();
  para(r.detail, { size: 8.8, color: [77, 65, 57], x: M + 22, width: CW - 22, after: 9 });
});

// ============================================================
// PAGE 2 — COMPETITIVE LANDSCAPE
// ============================================================
newPage("Competitive landscape");
h2("The seven that matter");
para("Five-star strengths come from each product's own users; weaknesses use the language of 1–2 star reviews and documented complaints. Full citations on the final page.", { size: 8.5, color: MUTED, after: 10 });

const LC = [{ w: 74 }, { w: 92 }, { w: 118 }, { w: 118 }, { w: 118 }];
table(LC,
  DATA.landscape.map((c) => [`${c.name}\n${c.stage}`, c.pricing, c.strength, c.weakness, c.vsEmber]),
  { head: ["Company", "Pricing", "Strength (their users)", "Weakness (their reviews)", "Head-to-head vs Ember"], size: 7.4, headFill: INK }
);

ensure(30);
para(`Watchlist — ${DATA.watchlist}`, { size: 8, color: MUTED, after: 12 });

// pricing bars
h3("WHAT A YEAR COSTS", { color: EMBER_DARK });
const maxAnnual = 109;
DATA.pricingBars.forEach((b) => {
  ensure(16);
  const bw = Math.max(3, (b.annual / maxAnnual) * (CW - 190));
  doc.setFont(SANS, b.ember ? "bold" : "normal"); doc.setFontSize(8); T(b.ember ? EMBER_DARK : INK);
  doc.text(b.name, M, y);
  F(b.ember ? EMBER : CREAM_DEEP);
  if (!b.ember) { S(LINE); doc.setLineWidth(0.5); }
  doc.rect(M + 92, y - 7, bw, 9, b.ember ? "F" : "FD");
  doc.setFont(SANS, "normal"); doc.setFontSize(7.6); T(MUTED);
  doc.text(b.label, M + 98 + bw, y);
  y += 15; touch();
});

// ============================================================
// PAGE 3 — FEATURE MATRIX
// ============================================================
newPage("Feature matrix");
h2("Ember vs. the field, feature by feature");
para(DATA.featureMatrix.legend, { size: 8.2, color: MUTED, after: 12 });

const fm = DATA.featureMatrix;
const FEAT_W = 158, WT_W = 26;
const APP_W = (CW - FEAT_W - WT_W) / fm.columns.length;
// header
ensure(30);
F(INK); doc.rect(M, y - 8, CW, 24, "F");
doc.setFont(SANS, "bold"); doc.setFontSize(7.4); T(CREAM);
doc.text("Capability", M + 5, y + 6);
doc.text("Wt", M + FEAT_W + WT_W / 2, y + 6, { align: "center" });
fm.columns.forEach((c, i) => {
  const cx = M + FEAT_W + WT_W + i * APP_W + APP_W / 2;
  if (i === 0) { F(EMBER); doc.rect(M + FEAT_W + WT_W, y - 8, APP_W, 24, "F"); T(WHITE); } else T(CREAM);
  doc.text(c, cx, y + 6, { align: "center" });
});
y += 20; touch();

fm.rows.forEach((row, ri) => {
  const noteLines = row.note ? doc.splitTextToSize(`※ ${row.note}`, FEAT_W - 10) : [];
  const featLines = doc.splitTextToSize(row.feature, FEAT_W - 10);
  const hRow = Math.max(24, featLines.length * 9.4 + noteLines.length * 8.4 + 10);
  ensure(hRow);
  if (ri % 2 === 1) { F(CREAM_DEEP); doc.rect(M, y - 7, CW, hRow, "F"); }
  // ember column tint
  F([250, 233, 220]); doc.rect(M + FEAT_W + WT_W, y - 7, APP_W, hRow, "F");
  doc.setFont(SANS, "bold"); doc.setFontSize(7.8); T(INK);
  featLines.forEach((ln, k) => doc.text(ln, M + 5, y + 3 + k * 9.4));
  if (noteLines.length) {
    doc.setFont(SANS, "normal"); doc.setFontSize(6.8); T(EMBER_DARK);
    noteLines.forEach((ln, k) => doc.text(ln, M + 5, y + 3 + featLines.length * 9.4 + k * 8.4));
  }
  doc.setFont(SANS, "bold"); doc.setFontSize(8); T(MUTED);
  doc.text(String(row.weight), M + FEAT_W + WT_W / 2, y + 3 + (hRow - 16) / 2, { align: "center" });
  row.cells.forEach((cell, i) => {
    glyph(cell, M + FEAT_W + WT_W + i * APP_W + APP_W / 2, y + (hRow - 16) / 2 + 1);
  });
  S(LINE); doc.setLineWidth(0.5); doc.line(M, y - 7 + hRow, M + CW, y - 7 + hRow);
  y += hRow; touch();
});
y += 8;
// weighted score
const score = (ci) => fm.rows.reduce((a, r) => a + r.weight * ({ win: 1, yes: 1, partial: 0.5, no: 0 }[r.cells[ci]]), 0);
const totalW = fm.rows.reduce((a, r) => a + r.weight, 0);
ensure(34);
para(
  `Weighted coverage (share of buyer-weighted capabilities): ${fm.columns.map((c, i) => `${c} ${Math.round((score(i) / totalW) * 100)}%`).join(" · ")}. Ember leads on the weighted set while conceding bank sync, couples mode and net-worth tracking — see page 5 for why those losses are survivable.`,
  { size: 8.2, color: [77, 65, 57], after: 0 }
);

// ============================================================
// PAGE 4 — POSITIONING MAP
// ============================================================
newPage("Positioning map");
h2("Where everyone stands");
para("Axes are the two dimensions buyers actually decide on: what the product costs per year, and whether it reviews the past (automation-first) or changes behavior (habit-first).", { size: 8.5, color: MUTED, after: 14 });

const map = DATA.positioningMap;
const MX = M + 30, MY = y + 8, MW = CW - 60, MH = 380;
// white-space zone (right-bottom quadrant)
F([250, 233, 220]);
doc.rect(MX + MW * 0.55, MY + MH * 0.55, MW * 0.45, MH * 0.45, "F");
S(EMBER); doc.setLineWidth(0.8);
if (doc.setLineDashPattern) doc.setLineDashPattern([3, 2], 0);
doc.rect(MX + MW * 0.55, MY + MH * 0.55, MW * 0.45, MH * 0.45, "S");
if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);
// frame + mid axes
S(LINE); doc.setLineWidth(1); doc.rect(MX, MY, MW, MH, "S");
S([210, 196, 176]); doc.setLineWidth(0.7);
doc.line(MX + MW / 2, MY, MX + MW / 2, MY + MH);
doc.line(MX, MY + MH / 2, MX + MW, MY + MH / 2);
// axis labels
doc.setFont(SANS, "bold"); doc.setFontSize(7.6); T(MUTED);
doc.text(map.xAxis.left, MX, MY + MH + 14);
doc.text(map.xAxis.right, MX + MW, MY + MH + 14, { align: "right" });
doc.text(map.yAxis.top, MX - 6, MY + 8, { angle: 90 });
doc.text(map.yAxis.bottom, MX - 6, MY + MH, { angle: 90 });
// white space label
doc.setFont(SANS, "bold"); doc.setFontSize(7.2); T(EMBER_DARK);
doc.text(doc.splitTextToSize(map.whiteSpaceLabel, MW * 0.4 - 14), MX + MW * 0.57, MY + MH * 0.58 + 10);
// points
map.points.forEach((p) => {
  const px = MX + p.x * MW;
  const py = MY + (1 - p.y) * MH;
  if (p.ember) {
    S(EMBER); doc.setLineWidth(1.4); doc.circle(px, py, 9, "S");
    F(EMBER); doc.circle(px, py, 5.4, "F");
    doc.setFont(SANS, "bold"); doc.setFontSize(9); T(EMBER_DARK);
  } else if (p.minor) {
    F([197, 181, 162]); doc.circle(px, py, 3.2, "F");
    doc.setFont(SANS, "normal"); doc.setFontSize(7.4); T(MUTED);
  } else {
    F(INK); doc.circle(px, py, 4.2, "F");
    doc.setFont(SANS, "bold"); doc.setFontSize(7.8); T(INK);
  }
  doc.text(p.name, px + p.dx, py + p.dy + 3);
  touch();
});
y = MY + MH + 34;
para("The lower-right quadrant — habit-first and free — contains no funded competitor. Ember's manual-first architecture is not a missing feature; it is the position.", { size: 9, font: SERIF, style: "bold", after: 0 });

// ============================================================
// PAGE 5 — WHITE SPACE & KANO
// ============================================================
newPage("White space & opportunities");
h2("Four gaps nobody serves");
DATA.whiteSpace.forEach((wsp, i) => {
  ensure(40);
  h3(`${i + 1}. ${wsp.title}`.toUpperCase(), { color: EMBER_DARK, after: 4 });
  para(wsp.evidence, { size: 8.8, color: [64, 53, 46], after: 10 });
});

y += 2;
h2("Kano read: where the bar is moving");
const kanoCols = [{ w: CW / 3 }, { w: CW / 3 }, { w: CW / 3 }];
const kmax = Math.max(DATA.kano.basics.length, DATA.kano.performance.length, DATA.kano.delighters.length);
const krows = [];
for (let i = 0; i < kmax; i++) krows.push([DATA.kano.basics[i] || "", DATA.kano.performance[i] || "", DATA.kano.delighters[i] || ""]);
table(kanoCols, krows, { head: ["Basics (expected)", "Performance (more = better)", "Delighters (unexpected)"], size: 7.6, headFill: EMBER_DARK });
para(DATA.kano.insight, { size: 8.8, font: SERIF, style: "bold", after: 0 });

// ============================================================
// PAGE 6 — HEAD-TO-HEAD: EMBER VS THE FIELD
// ============================================================
newPage("Ember vs. the field");
h2("The honest scorecard");
para("Where Ember wins outright, where it loses today, and which product moves neutralize the losses.", { size: 8.5, color: MUTED, after: 12 });

function bulletBlock(title, items, color, mark) {
  h3(title, { color, after: 6 });
  items.forEach((it) => {
    ensure(20);
    if (mark === "plus") { F(GREEN); doc.circle(M + 4, y - 2.6, 3.4, "F"); }
    else if (mark === "minus") { F(RED); doc.rect(M + 1, y - 3.8, 6.5, 2.2, "F"); }
    else { F(EMBER); doc.circle(M + 4, y - 2.6, 3, "F"); }
    touch();
    para(it, { size: 8.8, x: M + 14, width: CW - 14, after: 4 });
  });
  y += 8;
}
bulletBlock("WHERE EMBER WINS", DATA.headToHead.wins, GREEN, "plus");
bulletBlock("WHERE EMBER LOSES — SAY IT PLAINLY", DATA.headToHead.losses, RED, "minus");
bulletBlock("NEUTRALIZERS SHIPPING OR PLANNED", DATA.headToHead.neutralizers, EMBER_DARK, "dot");

// ============================================================
// PAGE 7 — ACTION PLAN
// ============================================================
newPage("Action plan");
h2("Five moves, in order");
DATA.actionPlan.forEach((a, i) => {
  ensure(58);
  F(i < 2 ? EMBER : CREAM_DEEP);
  doc.rect(M, y - 9, 64, 15, "F");
  doc.setFont(SANS, "bold"); doc.setFontSize(6.8); T(i < 2 ? WHITE : MUTED);
  doc.text(a.status.toUpperCase(), M + 32, y + 1, { align: "center" });
  doc.setFont(SANS, "bold"); doc.setFontSize(9.8); T(INK);
  const tl = doc.splitTextToSize(`${i + 1}. ${a.action}`, CW - 74);
  tl.forEach((ln, k) => doc.text(ln, M + 74, y + k * 12));
  y += tl.length * 12 + 3; touch();
  para(`${a.why}  [${a.source.map((s) => s).join(", ")}]`, { size: 8.4, color: [77, 65, 57], x: M + 74, width: CW - 74, after: 12 });
});

y += 4;
h2("Trap-setting questions");
para("For landing pages, comparison content, and any 'why Ember' conversation — each question is safe for us and uncomfortable for a named competitor.", { size: 8.4, color: MUTED, after: 10 });
DATA.trapQuestions.forEach((q) => {
  ensure(20);
  doc.setFont(SERIF, "bold"); doc.setFontSize(10); T(EMBER);
  doc.text("“", M, y + 2);
  touch();
  para(q, { size: 9, font: SERIF, style: "bold", x: M + 12, width: CW - 12, after: 7 });
});

// ============================================================
// PAGE 8 — SOURCES
// ============================================================
newPage("Sources");
h2("Every claim, cited");
DATA.sources.forEach((s) => {
  ensure(26);
  doc.setFont(SANS, "bold"); doc.setFontSize(8.6); T(EMBER_DARK);
  doc.text(`[${s.n}]`, M, y);
  doc.setFont(SANS, "bold"); doc.setFontSize(8.6); T(INK);
  doc.text(doc.splitTextToSize(s.label, CW - 26), M + 24, y);
  y += 11; touch();
  para(s.url, { size: 7.8, color: EMBER, x: M + 24, width: CW - 24, after: 7 });
});
y += 6;
h3("METHODOLOGY & CONFIDENCE", { color: MUTED, after: 5 });
para(DATA.methodologyNote, { size: 7.8, color: MUTED, after: 0 });

// ---------- verify + write ----------
const pages = doc.getNumberOfPages();
const blank = Object.entries(contentOps).filter(([, n]) => n === 0).map(([p]) => p);
if (blank.length) throw new Error(`Blank pages detected: ${blank.join(", ")}`);
mkdirSync(join(ROOT, "public"), { recursive: true });
const buf = Buffer.from(doc.output("arraybuffer"));
writeFileSync(OUT, buf);
console.log(`OK: ${pages} pages, ${(buf.length / 1024).toFixed(0)} KB -> ${OUT}`);
console.log("contentOps per page:", JSON.stringify(contentOps));
