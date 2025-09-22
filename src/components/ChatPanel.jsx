// src/components/ChatPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import { draftCheckin } from "../lib/api";
import { speak } from "../lib/speak";
import { speakPolly } from "../lib/tts";
import VoiceOrb from "./VoiceOrb";
import MicStreamer from "./MicStreamer";

export default function ChatPanel({ draft, setDraft, speakOn = true, voice = "Olivia", initialPrompt = "", }) {
  const [msgs, setMsgs] = useState([
    { role: "assistant", content: "Hi! Tell me what you want to ask your team and I’ll shape a clean check-in." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const playerRef = useRef(null);
  const micRef = useRef(null);
  const scroller = useRef(null);
  const voiceOnRef = useRef(false);
  const audioElRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const didInit = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    voiceOnRef.current = voiceOn;
  }, [voiceOn]);




  async function unlockAudioOutput() {
    // Create a single <audio> element we’ll reuse
    if (!audioElRef.current) {
      audioElRef.current = new Audio();
    }
    if (audioUnlockedRef.current) return;

    // Try to resume any WebAudio context (some browsers need it)
    try {
      if (window.AudioContext) {
        const ac = new AudioContext();
        if (ac.state === "suspended") await ac.resume();
        // short, silent tick via oscillator (stops immediately)
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        gain.gain.value = 0;
        osc.connect(gain).connect(ac.destination);
        osc.start();
        osc.stop();
      }
    } catch { }

    // Also try a super-short silent audio play to satisfy autoplay policies
    try {
      audioElRef.current.src =
        "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA"; // minimal “blank” mp3
      await audioElRef.current.play().catch(() => { });
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    } catch { }

    audioUnlockedRef.current = true;
  }

async function speakReply(text) {
  if (!text) return;
  setSpeaking(true);

  // stop previous playback
  try { playerRef.current?.stop?.(); } catch {}
  playerRef.current = null;

  try {
    const { url, stop } = await speakPolly(text, { voice });
    if (!audioElRef.current) audioElRef.current = new Audio();
    audioElRef.current.src = url;
    await audioElRef.current.play();

    // cleanup + external stop handle
    audioElRef.current.onended = () => setSpeaking(false);
    playerRef.current = {
      stop() {
        try {
          audioElRef.current.pause();
          audioElRef.current.src = "";
        } catch {}
        try { stop?.(); } catch {}
        setSpeaking(false);
      }
    };
  } catch (e) {
    // If fetching Polly failed, *then* use Web Speech as a last resort
    await speak(text, { voice });
  } finally {
    setTimeout(() => setSpeaking(false), 50);
  }
}




  const scrollDown = () =>
    queueMicrotask(() => scroller.current?.scrollTo({ top: 99999, behavior: "smooth" }));




  async function send(text = input.trim()) {
    if (!text || loading || inFlightRef.current) return;
    inFlightRef.current = true;
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    scrollDown();
    try {
      const res = await draftCheckin({
        messages: [...msgs, { role: "user", content: text }],
        current: { title: draft.title, questions: draft.questions },
      });
      setDraft((d) => ({
        title: res.title ?? d.title,
        questions: res.questions?.length ? res.questions : d.questions,
      }));
      setMsgs((m) => [...m, { role: "assistant", content: res.reply }]);
      scrollDown();
      console.log("[TTS gate]", { voiceOn: voiceOnRef.current, speakOn });
      if (voiceOnRef.current && speakOn) {
        // pause mic while speaking to avoid feedback/loop
        const wasListening = listening;
        if (wasListening) micRef.current?.stop();
        await speakReply(res.reply);
        // resume mic if voice mode still on
        if (wasListening && voiceOnRef.current) micRef.current?.start();
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }

  // Auto-send the initial prompt (if provided) once on mount
  useEffect(() => {
    if (!initialPrompt || didInit.current) return;
    didInit.current = true;        // <-- guard against StrictMode's double effect
    setInput(initialPrompt);
    setTimeout(() => send(initialPrompt), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  // Voice controls
  function toggleVoice() {
    console.log("voice toggle clicked");
    setVoiceOn(v => !v);
  }

  // React to voiceOn changes AFTER render
  useEffect(() => {
    console.log("voiceOn ->", voiceOn);
    if (voiceOn) {
      unlockAudioOutput();
      micRef.current?.start();
    } else {
      micRef.current?.stop();
      try { window.speechSynthesis?.cancel?.(); } catch { }
      try {
        if (audioElRef.current) {
          audioElRef.current.pause();
          audioElRef.current.src = "";
        }
      } catch { }
      playerRef.current = null;
    }
  }, [voiceOn]);

  // —— Warm theme tokens ——
  const t = {
    panelBg: "#FFF9F0",
    panelBorder: "#EFE6DA",
    feedBg: "#F7F2EC",
    bubbleUser: "#F4ECE3",
    bubbleAssistant: "#FFFFFF",
    bubbleBorder: "#EAE0D6",
    text: "#2B2A28",
    subtle: "rgba(43,42,40,.75)",
    send: "#FF8A2A",
    voiceBtnBg: "#F4ECE3",
    voiceBtnBorder: "#E9E1D8",
  };

  return (
    <div style={panel(t)}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Small header orb remains (speaking/loading indicator) */}
          <VoiceOrb speaking={speaking || loading} />
          <div style={{ fontWeight: 700, color: t.text }}>Sophia</div>
        </div>
        <button onClick={toggleVoice} style={pill(t)}>
          {voiceOn ? "⏹ Voice off" : "🎙️ Voice on"}
        </button>
      </div>

      {/* messages */}
      <div
        ref={scroller}
        style={feed(t)}
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 10,
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                background: m.role === "user" ? t.bubbleUser : t.bubbleAssistant,
                border: `1px solid ${t.bubbleBorder}`,
                padding: "10px 12px",
                borderRadius: 12,
                color: t.text,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {/* input row */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type here…"
          style={inp(t)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          disabled={speaking || loading}
        />
        <button onClick={() => send()} disabled={speaking || loading} style={primary(t)}>
          Send
        </button>
      </div>

      {/* hidden mic streamer under the hood */}
      <MicStreamer
        ref={micRef}
        hiddenUI
        language="en-US"
        onStatusChange={(s) => setListening(s === "recording")}
        onPartial={(p) => p && setInput(p)} // show partial in the input
        onFinalText={(t) => {
          setInput("");
          send(t);
        }}
      />

      {/* center overlay ORB — now ONLY when listening (voice option on) */}
      {voiceOn && listening && <Overlay text="Listening…" />}
      {/* removed speaking overlay on purpose per your ask */}
    </div>
  );
}

function Overlay({ text }) {
  return (
    <div style={overlay}>
      <div style={orbBig} />
      <div style={{ marginTop: 12, opacity: 0.9 }}>{text}</div>
    </div>
  );
}

/* styles (warm palette + scroll cap) */
const panel = (t) => ({
  background: t.panelBg,
  padding: 16,
  borderRadius: 14,
  border: `1px solid ${t.panelBorder}`,
  minHeight: 420,
  display: "flex",
  flexDirection: "column",
  position: "relative",
  color: t.text,
});

const FEED_MAX = 360; // <- cap height to enable scrolling
const feed = (t) => ({
  flex: "1 1 auto",
  overflowY: "auto",
  maxHeight: FEED_MAX,
  border: `1px solid ${t.panelBorder}`,
  borderRadius: 10,
  padding: 10,
  background: t.feedBg,
  overscrollBehavior: "contain",
});

const inp = (t) => ({
  flex: 1,
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${t.panelBorder}`,
  background: "#FFFFFF",
  color: t.text,
});

const primary = (t) => ({
  padding: "10px 12px",
  borderRadius: 10,
  background: t.send,
  color: "#fff",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 6px 14px rgba(255,138,42,.25)",
});

const pill = (t) => ({
  padding: "8px 12px",
  borderRadius: 999,
  background: t.voiceBtnBg,
  color: t.text,
  border: `1px solid ${t.voiceBtnBorder}`,
  cursor: "pointer",
  fontSize: 12,
});

const overlay = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(180deg, rgba(242,237,231,.60), rgba(242,237,231,.75))",
  pointerEvents: "none",
  textAlign: "center",
};

const orbBig = {
  width: 120,
  height: 120,
  borderRadius: 999,
  background: "radial-gradient(60% 60% at 50% 50%, #FFB07A 0%, #F2C6A8 100%)",
  position: "relative",
  boxShadow: "0 0 60px rgba(255,138,42,.35)",
};
