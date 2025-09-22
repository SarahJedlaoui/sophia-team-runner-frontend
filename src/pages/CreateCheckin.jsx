// src/pages/CreateCheckin.jsx
import React, { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppCtx } from "../App.jsx";
import { createCheckin } from "../lib/api.js";
import ChatPanel from "../components/ChatPanel.jsx";

export default function CreateCheckin() {
  const nav = useNavigate();
  const { name, speakOn, voice } = useContext(AppCtx);

  // DRAFT state that's shared between the left card and the chat panel
  const [draft, setDraft] = useState({
    title: "Daily check-in",
    questions: [
      "What task are you currently working on?",
      "Did you face any technical or safety issues today?",
      "Are there any blockers slowing down your work?"
    ],
  });

  // Left “meta” fields (visual only for now; they can become real later)
  const [audience, setAudience] = useState("Tech team members");
  const [duration, setDuration] = useState("Daily • 5 min");
  const [channel, setChannel]  = useState("Via WhatsApp");
  const [deadline, setDeadline] = useState("By the end of the day");

  const addQ    = () => setDraft(d=> ({...d, questions:[...d.questions, ""]}));
  const setQ    = (i,v)=> setDraft(d=> ({...d, questions: d.questions.map((q,idx)=> idx===i? v : q)}));
  const removeQ = (i)  => setDraft(d=> ({...d, questions: d.questions.filter((_,idx)=> idx!==i)}));

  const cleanQs = useMemo(
    ()=> draft.questions.map(q=>q.trim()).filter(Boolean),
    [draft.questions]
  );

  async function share() {
    if (!draft.title.trim() || cleanQs.length===0) {
      alert("Please add a title and at least one follow-up question.");
      return;
    }
    await createCheckin({
      title: draft.title.trim(),
      created_by: name || "Manager",
      questions: cleanQs
    });
    nav("/"); // back to home where the new card will appear
  }

  return (
    <div style={wrap}>
      {/* LEFT: Daily check-in card */}
      <section style={card}>
        <div style={{fontWeight:700, marginBottom:10}}>Daily checkin</div>

        {/* Title */}
        <div style={label}>Title</div>
        <input
          style={inp}
          placeholder="e.g., Tech team daily"
          value={draft.title}
          onChange={(e)=> setDraft(d => ({...d, title: e.target.value}))}
        />

        {/* Follow-ups list */}
        <div style={{marginTop:14, fontWeight:700}}>Sophia will ask the team about</div>
        <div style={{display:"grid", gap:8, marginTop:8}}>
          {draft.questions.map((q,i)=>(
            <div key={i} style={{display:"grid", gridTemplateColumns:"1fr auto", gap:8}}>
              <input style={inp} value={q} onChange={e=>setQ(i,e.target.value)} />
              <button onClick={()=>removeQ(i)} style={iconBtn}>✕</button>
            </div>
          ))}
        </div>
        <button onClick={addQ} style={{...btn, marginTop:10}}>+ Add follow-up</button>

        <div style={{display:"flex", gap:8, marginTop:16}}>
          <button onClick={share} style={primary}>Share with team</button>
          <button style={btn} onClick={()=>window.history.back()}>Pause</button>
          <button style={ghost}>⚙︎</button>
        </div>
      </section>

      {/* RIGHT: Sophia chat (text + voice orb) */}
      <section style={card}>
        <ChatPanel
          draft={draft}
          setDraft={setDraft}
          speakOn={speakOn}
          voice={voice}
        />
      </section>
    </div>
  );
}

function Pill({ value, onChange }) {
  return (
    <input
      style={{...inp, fontSize:12, opacity:.9}}
      value={value}
      onChange={(e)=>onChange(e.target.value)}
    />
  );
}

const wrap   = {
  display:"grid",
  gridTemplateColumns:"minmax(320px, 520px) 1fr",
  gap:16,
  alignItems:"start",
};
const card   = { background:"#171a22", padding:16, borderRadius:14, border:"1px solid #262a35", minHeight:420 };
const label  = { margin:"12px 0 6px", opacity:.8, fontSize:12 };
const inp    = { width:"95%", padding:"10px 12px", borderRadius:10, border:"1px solid #2a2f3b", background:"#0f131a", color:"#fff" };
const btn    = { padding:"10px 12px", borderRadius:10, background:"#262b38", color:"#fff", border:"1px solid #2e3443", cursor:"pointer" };
const primary= { ...btn, background:"#6b7cff", border:"none" };
const ghost  = { ...btn, width:42, textAlign:"center", background:"#0f131a" };
const iconBtn= { ...btn, width:40, textAlign:"center" };
