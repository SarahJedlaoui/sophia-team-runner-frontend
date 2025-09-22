import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppCtx } from "../App.jsx";
import { listCheckins } from "../lib/api.js";

export default function Home() {
  const nav = useNavigate();
  const { role } = useContext(AppCtx);
  const [items, setItems] = useState([]);
  const [heroText, setHeroText] = useState(
    "Hey Sophia, call all my team at the end of their shift and ask about project updates, blockers"
  );
  const load = async () => {
    const data = await listCheckins();
    setItems(data.items || []);
  };
  useEffect(() => { load(); }, []);
  function sendHeroToCreate() {
    const prompt = (heroText || "").trim();
    if (!prompt) return;
    nav("/create", { state: { prompt } });
  }
  return (
    <div style={styles.page}>
      {/* Page container */}
      <div style={styles.container}>
        {/* Greeting / summary */}
        <section style={styles.greetingWrap}>
          <h1 style={styles.h1}>Hey Keith,</h1>
          <p style={styles.subtitle}>
            Overall morale is good, but concerns about tool availability persist.
            Suggest checking cutter tools before the next shift.
          </p>
        </section>

        {/* Big prompt card (static UI, no new functionality) */}
        <section style={styles.heroSection}>
          <div style={styles.heroTabs}>
            <div style={{ ...styles.tab, ...styles.tabActive }}>
              <span>All team</span>
              <div style={styles.avatars}>
                <div style={{ ...styles.dot, left: 0 }} />
                <div style={{ ...styles.dot, left: 10 }} />
                <div style={{ ...styles.dot, left: 20 }} />
                <div style={{ ...styles.dot, left: 30 }} />
              </div>
            </div>
            <div style={styles.tab}>Today</div>
          </div>

         <div style={styles.heroCard}>
            <textarea
              value={heroText}
              onChange={(e)=>setHeroText(e.target.value)}
              rows={3}
              style={{
                ...styles.heroText,
                width:"100%",
                resize:"vertical",
                border:"none",
                outline:"none",
                background:"transparent"
              }}
            />
            <button
              type="button"
              style={styles.heroCTA}
              aria-label="Send"
              onClick={sendHeroToCreate}
              title="Send to Create Check-in"
            >
              ↥
            </button>
          </div>
        </section>

        {/* Header row: Recents + Create */}
        <div style={styles.rowHeader}>
          <h2 style={styles.h2}>Recents</h2>
          <Link to="/create" style={styles.createBtn}>+ Create check-in</Link>
        </div>

        {/* Cards grid (same functionality; just styled) */}
        <div style={styles.grid}>
          {items.map((c) => (
            <Link key={c.id} to={`/checkins/${c.id}`} style={styles.card}>
              <div style={styles.cardTopRow}>
                <span style={styles.pill}>{c.status}</span>
                <button
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  title="More"
                  style={styles.iconBtn}
                >
                  ⋮
                </button>
              </div>

              <div style={styles.cardTitle}>{c.title}</div>

              <div style={styles.cardMeta}>
                {c.question_count} question{c.question_count === 1 ? "" : "s"} •{" "}
                {c.response_count} response{c.response_count === 1 ? "" : "s"}
              </div>

              <div style={styles.cardFooter}>
                <span style={styles.startLabel}>Start →</span>
              </div>
            </Link>
          ))}
        </div>

        {items.length === 0 && (
          <div style={styles.empty}>No check-ins yet.</div>
        )}

        <div style={styles.tip}>
          {role === "manager"
            ? "Tip: create a new check-in and share with team."
            : "Tip: open a card to answer."}
        </div>

        {/* Optional categories section headers (visual only) */}
        <h3 style={styles.sectionH3}>Clients</h3>
      </div>
    </div>
  );
}

/* ————— Styles ————— */

const styles = {
  page: {
    background: "#F2EDE7",
    minHeight: "100vh",
    padding: "32px 0",
  },
  container: {
    width: "min(1040px, 92%)",
    margin: "0 auto",
  },
  greetingWrap: {
    marginBottom: 18,
  },
  h1: {
    margin: "0 0 6px 0",
    fontSize: 28,
    fontWeight: 700,
    color: "#2B2A28",
  },
  subtitle: {
    margin: 0,
    color: "rgba(43,42,40,0.65)",
    lineHeight: 1.4,
    fontSize: 14,
  },

  heroSection: {
    background: "#FFF9F0",
    borderRadius: 18,
    padding: 16,
    border: "1px solid #EFE6DA",
    boxShadow:
      "0 1px 0 rgba(0,0,0,0.02), 0 10px 20px rgba(0,0,0,0.03) inset",
    marginTop: 16,
    marginBottom: 28,
  },
  heroTabs: {
    display: "flex",
    gap: 12,
    marginBottom: 12,
  },
  tab: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 12,
    background: "#F4ECE3",
    fontSize: 12,
    color: "rgba(43,42,40,0.75)",
    border: "1px solid #E8DFD5",
  },
  tabActive: {
    background: "#FFF",
    borderColor: "#E9E1D8",
    color: "#2B2A28",
  },
  avatars: {
    position: "relative",
    width: 46,
    height: 16,
  },
  dot: {
    position: "absolute",
    top: 1,
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "#F0C9A6",
    border: "1px solid #FFF",
    boxShadow: "0 0 0 1px rgba(0,0,0,0.04)",
  },
  heroCard: {
    position: "relative",
    background: "#FFF",
    borderRadius: 14,
    border: "1px solid #EAE0D6",
    padding: 18,
  },
  heroText: {
    margin: 0,
    color: "#2B2A28",
    lineHeight: 1.5,
  },
  heroCTA: {
    position: "absolute",
    right: 12,
    bottom: 12,
    height: 28,
    width: 28,
    borderRadius: 10,
    border: "1px solid #E9E1D8",
    background: "#FDF4E7",
    fontSize: 16,
    cursor: "pointer",
  },

  rowHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    margin: "6px 0 12px",
  },
  h2: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#2B2A28",
  },
  createBtn: {
    background: "#F0C9A6",
    color: "#fff",
    textDecoration: "none",
    padding: "10px 14px",
    borderRadius: 12,
    fontWeight: 600,
    boxShadow: "0 4px 12px rgba(107,124,255,0.25)",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },

  card: {
    textDecoration: "none",
    color: "#EAEAFB",
    padding: 18,
    borderRadius: 16,
    border: "1px solid #272A35",
    background:
      "radial-gradient(120% 120% at 0% 0%, #343B49 0%, #1A1E27 68%)",
    boxShadow:
      "inset 0 0 0 1px rgba(255,255,255,0.02), 0 10px 24px rgba(0,0,0,0.25)",
    display: "flex",
    flexDirection: "column",
    minHeight: 180,
  },
  cardTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  pill: {
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 0.6,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(240,241,255,0.8)",
  },
  iconBtn: {
    background: "transparent",
    color: "rgba(255,255,255,0.6)",
    border: "1px solid rgba(255,255,255,0.12)",
    width: 28,
    height: 28,
    borderRadius: 10,
    cursor: "default",
  },
  cardTitle: {
    fontWeight: 700,
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 10,
    lineHeight: 1.3,
    flexGrow: 1,
  },
  cardMeta: {
    fontSize: 12,
    opacity: 0.8,
  },
  cardFooter: {
    marginTop: 14,
  },
  startLabel: {
    display: "inline-block",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "8px 10px",
    borderRadius: 12,
    fontSize: 12,
    color: "#F5F7FF",
  },

  empty: {
    opacity: 0.6,
    marginTop: 16,
    color: "#2B2A28",
  },
  tip: {
    marginTop: 18,
    color: "rgba(43,42,40,0.7)",
  },

  sectionH3: {
    marginTop: 28,
    fontSize: 16,
    color: "#2B2A28",
    opacity: 0.9,
  },
};
