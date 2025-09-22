// src/pages/CreateCheckin.jsx
import React, { useContext, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppCtx } from "../App.jsx";
import { createCheckin } from "../lib/api.js";
import ChatPanel from "../components/ChatPanel.jsx";

export default function CreateCheckin() {
  const nav = useNavigate();
  const location = useLocation();
  const initialPrompt = location.state?.prompt || "";
  const { name, speakOn, voice } = useContext(AppCtx);
  const chatRef = useRef(null);

  // === original draft state (unchanged) ===
  const [draft, setDraft] = useState({
    title: "Daily check-in",
    questions: [

    ],
  });

  // Meta (visual only)
  const [persona, setPersona] = useState("Keith");            // "Keith" | "Sophia"
  const [sendTo, setSendTo] = useState("All team");
  const [channel, setChannel] = useState("WhatsApp");
  const [length, setLength] = useState("Short (~2 min)");   // or "Detailed (~10 min)"
  const [askOpen, setAskOpen] = useState({ updates: true, blockers: false, notes: false });

  const addQ = () => setDraft(d => ({ ...d, questions: [...d.questions, ""] }));
  const setQ = (i, v) => setDraft(d => ({ ...d, questions: d.questions.map((q, idx) => idx === i ? v : q) }));
  const removeQ = (i) => setDraft(d => ({ ...d, questions: d.questions.filter((_, idx) => idx !== i) }));

  const cleanQs = useMemo(
    () => draft.questions.map(q => q.trim()).filter(Boolean),
    [draft.questions]
  );

  async function share() {
    if (!draft.title.trim() || cleanQs.length === 0) {
      alert("Please add a title and at least one follow-up question.");
      return;
    }
    await createCheckin({
      title: draft.title.trim(),
      created_by: name || "Manager",
      questions: cleanQs
    });
    nav("/"); // back to home
  }

  // warm theme
  const t = {
    page: "#F2EDE7",
    card: "#FFF9F0",
    border: "#EFE6DA",
    text: "#2B2A28",
    subtle: "rgba(43,42,40,.65)",
    chip: "#F4ECE3",
    input: "#FFFFFF",
    inputB: "#EAE0D6",
    orange: "#FF8A2A",
  };

  return (
    <div style={{ background: t.page, minHeight: "100vh" }}>
      <div style={{ width: "min(980px,92%)", margin: "0 auto", padding: "24px 0" }}>
        {/* Title & subtitle */}
        <h1 style={{ margin: 0, fontSize: 22, color: t.text }}>
          Subject: {draft.title || "Team Check-In"}
        </h1>
        <p style={{ margin: "6px 0 16px", color: t.subtle }}>
          Call team to ask about updates and blockers
        </p>

        {/* Form card */}
        <section style={{
          background: t.card, border: `1px solid ${t.border}`, borderRadius: 18, padding: 16
        }}>
          {/* Rows */}
          <Row label="Persona">
            <ChipGroup value={persona} onChange={setPersona} t={t} items={["Keith", "Sophia"]} />
          </Row>

          <Row label="Send to">
            <ChipGroup value={sendTo} onChange={setSendTo} t={t} items={["All team"]} trailingAvatars />
          </Row>

          <Row label="On">
            <ChipGroup value={channel} onChange={setChannel} t={t} items={["WhatsApp", "Sophia"]} />
          </Row>

          <Row label="Length">
            <ChipGroup value={length} onChange={setLength} t={t} items={["Short (~2 min)", "Detailed (~10 min)"]} />
          </Row>

          {/* Ask about (mock accordions; just visual) */}
          <div style={{ marginTop: 18, color: t.text, fontSize: 14, fontWeight: 600 }}>Ask about</div>
          <section style={{ marginTop: 16, background: t.card, border: `1px solid ${t.border}`, borderRadius: 18, padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, color: t.text }}>Sophia will ask the team about</div>
            <div style={{ display: "grid", gap: 8 }}>
              {draft.questions.map((q, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                  <input
                    style={inpLight(t)}
                    value={q}
                    onChange={e => setQ(i, e.target.value)}
                  />
                  <button onClick={() => removeQ(i)} style={iconBtnLight(t)}>✕</button>
                </div>
              ))}
            </div>
            <button onClick={addQ} style={{ ...btn(t), marginTop: 10 }}>+ Add follow-up</button>
          </section>



          {/* —— Composer (ChatPanel in composer-only mode) —— */}
          <div style={{
            marginTop: 14,
            border: `1px solid ${t.border}`,
            background: "#F7F2EC",
            borderRadius: 14,
            padding: 0
          }}>
            <ChatPanel
              ref={chatRef}
              draft={draft}
              setDraft={setDraft}
              speakOn={speakOn}
              voice={voice}
              initialPrompt={initialPrompt}
              variant="composerOnly"   // ← render only textarea + send arrow
              theme="light"            // ← switch to beige styles
            />
          </div>

          {/* Buttons row: Save / Play / Send */}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={share} style={btn(t)}>Save</button>
            <button onClick={() => alert("Play preview not wired")} style={btn(t)}>Play</button>
            <button
              onClick={() => chatRef.current?.send()}   // ← triggers AI draft via ChatPanel
              style={{
                ...btn(t),
                background: "#796758", color: "#fff", borderColor: "#796758", marginLeft: "auto",
                display: "inline-flex", alignItems: "center", gap: 8
              }}
              title="Send to Sophia"
            >
              Send to team<span aria-hidden>→</span>
            </button>
          </div>
        </section>



      </div>
    </div>
  );
}

/* ——— Small, focused UI bits ——— */
function Row({ label, children }) {
  const tText = "#2B2A28";
  const tSubtle = "rgba(43,42,40,.75)";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, alignItems: "center", marginBottom: 10 }}>
      <div style={{ color: tSubtle, fontSize: 13 }}>{label}</div>
      <div style={{ color: tText }}>{children}</div>
    </div>
  );
}

function ChipGroup({ value, onChange, items, t, trailingAvatars }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {items.map((it) => (
        <button
          key={it}
          onClick={() => onChange(it)}
          style={{
            padding: "8px 12px",
            borderRadius: 12,
            background: value === it ? "#FFF" : t.chip,
            border: `1px solid ${t.border}`,
            color: "#2B2A28",
            fontWeight: 600
          }}
        >
          {it}
        </button>
      ))}
      {trailingAvatars && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
          {[0, 1, 2, 3].map((n) => (
            <div key={n} style={{
              width: 16, height: 16, borderRadius: 999, background: "#F0C9A6",
              border: "1px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,.04)", marginLeft: -6
            }} />
          ))}
          <span style={{
            fontSize: 10, padding: "2px 6px", borderRadius: 999,
            background: "#F6E8D8", border: `1px solid ${t.border}`, marginLeft: 2
          }}>+12</span>
        </div>
      )}
    </div>
  );
}

function AccordionRow({ label, open, onToggle, t }) {
  return (
    <div
      onClick={onToggle}
      style={{
        marginTop: 8,
        borderTop: `1px solid ${t.border}`,
        padding: "12px 4px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: "#2B2A28"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 18, height: 18, borderRadius: 999, border: `1px solid ${t.border}`, display: "inline-flex",
          alignItems: "center", justifyContent: "center", background: "#FFF"
        }}>{open ? "✓" : ""}</span>
        {label}
      </div>
      <span aria-hidden style={{ opacity: .6 }}>{open ? "▾" : "▸"}</span>
    </div>
  );
}

const btn = (t) => ({
  padding: "10px 14px",
  borderRadius: 12,
  background: "#F0E7DC",
  border: `1px solid ${t.border}`,
  color: "#2B2A28",
  fontWeight: 700,
  cursor: "pointer"
});

const inpLight = (t) => ({
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${t.inputB}`,
  background: t.input,
  color: "#2B2A28"
});

const iconBtnLight = (t) => ({
  padding: "10px 12px",
  borderRadius: 10,
  background: "#F4ECE3",
  color: "#2B2A28",
  border: `1px solid ${t.inputB}`,
  cursor: "pointer",
  width: 42,
  textAlign: "center"
});
