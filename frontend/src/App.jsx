import { useState, useEffect } from "react"

const API = "http://127.0.0.1:8000"

function App() {
  const [screen, setScreen] = useState("dashboard")
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState([
    { role: "cortex", text: "Good morning. Your business data is current as of last night. What would you like to know?" }
  ])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetch(`${API}/status`)
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => setStatus(null))
  }, [])

  async function askQuestion() {
    if (!question.trim() || loading) return
    const q = question.trim()
    setQuestion("")
    setMessages(prev => [...prev, { role: "user", text: q }])
    setLoading(true)
    try {
      const res = await fetch(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: "cortex", text: data.answer }])
    } catch {
      setMessages(prev => [...prev, { role: "cortex", text: "I'm having trouble connecting. Please try again." }])
    }
    setLoading(false)
  }

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <div style={styles.logo}>Cortex</div>
          <div style={styles.logoSub}>Rosario's Kitchen</div>
        </div>
        <nav style={styles.nav}>
          {["dashboard", "ask", "report"].map(s => (
            <button
              key={s}
              onClick={() => setScreen(s)}
              style={{
                ...styles.navItem,
                ...(screen === s ? styles.navItemActive : {})
              }}
            >
              {s === "dashboard" && "Dashboard"}
              {s === "ask" && "Ask Cortex"}
              {s === "report" && "Weekly Report"}
            </button>
          ))}
        </nav>
        <div style={styles.sidebarBottom}>
          <div style={styles.statusDot(status)} />
          <span style={styles.statusText}>
            {status ? `${status.vault_files} vault files` : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Main */}
      <div style={styles.main}>

        {/* Dashboard */}
        {screen === "dashboard" && (
          <div style={styles.content}>
            <div style={styles.alert}>
              <div style={styles.alertTag}>Flagged overnight</div>
              <div style={styles.alertText}>
                Labour costs have exceeded 33% of revenue for 6 consecutive weeks.
                February cash position is at risk. Tuesday night staffing is the primary driver.
              </div>
            </div>
            <div style={styles.metricsRow}>
              {[
                { label: "Revenue this week", value: "$18,420", change: "▲ 4.2% vs last week", up: true },
                { label: "Labour cost", value: "34.1%", change: "▲ Above 30% target", up: false },
                { label: "Net this month", value: "$4,210", change: "On pace with October", up: null },
              ].map((m, i) => (
                <div key={i} style={styles.metricCard}>
                  <div style={styles.metricLabel}>{m.label}</div>
                  <div style={styles.metricValue}>{m.value}</div>
                  <div style={{
                    ...styles.metricChange,
                    color: m.up === true ? "#10B981" : m.up === false ? "#EF4444" : "#6B7280"
                  }}>{m.change}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={styles.sectionLabel}>Revenue — last 6 weeks</div>
              {[
                { week: "Wk 45", val: "$16,800", pct: 72 },
                { week: "Wk 46", val: "$15,950", pct: 68 },
                { week: "Wk 47", val: "$17,600", pct: 75 },
                { week: "Wk 48", val: "$16,400", pct: 70 },
                { week: "Wk 49", val: "$17,700", pct: 76 },
                { week: "Wk 50", val: "$18,420", pct: 79 },
              ].map((b, i) => (
                <div key={i} style={styles.barRow}>
                  <span style={styles.barLabel}>{b.week}</span>
                  <div style={styles.barTrack}>
                    <div style={{ ...styles.barFill, width: `${b.pct}%` }} />
                  </div>
                  <span style={styles.barVal}>{b.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ask Cortex */}
        {screen === "ask" && (
          <div style={styles.chatWrap}>
            <div style={styles.chatMessages}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  ...styles.msgWrap,
                  alignItems: m.role === "user" ? "flex-end" : "flex-start"
                }}>
                  <div style={styles.msgSender}>{m.role === "user" ? "You" : "Cortex"}</div>
                  <div style={{
                    ...styles.bubble,
                    ...(m.role === "user" ? styles.bubbleUser : styles.bubbleCortex)
                  }}>{m.text}</div>
                </div>
              ))}
              {loading && (
                <div style={{ ...styles.msgWrap, alignItems: "flex-start" }}>
                  <div style={styles.msgSender}>Cortex</div>
                  <div style={{ ...styles.bubble, ...styles.bubbleCortex, color: "#9CA3AF" }}>
                    Thinking...
                  </div>
                </div>
              )}
            </div>
            <div style={styles.chatInput}>
              <input
                style={styles.input}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && askQuestion()}
                placeholder="Ask anything about your business..."
              />
              <button
                onClick={askQuestion}
                disabled={loading}
                style={styles.sendBtn}
              >
                →
              </button>
            </div>
          </div>
        )}

        {/* Weekly Report */}
        {screen === "report" && (
          <div style={styles.content}>
            <div style={styles.reportDate}>Week 50 · December 9, 2024</div>
            <div style={styles.reportTitle}>Weekly Business Report</div>
            {[
              {
                title: "What happened this week",
                body: "Revenue came in at $18,420 — your strongest week in 6 weeks and 4.2% above last week. Friday and Saturday nights drove the gain. Tuesday remained your weakest night at $1,840, consistent for 14 consecutive weeks."
              },
              {
                title: "What to watch",
                body: "Labour is the pressing issue. At 34.1% of revenue it has been above your 30% target for 6 straight weeks. December will likely mask this as revenue rises — but the cost structure will resurface sharply in January."
              },
              {
                title: "30-day forecast",
                body: "Based on the last two holiday seasons, expect revenue to peak in weeks 51–52 then drop 30–35% in the first two weeks of January. Plan cash reserves accordingly. Last year the January dip lasted 3 weeks before recovering."
              },
              {
                title: "Recommended action",
                body: "Review Tuesday night staffing before the new year. Reducing part-time hours on Tuesdays alone could save approximately $800/month without impacting revenue based on current patterns."
              }
            ].map((s, i) => (
              <div key={i} style={styles.reportSection}>
                <div style={styles.reportSectionTitle}>{s.title}</div>
                <div style={styles.reportBody}>{s.body}</div>
                {i < 3 && <div style={styles.reportDivider} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  shell: {
    display: "flex",
    height: "100vh",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    background: "#F8FCFF",
    overflow: "hidden",
  },
  sidebar: {
    width: 200,
    minWidth: 200,
    background: "#0F172A",
    display: "flex",
    flexDirection: "column",
    padding: "24px 0",
  },
  sidebarTop: {
    padding: "0 20px 20px",
    borderBottom: "0.5px solid rgba(255,255,255,0.06)",
    marginBottom: 16,
  },
  logo: {
    fontSize: 20,
    fontWeight: 600,
    color: "#38BDF8",
    letterSpacing: "-0.5px",
  },
  logoSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    marginTop: 2,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "0 8px",
  },
  navItem: {
    padding: "10px 12px",
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    background: "transparent",
    border: "none",
    borderRadius: 8,
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.15s",
    borderLeft: "2px solid transparent",
  },
  navItemActive: {
    color: "#fff",
    background: "rgba(56,189,248,0.08)",
    borderLeft: "2px solid #38BDF8",
  },
  sidebarBottom: {
    marginTop: "auto",
    padding: "16px 20px",
    borderTop: "0.5px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  statusDot: (status) => ({
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: status ? "#10B981" : "#6B7280",
  }),
  statusText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  alert: {
    background: "#EFF9FF",
    border: "0.5px solid #BAE6FD",
    borderLeft: "3px solid #0EA5E9",
    borderRadius: 10,
    padding: "12px 16px",
  },
  alertTag: {
    fontSize: 9,
    fontWeight: 600,
    color: "#0EA5E9",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 4,
  },
  alertText: {
    fontSize: 12,
    color: "#1E293B",
    lineHeight: 1.6,
  },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
  },
  metricCard: {
    background: "#fff",
    border: "0.5px solid #BAE6FD",
    borderRadius: 10,
    padding: "14px 16px",
  },
  metricLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 600,
    color: "#0F172A",
  },
  metricChange: {
    fontSize: 10,
    marginTop: 3,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 8,
  },
  barRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  barLabel: {
    fontSize: 10,
    color: "#6B7280",
    width: 36,
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    background: "#E0F2FE",
    borderRadius: 4,
    height: 8,
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    background: "#0EA5E9",
  },
  barVal: {
    fontSize: 10,
    color: "#0F172A",
    width: 52,
    textAlign: "right",
  },
  chatWrap: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  chatMessages: {
    flex: 1,
    overflowY: "auto",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  msgWrap: {
    display: "flex",
    flexDirection: "column",
    maxWidth: "80%",
    gap: 3,
  },
  msgSender: {
    fontSize: 10,
    color: "#6B7280",
  },
  bubble: {
    padding: "10px 14px",
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.6,
  },
  bubbleCortex: {
    background: "#F0F9FF",
    border: "0.5px solid #BAE6FD",
    color: "#0F172A",
  },
  bubbleUser: {
    background: "#0EA5E9",
    color: "#fff",
  },
  chatInput: {
    padding: "16px 24px",
    borderTop: "0.5px solid #BAE6FD",
    display: "flex",
    gap: 10,
    background: "#fff",
  },
  input: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: 20,
    border: "0.5px solid #BAE6FD",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    background: "#F0F9FF",
    color: "#0F172A",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#0EA5E9",
    color: "#fff",
    border: "none",
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  reportDate: {
    fontSize: 11,
    color: "#6B7280",
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: 600,
    color: "#0F172A",
    letterSpacing: "-0.5px",
  },
  reportSection: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  reportSectionTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: "#0EA5E9",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  reportBody: {
    fontSize: 13,
    color: "#1E293B",
    lineHeight: 1.7,
  },
  reportDivider: {
    borderTop: "0.5px solid #BAE6FD",
    marginTop: 8,
  },
}

export default App