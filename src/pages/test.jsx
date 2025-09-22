// frontend/sophia-frontend/src/App.jsx
import React, { useMemo, useState } from "react";
import MicStreamer from "./components/MicStreamer";
import { speak } from "./lib/speak";
import { sendIntent } from "./lib/agent";

// Prefer env for easy prod switch; falls back to localhost dev
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/team/team1";

export default function App() {
  const [connected, setConnected] = useState(false);
  const [role, setRole] = useState("manager"); // "manager" | "team"
  const [name, setName] = useState("");
  const [socket, setSocket] = useState(null);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  // manager-only
  const [ask, setAsk] = useState("");
  const [teamQuestion, setTeamQuestion] = useState(""); // what team sees
  const [pendingQuestion, setPendingQuestion] = useState(null); // active prompt (string)
  const [responseCount, setResponseCount] = useState(0);


  const [speakOn, setSpeakOn] = useState(true);
  const [voice, setVoice] = useState("Joanna"); // try "Matthew", "Olivia", "Lupe", "Arthur"



  function logMessage(msg) {
    setMessages((prev) => [...prev, msg]);
  }

  const canStart = useMemo(() => !!name && !connected, [name, connected]);

  const connect = () => {
    if (!name) return;
    const url = `${WS_URL}?name=${encodeURIComponent(name)}&role=${encodeURIComponent(role)}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      setSocket(ws);
      logMessage({ type: "system", text: `Connected as ${name} (${role})` });
    };
    ws.onclose = () => {
      setConnected(false);
      setSocket(null);
      logMessage({ type: "system", text: "Disconnected" });
    };
    ws.onerror = () => {
      logMessage({ type: "error", text: "WebSocket error" });
    };
    ws.onmessage = (evt) => {
      let data;
      try {
        data = JSON.parse(evt.data);
      } catch {
        return;
      }

      // system & errors
      if ((data.type === "system" || data.type === "error") && speakOn) {
        speak(data.text, { voice });
      }

      // freeform chat (debug)
      if (data.type === "chat") {
        logMessage({ type: "chat", text: `${data.from} (${data.role}): ${data.text}` });
        return;
      }

      // NEW BACKEND EVENTS ↓↓↓
      if (data.type === "new_checkin") {
        // data.checkin = { id, title, created_at, status, question_count }
        const qText = data.checkin?.title || "";
        if (role === "team" && speakOn) {
          speak(`New check-in. ${qText}`, { voice });
        }
        setPendingQuestion(qText);
        if (role === "team") setTeamQuestion(qText);
        setResponseCount(0);
        logMessage({
          type: "system",
          text: `New check-in (#${data.checkin?.id}): “${qText}” (${data.checkin?.question_count} question${(data.checkin?.question_count || 0) === 1 ? "" : "s"})`,
        });
        return;
      }

      if (data.type === "new_response") {
        // { checkin_id, from, question_id, text, count }
        setResponseCount(data.count ?? 0);
        logMessage({ type: "team_response", text: `${data.from}: ${data.text}` });
        return;
      }

      if (data.type === "summary") {
        // { question, summary, total_responses }
        logMessage({
          type: "summary",
          text: `Summary for: “${data.question}”\n\n${data.summary}\n\n(${data.total_responses} response${(data.total_responses || 0) === 1 ? "" : "s"})`,
        });
        setPendingQuestion(null);
        return;
      }

      // legacy fallback (older server)
      if (data.type === "checkin_prompt") {
        setPendingQuestion(data.question);
        if (role === "team") setTeamQuestion(data.question);
        setResponseCount(0);
        logMessage({ type: "system", text: `Sophia asks: “${data.question}”` });
        return;
      }
      if (data.type === "team_response") {
        setResponseCount(data.count ?? 0);
        logMessage({ type: "team_response", text: `${data.from}: ${data.text}` });
        return;
      }
    };
  };

  const send = (payload) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    send({ type: "chat", text: chatInput.trim() });
    setChatInput("");
  };

  const startCheckin = () => {
    if (!ask.trim()) return;
    send({ type: "start_checkin", ask: ask.trim() });
    setAsk("");
  };

  const sendTeamResponse = (text) => {
    if (!text.trim()) return;
    send({ type: "team_response", text: text.trim() });
  };

  const summarizeNow = () => {
    send({ type: "summarize_now" });
  };

  return (
    <div style={{ maxWidth: 900, margin: "20px auto", fontFamily: "Inter, system-ui, Arial" }}>
      <h1>👋 Sophia Prototype — Milestone 1 (voice-enabled)</h1>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
          <h3>Join</h3>
          <label>
            Your name
            <input
              style={{ width: "100%", marginTop: 6, marginBottom: 12 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Maher"
            />
          </label>

          <label style={{ display: "block", marginBottom: 12 }}>
            Role:
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ marginLeft: 8 }}>
              <option value="manager">Manager</option>
              <option value="team">Team Member</option>
            </select>
          </label>

          <button disabled={!canStart} onClick={connect}>
            {connected ? "Connected" : "Connect"}
          </button>


          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={speakOn} onChange={(e) => setSpeakOn(e.target.checked)} />
              Sophia speaks
            </label>
            <select value={voice} onChange={(e) => setVoice(e.target.value)}>
              <option>Joanna</option>
              <option>Matthew</option>
              <option>Olivia</option>
              <option>Lupe</option>
              <option>Arthur</option>
            </select>
          </div>

          {connected && role === "manager" && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px dashed #ddd" }}>
              <h4>Start a check-in</h4>

              {/* Voice capture: final transcripts are appended to the ask box */}
              <div style={{ marginBottom: 8 }}>
                <MicStreamer
                  language="en-US"
                  onFinalText={async (finalText) => {
                    try {
                      const res = await sendIntent(finalText, name || "Manager"); // { intent, question, speak }
                      if (res.intent === "create_checkin" && res.question) {
                        // put it in the textarea (nice for visibility)
                        setAsk(res.question);

                        // immediately send to team (auto-confirm); or you can show a confirm button instead
                        send({ type: "start_checkin", ask: res.question });

                        // Sophia speaks confirmation
                        if (speakOn) {
                          speak(res.speak || "Okay — check-in sent.", { voice });
                          // or: await speakPolly(res.speak || "Okay — check-in sent.");
                        }
                      } else {
                        if (speakOn) speak(res.speak || "I didn’t catch a check-in request.", { voice });
                      }
                    } catch (e) {
                      console.error(e);
                      if (speakOn) speak("Sorry — something went wrong understanding that.", { voice });
                    }
                  }}
                />
              </div>

              <textarea
                rows={3}
                style={{ width: "100%" }}
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                placeholder={`Speak above or type: e.g., "Share today's progress and any blockers."`}
              />
              <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={startCheckin}>Send to Team</button>
                <button onClick={summarizeNow}>Summarize Now</button>

                <span style={{ opacity: 0.7 }}>
                  {pendingQuestion ? `Collecting responses… (${responseCount} so far)` : "No active check-in"}
                </span>
              </div>
            </div>
          )}

          {connected && role === "team" && pendingQuestion && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px dashed #ddd" }}>
              <h4>Respond to Sophia</h4>
              <p><b>Question:</b> “{teamQuestion}”</p>
              <TeamResponder onSend={sendTeamResponse} />
            </div>
          )}
        </div>

        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
          <h3>Chat / Feed</h3>
          <div
            style={{
              height: 360,
              overflow: "auto",
              padding: 8,
              background: "#fafafa",
              border: "1px solid #eee",
              borderRadius: 8,
              whiteSpace: "pre-wrap",
            }}
          >
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <MessageBubble m={m} />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <input
              style={{ flex: 1 }}
              placeholder="(optional) freeform chat — for testing"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button onClick={sendChat}>Send</button>
          </div>
        </div>
      </section>

      <p style={{ color: "#666" }}>
        Tip: open two browser windows — one as <b>Manager</b>, one as <b>Team Member</b> — to see real-time updates.
      </p>
    </div>
  );
}

function MessageBubble({ m }) {
  const color =
    m.type === "system" ? "#555" :
      m.type === "error" ? "#b00020" :
        m.type === "summary" ? "#0b6" :
          "#111";

  return (
    <div style={{ borderLeft: `4px solid ${color}`, paddingLeft: 8 }}>
      <code style={{ color }}>{m.text}</code>
    </div>
  );
}

function TeamResponder({ onSend }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        style={{ flex: 1 }}
        placeholder="Type your update here…"
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <button
        onClick={() => {
          const v = val.trim();
          if (!v) return;
          onSend(v);
          setVal("");
        }}
      >
        Submit
      </button>
    </div>
  );
}
