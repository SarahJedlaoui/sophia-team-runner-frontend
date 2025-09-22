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

  // keep a lightweight "sent" map to avoid double-posting if user hits Next multiple times fast
  const [sentByQid, setSentByQid] = useState({}); // { [questionId]: true }

  const load = async () => {
    const detail = await getCheckin(
      id,
      role === "manager"
        ? { includeResponses: true }
        : { forUser: name }
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
    if (!val) return false; // nothing to save

    // if we already sent something for this qid in this session AND user hasn't changed text,
    // we can skip (simple guard). If you want to allow multiple answers per q, remove this guard.
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
      await load(); // so manager view updates counts
      return true;
    } finally {
      setSending(false);
    }
  };

  const submit = async () => {
    // always save current question
    const saved = await saveAnswerForCurrent();
    if (saved) setText("");
  };

  const next = async () => {
    // 1) save current (if any)
    const saved = await saveAnswerForCurrent();
    // 2) go forward
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
      // clear composer for next question
      setText("");
    }
  };

  const back = () => {
    if (idx > 0) {
      setIdx(idx - 1);
      // Do NOT auto-fill text; we keep the composer empty intentionally.
      // (If you want to re-edit, you could preload previous content here.)
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

  if (!data) return <div>Loading…</div>;

  return (
    <div style={{display:"grid", gridTemplateColumns:"520px 1fr", gap:16}}>
      <section style={card}>
        <div style={{fontSize:12, opacity:.7, marginBottom:6}}>{data.status.toUpperCase()}</div>
        <h2 style={{marginTop:0}}>{data.title}</h2>

        {role === "manager" ? (
          <>
            <div style={{display:"flex", gap:8, marginBottom:12}}>
              <button onClick={doClose} style={primary}>Close & summarize</button>
              <button onClick={load} style={btn}>Refresh</button>
            </div>

            <h3>Summary</h3>
            <pre style={pre}>{data.summary || "(not summarized yet)"}</pre>

            <h3 style={{marginTop:16}}>Answers by question</h3>
            {(data.responses_by_question ? questions : []).map(q => (
              <div key={q.id} style={{marginBottom:12}}>
                <div style={{fontWeight:600, marginBottom:6}}>{q.text}</div>
                <div style={answersBox}>
                  {(data.responses_by_question[String(q.id)] || []).map((r, i) => (
                    <div key={i} style={{marginBottom:8}}>
                      <div style={{fontSize:12, opacity:.7}}>{r.user_name} • {new Date(r.created_at).toLocaleString()}</div>
                      <div>{r.text}</div>
                    </div>
                  ))}
                  {!(data.responses_by_question[String(q.id)] || []).length && <div style={{opacity:.6}}>No answers yet.</div>}
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div style={{marginBottom:8, fontWeight:600}}>Question {idx+1} of {questions.length}</div>
            <div style={qBox}>{currentQ?.text}</div>

            {/* Voice capture appends to the current answer */}
            <MicStreamer
              language="en-US"
              onFinalText={(t)=> setText((p)=> p ? p + " " + t : t)}
            />

            <textarea
              rows={3}
              style={inp}
              placeholder="Speak above or type your answer…"
              value={text}
              onChange={e=>setText(e.target.value)}
            />

            <div style={{display:"flex", gap:8, marginTop:8}}>
              {/* Send always saves CURRENT question */}
              <button disabled={sending} onClick={submit} style={primary}>
                {isLast ? "Send (finish)" : "Send"}
              </button>

              <button onClick={back} style={btn} disabled={idx===0}>Back</button>

              {/* Next: save current (if any), then advance. Hidden on last question */}
              {!isLast && (
                <button onClick={next} style={btn}>
                  Next
                </button>
              )}
            </div>
          </>
        )}
      </section>

      <section style={card}>
        <h3>Activity</h3>
        <div style={{fontSize:12, opacity:.75}}>
          Responses: {data.responses_count}. {role==="manager" && "Refresh to see latest."}
        </div>
      </section>
    </div>
  );
}

const card = { background:"#171a22", padding:16, borderRadius:14, border:"1px solid #262a35" };
const inp = { width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid #2a2f3b", background:"#0f131a", color:"#fff" };
const btn = { padding:"10px 12px", borderRadius:10, background:"#262b38", color:"#fff", border:"1px solid #2e3443", cursor:"pointer" };
const primary = { ...btn, background:"#6b7cff", border:"none" };
const qBox = { background:"#0f131a", border:"1px solid #2a2f3b", borderRadius:10, padding:12, marginBottom:8 };
const answersBox = { background:"#0f131a", border:"1px solid #2a2f3b", borderRadius:10, padding:12 };
const pre = { whiteSpace:"pre-wrap", background:"#0f131a", border:"1px solid #2a2f3b", borderRadius:10, padding:12 };
