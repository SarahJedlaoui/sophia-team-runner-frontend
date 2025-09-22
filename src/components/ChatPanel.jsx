// src/components/ChatPanel.jsx
import React, { useRef, useState } from "react";
import { draftCheckin } from "../lib/api";
import { speak } from "../lib/speak";
import { speakPolly } from "../lib/tts";
import VoiceOrb from "./VoiceOrb";
import MicStreamer from "./MicStreamer";

export default function ChatPanel({ draft, setDraft, speakOn=true, voice="Olivia" }) {
  const [msgs, setMsgs] = useState([{role:"assistant", content:"Hi! Tell me what you want to ask your team and I’ll shape a clean check-in."}]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const micRef = useRef(null);
  const scroller = useRef(null);

  const scrollDown = ()=> queueMicrotask(()=> scroller.current?.scrollTo({top:99999, behavior:"smooth"}));

  async function send(text = input.trim()) {
    if (!text || loading) return;
    setMsgs(m=>[...m,{role:"user", content:text}]);
    setInput("");
    setLoading(true);
    scrollDown();
    try{
      const res = await draftCheckin({
        messages:[...msgs,{role:"user", content:text}],
        current:{ title: draft.title, questions: draft.questions }
      });
      setDraft(d=>({ title: res.title ?? d.title, questions: res.questions?.length? res.questions : d.questions }));
      setMsgs(m=>[...m,{role:"assistant", content: res.reply}]);
      scrollDown();
      if (speakOn){
        setSpeaking(true);
        try { await speakPolly(res.reply, { voice }); }
        catch { await speak(res.reply, { voice }); }
        finally { setSpeaking(false); }
      }
    } finally {
      setLoading(false);
    }
  }

  // Voice controls
  function toggleVoice(){
    if (listening){ micRef.current?.stop(); }
    else { micRef.current?.start(); }
  }

  const onMicStatus = (s) => {
    const rec = s === "recording";
    setListening(rec);
    if (rec) stopTTS();            // ← barge-in: cut Sophia as soon as you talk
  };

const onAssistantReply = async (text) => {
    // Show reply in UI immediately…
    // Then speak it (interruptible):
    if (speakOn) await speakPolly(text, { voice, style: "conversational" });
  };


  return (
    <div style={panel}>
      {/* header */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10}}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <VoiceOrb speaking={speaking || loading} />
          <div style={{fontWeight:700}}>Sophia</div>
        </div>
        <button onClick={toggleVoice} style={pill}>
          {listening ? "⏹ Stop" : "🎙️ Voice"}
        </button>
      </div>

      {/* messages */}
      <div ref={scroller} style={feed}>
        {msgs.map((m,i)=>(
          <div key={i} style={{marginBottom:10, display:"flex", justifyContent: m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{
              maxWidth:"80%", background: m.role==="user"?"#2a2f3b":"#0f131a",
              border:"1px solid #2a2f3b", padding:"10px 12px", borderRadius:12, color:"#fff", whiteSpace:"pre-wrap"
            }}>{m.content}</div>
          </div>
        ))}
      </div>

      {/* input row */}
      <div style={{display:"flex", gap:8, marginTop:10}}>
        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          placeholder="Type here…"
          style={inp}
          onKeyDown={(e)=> e.key==="Enter" && !e.shiftKey && send()}
          disabled={speaking || loading}
        />
        <button onClick={()=>send()} disabled={speaking || loading} style={primary}>Send</button>
      </div>

      {/* hidden mic streamer under the hood */}
      <MicStreamer
        ref={micRef}
        hiddenUI
        language="en-US"
        onStatusChange={(s)=> setListening(s==="recording")}
        onPartial={(p)=> p && setInput(p)}                         // show partial in the input
        onFinalText={(t)=> { setInput(""); send(t); }}            // final transcript -> send
      />

      {/* overlays */}
      {listening && (
        <Overlay text="Listening…" />
      )}
      {speaking && (
        <Overlay text="Sophia is talking" />
      )}
    </div>
  );
}

function Overlay({ text }){
  return (
    <div style={overlay}>
      <div style={orbBig}/>
      <div style={{marginTop:12, opacity:.9}}>{text}</div>
    </div>
  );
}

/* styles */
const panel   = { background:"#171a22", padding:16, borderRadius:14, border:"1px solid #262a35", minHeight:420, display:"flex", flexDirection:"column", position:"relative" };
const feed    = { flex:1, overflow:"auto", border:"1px solid #2a2f3b", borderRadius:10, padding:10, background:"#0b0f15" };
const inp     = { flex:1, padding:"10px 12px", borderRadius:10, border:"1px solid #2a2f3b", background:"#0f131a", color:"#fff" };
const primary = { padding:"10px 12px", borderRadius:10, background:"#6b7cff", color:"#fff", border:"none", cursor:"pointer" };
const pill    = { padding:"8px 12px", borderRadius:999, background:"#262b38", color:"#fff", border:"1px solid #2e3443", cursor:"pointer", fontSize:12 };

const overlay = {
  position:"absolute", inset:0, display:"flex", flexDirection:"column",
  alignItems:"center", justifyContent:"center",
  background:"linear-gradient(180deg, rgba(13,16,23,.55), rgba(13,16,23,.65))",
  pointerEvents:"none", textAlign:"center"
};
const orbBig = {
  width:120, height:120, borderRadius:999,
  background:"radial-gradient(60% 60% at 50% 50%, #6b7cff 0%, #2c2f3a 100%)",
  position:"relative", boxShadow:"0 0 60px rgba(107,124,255,.45)"
};
