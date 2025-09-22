import React, { useMemo, useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { speak } from "./lib/speak";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/team/team1";

export const AppCtx = React.createContext(null);

export default function App() {
  const [connected, setConnected] = useState(false);
  const [role, setRole] = useState("manager");   // "manager" | "team"
  const [name, setName] = useState("");
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [speakOn, setSpeakOn] = useState(true);
  const [voice, setVoice] = useState("Joanna");
  const canStart = useMemo(() => !!name && !connected, [name, connected]);

  const logMessage = (msg) => setMessages((prev) => [...prev, msg]);

  const connect = () => {
    if (!name) return;
    const url = `${WS_URL}?name=${encodeURIComponent(name)}&role=${encodeURIComponent(role)}`;
    const ws = new WebSocket(url);
    ws.onopen = () => { setConnected(true); setSocket(ws); logMessage({type:"system", text:`Connected as ${name} (${role})`}); };
    ws.onclose = () => { setConnected(false); setSocket(null); logMessage({type:"system", text:"Disconnected"}); };
    ws.onerror = () => { logMessage({type:"error", text:"WebSocket error"}); };
    ws.onmessage = (evt) => {
      let data; try { data = JSON.parse(evt.data); } catch { return; }
      if ((data.type === "system" || data.type === "error")) {
        logMessage(data);
        if (speakOn && data.text) speak(data.text, { voice });
        return;
      }
      if (data.type === "new_checkin") {
        logMessage({ type:"system", text:`New check-in (#${data.checkin?.id}): “${data.checkin?.title}”` });
        if (speakOn && role === "team") speak(`New check-in. ${data.checkin?.title}`, { voice });
        return;
      }
      if (data.type === "new_response") {
        logMessage({ type:"system", text:`${data.from} responded: ${data.text}` });
        return;
      }
      if (data.type === "summary") {
        logMessage({ type:"summary", text: data.summary });
      }
    };
  };

  const sendWS = (payload) => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  };

  // expose app state to pages
  const ctx = { role, setRole, name, setName, connected, connect, canStart, socket, sendWS, speakOn, setSpeakOn, voice, setVoice, messages };

  const location = useLocation();
  useEffect(()=>{ window.scrollTo(0,0); }, [location.pathname]);

  return (
    <AppCtx.Provider value={ctx}>
      <div style={{display:"grid", gridTemplateColumns:"220px 1fr", minHeight:"100vh", fontFamily:"Inter, system-ui, Arial"}}>
        {/* sidebar */}
        <aside style={{background:"#0c0d11", color:"#fff", padding:16}}>
          <div style={{fontWeight:700, marginBottom:20}}>🌼 Sophia</div>
          <nav style={{display:"grid", gap:8}}>
            <Link to="/" style={linkStyle}>Home</Link>
            <Link to="/create" style={linkStyle}>Create check-in</Link>
          </nav>

          <div style={{marginTop:24, fontSize:12, opacity:.8}}>Profile</div>
          <div style={{marginTop:8}}>
            <div style={{marginBottom:6}}>
              <label>Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sarah" style={inp}/>
            </div>
            <div style={{marginBottom:6}}>
              <label>Role</label>
              <select value={role} onChange={e=>setRole(e.target.value)} style={inp}>
                <option value="manager">Manager</option>
                <option value="team">Team member</option>
              </select>
            </div>
            <button disabled={!canStart} onClick={connect} style={btn}>
              {connected? "Connected" : "Connect"}
            </button>

            <div style={{marginTop:12, display:"flex", gap:8, alignItems:"center"}}>
              <label style={{color:"#ccc"}}><input type="checkbox" checked={speakOn} onChange={e=>setSpeakOn(e.target.checked)} /> Sophia speaks</label>
              <select value={voice} onChange={e=>setVoice(e.target.value)} style={{...inp, width:120}}>
                <option>Joanna</option><option>Matthew</option><option>Olivia</option><option>Lupe</option><option>Arthur</option>
              </select>
            </div>
          </div>
        </aside>

        {/* main */}
        <main style={{background:"#0f1116", color:"#eaeaea", padding:24}}>
          <Outlet />
        </main>
      </div>
    </AppCtx.Provider>
  );
}

const linkStyle = { color:"#cfd3ff", textDecoration:"none", padding:"8px 10px", borderRadius:8, background:"#1a1d26" };
const inp = { width:"90%", marginTop:4, padding:"8px 10px", borderRadius:8, border:"1px solid #333", background:"#10131a", color:"#fff" };
const btn = { marginTop:6, width:"100%", padding:"8px 10px", borderRadius:8, background:"#6b7cff", color:"#fff", border:"none", cursor:"pointer" };
