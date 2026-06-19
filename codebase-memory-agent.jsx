import { useState, useRef, useEffect } from "react";

// ── Mock data for demo ──────────────────────────────────────────────────────
const MOCK_MEMORIES = [
  {
    id: 1,
    type: "architectural",
    title: "Redis introduced for session caching",
    summary: "Switched from in-memory session store to Redis to support horizontal scaling. Decision made after load testing revealed session loss during pod restarts.",
    module: "auth-service",
    author: "sarah.k",
    date: "2026-05-12",
    tags: ["redis", "caching", "sessions", "auth"],
    commit: "a3f2c1d",
  },
  {
    id: 2,
    type: "bug",
    title: "Payment timeout race condition fix",
    summary: "Fixed a race condition where two simultaneous payment requests could result in double charges. Root cause: non-atomic DB read-modify-write. Solution: added pessimistic locking with SELECT FOR UPDATE.",
    module: "payment-service",
    author: "dev.raj",
    date: "2026-04-28",
    tags: ["payments", "race-condition", "database", "locking"],
    commit: "b7e9a2f",
  },
  {
    id: 3,
    type: "decision",
    title: "Migrated from REST to GraphQL for mobile API",
    summary: "Mobile team was over-fetching data on 6 endpoints. Switching to GraphQL reduced payload size by 60% and eliminated 4 extra round trips per screen load.",
    module: "api-gateway",
    author: "priya.m",
    date: "2026-03-10",
    tags: ["graphql", "api", "mobile", "performance"],
    commit: "c4d1e8b",
  },
  {
    id: 4,
    type: "onboarding",
    title: "User onboarding flow redesigned",
    summary: "Replaced 5-step wizard with progressive disclosure. Step-3 drop-off was 72%. New flow shows value immediately before asking for payment info. Conversion improved 34%.",
    module: "onboarding",
    author: "tom.h",
    date: "2026-02-17",
    tags: ["onboarding", "ux", "conversion", "flow"],
    commit: "d9f3a7c",
  },
  {
    id: 5,
    type: "incident",
    title: "DB connection pool exhaustion — Feb 2026",
    summary: "Production incident: connection pool hit max (100) during peak traffic. Temp fix: bumped pool to 200. Permanent fix: added connection pooling via PgBouncer and query timeout middleware.",
    module: "database",
    author: "ops.team",
    date: "2026-02-03",
    tags: ["database", "incident", "postgres", "pgbouncer"],
    commit: "e2b6c9a",
  },
];

const TYPE_META = {
  architectural: { label: "Architecture", color: "#6366f1", bg: "#6366f115" },
  bug:           { label: "Bug Fix",      color: "#ef4444", bg: "#ef444415" },
  decision:      { label: "Decision",     color: "#f59e0b", bg: "#f59e0b15" },
  onboarding:    { label: "Onboarding",   color: "#10b981", bg: "#10b98115" },
  incident:      { label: "Incident",     color: "#f97316", bg: "#f9731615" },
};

// ── Simulated Parcle API ────────────────────────────────────────────────────
async function parcleStore(memory) {
  await new Promise(r => setTimeout(r, 600));
  return { id: Date.now(), stored: true };
}

async function parcleQuery(question, memories) {
  await new Promise(r => setTimeout(r, 900));
  const q = question.toLowerCase();
  const scored = memories.map(m => {
    let score = 0;
    const text = `${m.title} ${m.summary} ${m.tags.join(" ")} ${m.module}`.toLowerCase();
    q.split(/\s+/).forEach(word => { if (text.includes(word)) score++; });
    return { ...m, score };
  }).filter(m => m.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

// ── Simulated Claude API call ───────────────────────────────────────────────
async function askClaude(question, context) {
  const ctxText = context.length
    ? context.map(m => `[${m.type.toUpperCase()}] ${m.title}: ${m.summary}`).join("\n\n")
    : "No relevant memories found.";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: `You are the Codebase Memory Agent — an AI engineering teammate with access to a team's institutional knowledge stored in Parcle (a persistent memory layer). You answer developer questions using the retrieved context below. Be specific, cite commit hashes or authors when available, and be concise but complete.

Retrieved memory context:
${ctxText}`,
      messages: [{ role: "user", content: question }],
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || "Sorry, I couldn't generate a response.";
}

// ── Components ──────────────────────────────────────────────────────────────
function Badge({ type }) {
  const meta = TYPE_META[type] || { label: type, color: "#888", bg: "#88888815" };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
      padding: "2px 8px", borderRadius: 4,
      color: meta.color, background: meta.bg,
      border: `1px solid ${meta.color}30`,
      textTransform: "uppercase",
    }}>{meta.label}</span>
  );
}

function MemoryCard({ m, compact }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onClick={() => setExpanded(e => !e)}
      style={{
        background: "#0f1117",
        border: "1px solid #1e2130",
        borderRadius: 10,
        padding: compact ? "12px 14px" : "16px 18px",
        cursor: "pointer",
        transition: "border-color 0.15s",
        marginBottom: 8,
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#3b82f640"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#1e2130"}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Badge type={m.type} />
        <div style={{ flex: 1 }}>
          <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>{m.title}</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>
            {m.module} · {m.author} · {m.date}
            {m.commit && <span style={{ color: "#3b82f6", marginLeft: 6, fontFamily: "monospace" }}>#{m.commit}</span>}
          </div>
        </div>
        <span style={{ color: "#334155", fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ marginTop: 10, color: "#94a3b8", fontSize: 13, lineHeight: 1.6, borderTop: "1px solid #1e2130", paddingTop: 10 }}>
          {m.summary}
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {m.tags.map(t => (
              <span key={t} style={{ background: "#1e2130", color: "#64748b", fontSize: 11, padding: "2px 7px", borderRadius: 4 }}>#{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChatMessage({ msg }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: msg.role === "user" ? "row-reverse" : "row",
      gap: 10, marginBottom: 16, alignItems: "flex-start",
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        background: msg.role === "user" ? "#3b82f6" : "#6366f1",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, color: "#fff", fontWeight: 700,
      }}>
        {msg.role === "user" ? "U" : "AI"}
      </div>
      <div style={{ maxWidth: "78%" }}>
        {msg.context?.length > 0 && (
          <div style={{ marginBottom: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
            {msg.context.map(c => (
              <span key={c.id} style={{
                fontSize: 10, background: "#1e2130", color: "#64748b",
                padding: "2px 6px", borderRadius: 4, border: "1px solid #2d3748",
              }}>📎 {c.title}</span>
            ))}
          </div>
        )}
        <div style={{
          background: msg.role === "user" ? "#1e3a5f" : "#0f1117",
          border: `1px solid ${msg.role === "user" ? "#3b82f630" : "#1e2130"}`,
          borderRadius: 10, padding: "10px 14px",
          color: "#e2e8f0", fontSize: 14, lineHeight: 1.65,
          whiteSpace: "pre-wrap",
        }}>
          {msg.content}
        </div>
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("chat");
  const [memories, setMemories] = useState(MOCK_MEMORIES);
  const [chat, setChat] = useState([
    {
      role: "assistant",
      content: "👋 Hi! I'm your Codebase Memory Agent. I have access to your team's institutional knowledge stored in Parcle. Ask me anything about your codebase — decisions, bugs, who changed what and why.",
      context: [],
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ingestForm, setIngestForm] = useState({ type: "decision", title: "", module: "", author: "", summary: "", tags: "" });
  const [ingesting, setIngesting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const chatEndRef = useRef(null);
  const PARCLE_KEY = "YOUR_PARCLE_API_KEY"; // replace with real key

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const filteredMemories = searchQ
    ? memories.filter(m => {
        const q = searchQ.toLowerCase();
        return `${m.title} ${m.summary} ${m.module} ${m.tags.join(" ")}`.toLowerCase().includes(q);
      })
    : memories;

  async function sendChat() {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setChat(c => [...c, { role: "user", content: question, context: [] }]);
    setLoading(true);
    try {
      const relevant = await parcleQuery(question, memories);
      const answer = await askClaude(question, relevant);
      setChat(c => [...c, { role: "assistant", content: answer, context: relevant }]);
    } catch {
      setChat(c => [...c, { role: "assistant", content: "⚠️ Could not reach the AI. Check your API key.", context: [] }]);
    }
    setLoading(false);
  }

  async function ingestMemory() {
    if (!ingestForm.title || !ingestForm.summary) return;
    setIngesting(true);
    await parcleStore(ingestForm);
    const newMem = {
      id: Date.now(),
      ...ingestForm,
      date: new Date().toISOString().slice(0, 10),
      tags: ingestForm.tags.split(",").map(t => t.trim()).filter(Boolean),
      commit: Math.random().toString(16).slice(2, 9),
    };
    setMemories(m => [newMem, ...m]);
    setIngestForm({ type: "decision", title: "", module: "", author: "", summary: "", tags: "" });
    setIngesting(false);
    setIngestSuccess(true);
    setTimeout(() => setIngestSuccess(false), 3000);
  }

  const SAMPLE_QUESTIONS = [
    "Why was Redis introduced?",
    "Has there been a payment bug before?",
    "Why did we switch to GraphQL?",
    "What happened in the Feb 2026 incident?",
  ];

  const tabStyle = (t) => ({
    padding: "8px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
    border: "none", transition: "all 0.15s",
    background: tab === t ? "#3b82f6" : "transparent",
    color: tab === t ? "#fff" : "#64748b",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#080b12", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e2130", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 58 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #6366f1, #3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>🧠</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>Codebase Memory Agent</div>
            <div style={{ fontSize: 11, color: "#475569" }}>Powered by Parcle + Claude</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4, background: "#0f1117", border: "1px solid #1e2130", borderRadius: 9, padding: 4 }}>
          {["chat", "memories", "ingest"].map(t => (
            <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
              {t === "chat" ? "💬 Ask" : t === "memories" ? "📚 Knowledge Base" : "➕ Ingest"}
            </button>
          ))}
        </div>
        <div style={{
          fontSize: 11, color: "#10b981", background: "#10b98115",
          border: "1px solid #10b98130", borderRadius: 6, padding: "4px 10px",
        }}>● Parcle Connected</div>
      </div>

      {/* Stats bar */}
      <div style={{ borderBottom: "1px solid #1e2130", padding: "10px 24px", display: "flex", gap: 24 }}>
        {[
          { label: "Memories stored", value: memories.length },
          { label: "Modules tracked", value: [...new Set(memories.map(m => m.module))].length },
          { label: "Contributors", value: [...new Set(memories.map(m => m.author))].length },
          { label: "Types", value: Object.keys(TYPE_META).length },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#3b82f6" }}>{s.value}</span>
            <span style={{ fontSize: 12, color: "#475569" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px" }}>

        {/* ── CHAT TAB ── */}
        {tab === "chat" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>Try asking:</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SAMPLE_QUESTIONS.map(q => (
                  <button key={q} onClick={() => setInput(q)} style={{
                    background: "#0f1117", border: "1px solid #1e2130",
                    color: "#94a3b8", fontSize: 12, padding: "5px 12px",
                    borderRadius: 20, cursor: "pointer",
                  }}>{q}</button>
                ))}
              </div>
            </div>

            <div style={{
              background: "#0a0d15", border: "1px solid #1e2130",
              borderRadius: 12, padding: "20px",
              minHeight: 380, maxHeight: 480, overflowY: "auto",
            }}>
              {chat.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
              {loading && (
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 700 }}>AI</div>
                  <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[0,1,2].map(i => (
                        <div key={i} style={{
                          width: 7, height: 7, borderRadius: "50%", background: "#3b82f6",
                          animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder="Ask about any code decision, bug, or change..."
                style={{
                  flex: 1, background: "#0f1117", border: "1px solid #1e2130",
                  borderRadius: 10, padding: "12px 16px", color: "#e2e8f0",
                  fontSize: 14, outline: "none",
                }}
              />
              <button
                onClick={sendChat}
                disabled={loading || !input.trim()}
                style={{
                  background: loading || !input.trim() ? "#1e2130" : "#3b82f6",
                  color: "#fff", border: "none", borderRadius: 10,
                  padding: "12px 20px", fontSize: 14, fontWeight: 600,
                  cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}>
                {loading ? "Querying..." : "Ask →"}
              </button>
            </div>
          </div>
        )}

        {/* ── MEMORIES TAB ── */}
        {tab === "memories" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search knowledge base..."
                style={{
                  flex: 1, background: "#0f1117", border: "1px solid #1e2130",
                  borderRadius: 8, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, outline: "none",
                }}
              />
              <div style={{ display: "flex", gap: 4 }}>
                {Object.entries(TYPE_META).map(([key, meta]) => (
                  <button key={key} onClick={() => setSearchQ(key === searchQ ? "" : key)} style={{
                    background: searchQ === key ? meta.bg : "#0f1117",
                    color: searchQ === key ? meta.color : "#475569",
                    border: `1px solid ${searchQ === key ? meta.color + "60" : "#1e2130"}`,
                    borderRadius: 6, padding: "6px 10px", fontSize: 11,
                    fontWeight: 600, cursor: "pointer", textTransform: "uppercase",
                  }}>{meta.label}</button>
                ))}
              </div>
            </div>
            <div style={{ color: "#475569", fontSize: 12, marginBottom: 12 }}>
              {filteredMemories.length} of {memories.length} memories
            </div>
            {filteredMemories.map(m => <MemoryCard key={m.id} m={m} />)}
            {filteredMemories.length === 0 && (
              <div style={{ textAlign: "center", color: "#334155", padding: 40 }}>
                No memories match your search.
              </div>
            )}
          </div>
        )}

        {/* ── INGEST TAB ── */}
        {tab === "ingest" && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Add to Knowledge Base</div>
              <div style={{ color: "#475569", fontSize: 13 }}>Record a decision, bug fix, or architectural change. It'll be stored in Parcle and instantly searchable.</div>
            </div>

            {ingestSuccess && (
              <div style={{ background: "#10b98115", border: "1px solid #10b98130", borderRadius: 8, padding: "10px 14px", color: "#10b981", fontSize: 13, marginBottom: 16 }}>
                ✓ Memory stored in Parcle successfully!
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Type</label>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {Object.entries(TYPE_META).map(([key, meta]) => (
                    <button key={key} onClick={() => setIngestForm(f => ({ ...f, type: key }))} style={{
                      background: ingestForm.type === key ? meta.bg : "#0f1117",
                      color: ingestForm.type === key ? meta.color : "#475569",
                      border: `1px solid ${ingestForm.type === key ? meta.color + "60" : "#1e2130"}`,
                      borderRadius: 6, padding: "6px 12px", fontSize: 12,
                      fontWeight: 600, cursor: "pointer",
                    }}>{meta.label}</button>
                  ))}
                </div>
              </div>

              {[
                { key: "title", label: "Title", placeholder: "e.g. Switched auth to JWT tokens" },
                { key: "module", label: "Module / Service", placeholder: "e.g. auth-service" },
                { key: "author", label: "Author", placeholder: "e.g. sarah.k" },
                { key: "tags", label: "Tags (comma-separated)", placeholder: "e.g. auth, jwt, security" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</label>
                  <input
                    value={ingestForm[key]}
                    onChange={e => setIngestForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{
                      width: "100%", marginTop: 6, background: "#0f1117",
                      border: "1px solid #1e2130", borderRadius: 8,
                      padding: "10px 14px", color: "#e2e8f0", fontSize: 14,
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}

              <div>
                <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Summary / Rationale</label>
                <textarea
                  value={ingestForm.summary}
                  onChange={e => setIngestForm(f => ({ ...f, summary: e.target.value }))}
                  placeholder="Describe what changed, why it changed, and any important context or trade-offs..."
                  rows={4}
                  style={{
                    width: "100%", marginTop: 6, background: "#0f1117",
                    border: "1px solid #1e2130", borderRadius: 8,
                    padding: "10px 14px", color: "#e2e8f0", fontSize: 14,
                    outline: "none", resize: "vertical", boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <button
                onClick={ingestMemory}
                disabled={ingesting || !ingestForm.title || !ingestForm.summary}
                style={{
                  background: ingesting || !ingestForm.title || !ingestForm.summary ? "#1e2130" : "#6366f1",
                  color: "#fff", border: "none", borderRadius: 10,
                  padding: "12px 20px", fontSize: 14, fontWeight: 600,
                  cursor: ingesting || !ingestForm.title || !ingestForm.summary ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}>
                {ingesting ? "Storing in Parcle..." : "Store in Parcle →"}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0f1117; }
        ::-webkit-scrollbar-thumb { background: #1e2130; border-radius: 3px; }
        input::placeholder, textarea::placeholder { color: #334155; }
      `}</style>
    </div>
  );
}
