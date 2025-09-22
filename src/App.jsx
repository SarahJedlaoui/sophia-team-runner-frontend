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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileOpen, setMobileOpen] = useState(false);
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

  const ctx = { role, setRole, name, setName, connected, connect, canStart, socket, sendWS, speakOn, setSpeakOn, voice, setVoice, messages };

  const location = useLocation();
  useEffect(()=>{ window.scrollTo(0,0); }, [location.pathname]);

  // responsive watcher
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // —— theme (matches the new page) ——
  const theme = {
    pageBg: "#F2EDE7",
    panelBg: "#FFF9F0",
    panelBorder: "#EFE6DA",
    text: "#2B2A28",
    textSubtle: "rgba(43,42,40,0.75)",
    inputBg: "#FFFFFF",
    inputBorder: "#EAE0D6",
    navChip: "#F4ECE3",
    primary: "#F0C9A6",
    mainBg: "transparent",
  };

  const shell = {
    background: theme.pageBg,
    minHeight: "100vh",
    fontFamily: "Inter, system-ui, Arial",
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "240px 1fr",
  };

  const asideWrap = {
    background: theme.panelBg,
    color: theme.text,
    padding: 16,
    borderRight: isMobile ? "none" : `1px solid ${theme.panelBorder}`,
    borderBottom: isMobile ? `1px solid ${theme.panelBorder}` : "none",
    position: "relative",
    zIndex: 2,
  };

  const brand = { fontWeight: 800, letterSpacing: 0.4, marginBottom: isMobile ? 0 : 16 };

  const navRow = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const mobileToggle = {
    display: isMobile ? "inline-flex" : "none",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 10px",
    borderRadius: 10,
    border: `1px solid ${theme.panelBorder}`,
    background: theme.navChip,
    color: theme.text,
    cursor: "pointer",
  };

  const navGrid = {
    display: isMobile ? (mobileOpen ? "grid" : "none") : "grid",
    gap: 8,
    marginTop: isMobile ? 12 : 8,
  };

  const linkStyle = {
    color: theme.text,
    textDecoration: "none",
    padding: "10px 12px",
    borderRadius: 12,
    background: theme.navChip,
    border: `1px solid ${theme.panelBorder}`,
    fontWeight: 600,
  };

  const sectionLabel = { marginTop: 18, fontSize: 12, color: theme.textSubtle };

  const input = {
    width: "90%",
    marginTop: 4,
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${theme.inputBorder}`,
    background: theme.inputBg,
    color: theme.text,
  };

  const btn = {
    marginTop: 8,
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    background: theme.primary,
    color: "#060606ff",
    border: "none",
    cursor: canStart ? "pointer" : "not-allowed",
    opacity: canStart ? 1 : 0.7,
    boxShadow: "0 6px 14px rgba(107,124,255,0.25)",
    fontWeight: 700,
  };

  const speakRow = { marginTop: 12, display: "flex", gap: 8, alignItems: "center", color: theme.textSubtle };

  const main = {
    background: theme.pageBg,
    color: theme.text,
    padding: isMobile ? 16 : 24,
  };

  return (
    <AppCtx.Provider value={ctx}>
      <div style={shell}>
        {/* Sidebar / Topbar */}
        <aside style={asideWrap}>
          {/* Top row (brand + mobile toggle) */}
          <div style={navRow}>
            <div style={brand}>Sophia</div>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              style={mobileToggle}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? "Close" : "Menu"}
            </button>
          </div>

          {/* Nav */}
          <nav id="mobile-menu" style={navGrid}>
            <Link to="/" style={linkStyle} onClick={() => isMobile && setMobileOpen(false)}>Home</Link>
            <Link to="/create" style={linkStyle} onClick={() => isMobile && setMobileOpen(false)}>Create check-in</Link>

            <div style={sectionLabel}>Profile</div>

            <div style={{ marginTop: 6 }}>
              <div style={{ marginBottom: 8 }}>
                <label>Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sarah" style={input}/>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label>Role</label>
                <select value={role} onChange={e=>setRole(e.target.value)} style={input}>
                  <option value="manager">Manager</option>
                  <option value="team">Team member</option>
                </select>
              </div>

              <button disabled={!canStart} onClick={connect} style={btn}>
                {connected ? "Connected" : "Connect"}
              </button>

              <div style={speakRow}>
                <label><input type="checkbox" checked={speakOn} onChange={e=>setSpeakOn(e.target.checked)} /> Sophia speaks</label>
                <select value={voice} onChange={e=>setVoice(e.target.value)} style={{ ...input, width: 140 }}>
                  <option>Joanna</option><option>Matthew</option><option>Olivia</option><option>Lupe</option><option>Arthur</option>
                </select>
              </div>
            </div>
          </nav>
        </aside>

        {/* Main */}
        <main style={main}>
          <Outlet />
        </main>
      </div>
    </AppCtx.Provider>
  );
}
