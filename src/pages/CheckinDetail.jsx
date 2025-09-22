// src/pages/CheckinDetail.jsx
import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppCtx } from "../App.jsx";
import { getCheckin, addResponse, closeCheckin } from "../lib/api.js";
import MicStreamer from "../components/MicStreamer.jsx";
import { speak } from "../lib/speak.js";

export default function CheckinDetail() {
  const { id } = useParams();
  const { role, name, speakOn, voice } = useContext(AppCtx);

  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // avoid double-posting
  const [sentByQid, setSentByQid] = useState({}); // { [questionId]: true }

  const load = async () => {
    const detail = await getCheckin(
      id,
      role === "manager" ? { includeResponses: true } : { forUser: name }
    );
    setData(detail);
  };
  useEffect(() => { load(); }, [id, role, name]);

  const questions = data?.questions || [];
  const currentQ = questions[idx];
  const isLast = idx === Math.max(0, questions.length - 1);

  const saveAnswerForCurrent = async () => {
    if (!currentQ) return false;
    const qid = currentQ.id;

    const val = (text || "").trim();
    if (!val) return false;

    if (sentByQid[qid]) return true;

    setSending(true);
    try {
      await addResponse(id, {
        question_id: qid,
        user_name: name || "Teammate",
        text: val,
      });
      setSentByQid((m) => ({ ...m, [qid]: true }));
      if (speakOn) speak("Thanks!", { voice });
      await load();
      return true;
    } finally {
      setSending(false);
    }
  };

  const submit = async () => {
    const saved = await saveAnswerForCurrent();
    if (saved) setText("");
  };

  const next = async () => {
    const saved = await saveAnswerForCurrent();
    if (saved && idx < questions.length - 1) {
      setIdx(idx + 1);
      setText("");
    }
  };

  const back = () => {
    if (idx > 0) {
      setIdx(idx - 1);
      setText("");
    }
  };

  const doClose = async () => {
    try {
      const res = await closeCheckin(id);
      await load();
      if (speakOn) speak("Summary ready.", { voice });
      alert("Summary generated:\n\n" + (res.summary || ""));
    } catch (e) {
      alert("Close failed: " + e.message);
    }
  };

  if (!data) return <div style={{ padding: 16 }}>Loading…</div>;

  // ——— theme (matches the new pages) ———
  const t = {
    page:  "#F2EDE7",
    card:  "#FFF9F0",
    border:"#EFE6DA",
    text:  "#2B2A28",
    subtle:"rgba(43,42,40,.70)",
    chip:  "#F4ECE3",
    input: "#FFFFFF",
    inputB:"#EAE0D6",
    primary:"#FF8A2A",
  };

  return (
    <div style={{ background: t.page, minHeight: "100vh" }}>
      <div style={{ width: "min(960px, 92%)", margin: "0 auto", padding: "24px 0" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
          <span style={pill(t)}>{data.status}</span>
          <h2 style={{ margin: 0, color: t.text }}>{data.title}</h2>
        </div>

        <section style={card(t)}>
          {role === "manager" ? (
            <>
              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button onClick={doClose} style={primary(t)}>Close &amp; summarize</button>
                <button onClick={load} style={btn(t)}>Refresh</button>
              </div>

              {/* Summary */}
              <h3 style={h3(t)}>Summary</h3>
              <pre style={pre(t)}>{data.summary || "(not summarized yet)"}</pre>

              {/* Answers */}
              <h3 style={{ ...h3(t), marginTop: 16 }}>Answers by question</h3>
              {(data.responses_by_question ? questions : []).map((q) => (
                <div key={q.id} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: t.text }}>{q.text}</div>
                  <div style={answersBox(t)}>
                    {(data.responses_by_question[String(q.id)] || []).map((r, i) => (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: t.subtle }}>
                          {r.user_name} • {new Date(r.created_at).toLocaleString()}
                        </div>
                        <div style={{ color: t.text }}>{r.text}</div>
                      </div>
                    ))}
                    {!(data.responses_by_question[String(q.id)] || []).length && (
                      <div style={{ opacity: .6, color: t.text }}>No answers yet.</div>
                    )}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {/* Progress */}
              <div style={{ marginBottom: 8, fontWeight: 600, color: t.text }}>
                Question {idx + 1} of {questions.length}
              </div>

              {/* Question */}
              <div style={qBox(t)}>{currentQ?.text}</div>

              {/* Voice capture */}
              <MicStreamer
                language="en-US"
                onFinalText={(t0) => setText((p) => (p ? p + " " + t0 : t0))}
              />

              {/* Answer input */}
              <textarea
                rows={4}
                style={inp(t)}
                placeholder="Speak above or type your answer…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              {/* Buttons */}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button disabled={sending} onClick={submit} style={primary(t)}>
                  {isLast ? "Send (finish)" : "Send"}
                </button>
                <button onClick={back} style={btn(t)} disabled={idx === 0}>Back</button>
                {!isLast && (
                  <button onClick={next} style={btn(t)}>
                    Next
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* ——— styles ——— */
const card = (t) => ({
  background: t.card,
  padding: 16,
  borderRadius: 18,
  border: `1px solid ${t.border}`,
});

const h3 = (t) => ({ margin: "12px 0 6px", color: t.text });

const pill = (t) => ({
  textTransform: "uppercase",
  fontSize: 11,
  letterSpacing: 0.6,
  padding: "6px 10px",
  borderRadius: 999,
  background: t.chip,
  border: `1px solid ${t.border}`,
  color: t.text,
});

const inp = (t) => ({
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${t.inputB}`,
  background: t.input,
  color: t.text,
});

const btn = (t) => ({
  padding: "10px 12px",
  borderRadius: 12,
  background: "#F0E7DC",
  color: t.text,
  border: `1px solid ${t.border}`,
  cursor: "pointer",
});

const primary = (t) => ({
  ...btn(t),
  background: t.primary,
  border: `1px solid ${t.primary}`,
  color: "#fff",
  boxShadow: "0 6px 14px rgba(255,138,42,.25)",
});

const qBox = (t) => ({
  background: "#F7F2EC",
  border: `1px solid ${t.border}`,
  borderRadius: 12,
  padding: 12,
  marginBottom: 8,
  color: t.text,
});

const answersBox = (t) => ({
  background: "#F7F2EC",
  border: `1px solid ${t.border}`,
  borderRadius: 12,
  padding: 12,
});

const pre = (t) => ({
  whiteSpace: "pre-wrap",
  background: "#F7F2EC",
  border: `1px solid ${t.border}`,
  borderRadius: 12,
  padding: 12,
  color: t.text,
});
