import { Router } from "express";
import rateLimit from "express-rate-limit";
import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, conversations, messages, expensesTable, budgetTable } from "@workspace/db";
import {
  CreateAnthropicConversationBody,
  SendAnthropicMessageBody,
  GetAnthropicConversationParams,
  DeleteAnthropicConversationParams,
  ListAnthropicMessagesParams,
  SendAnthropicMessageParams,
} from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logger } from "../lib/logger";
import { getOrCreatePreferences } from "./preferences";
import { listGoalsSerialized } from "./goals";
import { listChallengesComputed, todayIso } from "./challenges";
import { userId } from "../lib/user";

const router = Router();

const ADVISOR_MODEL = "claude-sonnet-4-6";
const HISTORY_LIMIT = 30;
// Guardrails: reject oversized user messages outright, and cap the total
// characters of history forwarded to the model so long conversations with
// long replies can't blow past model limits or spike latency/cost.
const MAX_MESSAGE_CHARS = 4000;
const HISTORY_CHAR_BUDGET = 60_000;

function serializeConversation(c: { id: number; title: string; createdAt: Date }) {
  return { id: c.id, title: c.title, createdAt: c.createdAt.toISOString() };
}

function serializeMessage(m: {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: Date;
}) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  };
}

// Builds the system prompt from ONE user's live data: budget, recent
// expenses, month-to-date spending, goals, and challenges. Every query below
// is scoped to `uid` — the advisor must never see another user's numbers.
async function buildSystemPrompt(uid: string): Promise<string> {
  const today = todayIso();
  const monthStart = `${today.slice(0, 7)}-01`;

  const [prefs, budgetRows, recent, monthCats, todayTotalRows, goals, challenges] = await Promise.all([
    getOrCreatePreferences(uid),
    db.select().from(budgetTable).where(eq(budgetTable.userId, uid)).limit(1),
    db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.userId, uid))
      .orderBy(desc(expensesTable.date), desc(expensesTable.id))
      .limit(25),
    db
      .select({ category: expensesTable.category, total: sql<string>`sum(${expensesTable.amount})` })
      .from(expensesTable)
      // Bounded on both ends: future-dated entries shouldn't inflate month-to-date.
      .where(and(eq(expensesTable.userId, uid), gte(expensesTable.date, monthStart), lte(expensesTable.date, today)))
      .groupBy(expensesTable.category),
    db
      .select({ total: sql<string>`coalesce(sum(${expensesTable.amount}), 0)` })
      .from(expensesTable)
      .where(and(eq(expensesTable.userId, uid), eq(expensesTable.date, today))),
    listGoalsSerialized(uid),
    listChallengesComputed(uid, today),
  ]);

  const cur = prefs.currency;
  const budget = budgetRows[0];
  const monthTotal = monthCats.reduce((acc, c) => acc + Number(c.total), 0);
  const todayTotal = Number(todayTotalRows[0]?.total ?? 0);
  const topCats = [...monthCats]
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, 5)
    .map((c) => `${c.category} ${Number(c.total).toFixed(2)}`)
    .join(", ");

  const lines: string[] = [
    "You are Ember, the in-app money coach of a daily expense tracker built around habits: streaks, rituals (auto-logged recurring spends), savings goals, and no-spend challenges.",
    "Personality: warm, direct, encouraging — a coach, not a lecturer. Keep answers short and concrete; lead with the number that matters, then one clear next step.",
    "Boundaries: you coach spending habits and budgets using the data below. You are not a licensed financial advisor — no investment, tax, insurance, or legal recommendations, no financial products. If asked, say it's outside your lane and steer back to spending habits.",
    "Formatting: plain conversational text. Short paragraphs, simple dashes for lists. No markdown headers or tables. No emojis.",
    `Currency: all amounts below are in ${cur}.`,
    "",
    `TODAY: ${today}`,
    budget
      ? `BUDGET: daily limit ${Number(budget.dailyLimit).toFixed(2)}, monthly limit ${Number(budget.monthlyLimit).toFixed(2)}`
      : "BUDGET: not configured yet",
    `SPENT TODAY: ${todayTotal.toFixed(2)}`,
    `THIS MONTH (since ${monthStart}): total ${monthTotal.toFixed(2)}${topCats ? `, by category: ${topCats}` : ""}`,
    "",
    "RECENT EXPENSES (newest first):",
    ...(recent.length
      ? recent.map((e) => `- ${e.date} · ${e.category} · ${e.description} · ${Number(e.amount).toFixed(2)}`)
      : ["- none logged yet"]),
    "",
    "SAVINGS GOALS:",
    ...(goals.length
      ? goals.map(
          (g) =>
            `- ${g.name}: ${g.savedAmount.toFixed(2)} of ${g.targetAmount.toFixed(2)}${g.deadline ? ` by ${g.deadline}` : ""}`,
        )
      : ["- none yet"]),
    "",
    "NO-SPEND CHALLENGES:",
    ...(challenges.length
      ? challenges.map(
          (c) =>
            `- ${c.name} (${c.category ?? "all spending"}): ${c.status}, day ${c.daysElapsed} of ${c.durationDays}, ${c.violations} slip(s)`,
        )
      : ["- none yet"]),
    "",
    "Ground every answer in these numbers. If the user asks about something not in the data, say what you'd need them to log first.",
  ];

  return lines.join("\n");
}

// GET /anthropic/conversations
router.get("/anthropic/conversations", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId(req)))
    .orderBy(desc(conversations.createdAt), desc(conversations.id));
  res.json(rows.map(serializeConversation));
});

// POST /anthropic/conversations
router.post("/anthropic/conversations", async (req, res): Promise<void> => {
  const body = CreateAnthropicConversationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [created] = await db
    .insert(conversations)
    .values({ userId: userId(req), title: body.data.title })
    .returning();
  res.status(201).json(serializeConversation(created));
});

// GET /anthropic/conversations/:id
router.get("/anthropic/conversations/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetAnthropicConversationParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const [convo] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.userId, userId(req))));
  if (!convo) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convo.id))
    .orderBy(asc(messages.createdAt), asc(messages.id));
  res.json({ ...serializeConversation(convo), messages: msgs.map(serializeMessage) });
});

// DELETE /anthropic/conversations/:id
router.delete("/anthropic/conversations/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteAnthropicConversationParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const deleted = await db
    .delete(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.userId, userId(req))))
    .returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.status(204).end();
});

// GET /anthropic/conversations/:id/messages
router.get("/anthropic/conversations/:id/messages", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ListAnthropicMessagesParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  // Ownership gate first: messages are only reachable through a conversation
  // the requester owns. Foreign conversation ids read as 404, same as missing.
  const [convo] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.userId, userId(req))));
  if (!convo) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convo.id))
    .orderBy(asc(messages.createdAt), asc(messages.id));
  res.json(msgs.map(serializeMessage));
});

// Each advisor message triggers a model call — rate-limit it more tightly
// than the global 100 req/min so one client can't burn cost/availability.
const advisorLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many advisor requests — please slow down for a minute." },
  skip: () => process.env.NODE_ENV === "test",
});

// POST /anthropic/conversations/:id/messages — SSE stream of the reply
router.post("/anthropic/conversations/:id/messages", advisorLimiter, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = SendAnthropicMessageParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const body = SendAnthropicMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const content = body.data.content.trim();
  if (!content) {
    res.status(400).json({ error: "Message cannot be empty" });
    return;
  }
  if (content.length > MAX_MESSAGE_CHARS) {
    res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_CHARS} characters)` });
    return;
  }

  const [convo] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.userId, userId(req))));
  if (!convo) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({ conversationId: convo.id, role: "user", content });

  // Auto-title fresh conversations from the first user message
  const [countRow] = await db
    .select({ msgCount: count() })
    .from(messages)
    .where(eq(messages.conversationId, convo.id));
  if ((countRow?.msgCount ?? 0) === 1 && (convo.title.trim() === "" || /^new (chat|conversation)$/i.test(convo.title.trim()))) {
    const title = content.length > 60 ? `${content.slice(0, 57)}...` : content;
    await db.update(conversations).set({ title }).where(eq(conversations.id, convo.id));
  }

  let systemPrompt: string;
  let history: Array<{ role: string; content: string }>;
  try {
    [systemPrompt, history] = await Promise.all([
      buildSystemPrompt(userId(req)),
      db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, convo.id))
        .orderBy(asc(messages.createdAt), asc(messages.id)),
    ]);
  } catch (err) {
    logger.error({ err }, "advisor grounding failed");
    res.status(500).json({ error: "Could not load your spending data for the advisor" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  const send = (payload: unknown) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // Build the prompt history under a char budget: walk newest→oldest, always
  // keeping the newest message, then restore chronological order.
  const recent = history.slice(-HISTORY_LIMIT);
  const promptHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
  let used = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    const m = recent[i];
    if (promptHistory.length > 0 && used + m.content.length > HISTORY_CHAR_BUDGET) break;
    promptHistory.unshift({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
    used += m.content.length;
  }
  // The API requires a leading user turn and alternating roles; a failed
  // stream can leave consecutive user messages, so merge same-role runs.
  while (promptHistory.length > 0 && promptHistory[0].role === "assistant") promptHistory.shift();
  const promptMessages: typeof promptHistory = [];
  for (const m of promptHistory) {
    const last = promptMessages[promptMessages.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else promptMessages.push({ ...m });
  }

  let full = "";
  const stream = anthropic.messages.stream({
    model: ADVISOR_MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    messages: promptMessages,
  });
  req.on("close", () => {
    try {
      stream.abort();
    } catch {
      // already finished
    }
  });

  try {
    stream.on("text", (delta) => {
      full += delta;
      send({ content: delta });
    });
    await stream.finalMessage();
    if (full.trim()) {
      await db.insert(messages).values({ conversationId: convo.id, role: "assistant", content: full });
    }
    send({ done: true });
  } catch (err) {
    // Persist whatever was generated so the conversation isn't torn
    if (full.trim()) {
      try {
        await db.insert(messages).values({ conversationId: convo.id, role: "assistant", content: full });
      } catch {
        // best effort
      }
    }
    logger.error({ err }, "advisor stream failed");
    send({ error: "The advisor is unavailable right now. Please try again in a moment." });
  } finally {
    res.end();
  }
});

export default router;
