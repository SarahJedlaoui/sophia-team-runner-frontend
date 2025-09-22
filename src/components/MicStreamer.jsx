// src/components/MicStreamer.jsx
import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

// Backend WS that forwards to Amazon Transcribe
const WS_STT_URL =
  import.meta.env.VITE_STT_URL || "ws://localhost:8000/ws/stt";

async function loadWorklet(audioCtx) {
  // Build an absolute URL that works with Vite base paths
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "/");
  const absUrl = new URL(base + "pcm-worklet.js", window.location.origin).toString();

  // Fetch first to ensure we didn't get index.html
  const res = await fetch(absUrl, { cache: "no-cache" });
  const text = await res.text();
  if (/^\s*</.test(text)) {
    throw new Error(
      `Worklet URL returned HTML instead of JS. Check your base path. URL: ${absUrl}`
    );
  }

  // Load via blob URL so content-type can’t confuse the browser
  const blob = new Blob([text], { type: "application/javascript" });
  const blobUrl = URL.createObjectURL(blob);
  try {
    await audioCtx.audioWorklet.addModule(blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * MicStreamer
 * Props:
 *  - language         : string (default "en-US")
 *  - onFinalText      : (text) => void
 *  - onPartial        : (text) => void
 *  - onStatusChange   : (status: "idle"|"recording"|"error") => void
 *  - hiddenUI         : boolean (if true, renders nothing; controlled externally)
 *
 * Exposed methods via ref:
 *  - start()
 *  - stop()
 *  - status
 */
const MicStreamer = forwardRef(function MicStreamer(
  { language = "en-US", onFinalText, onPartial, onStatusChange, hiddenUI = false },
  ref
) {
  const [status, setStatus] = useState("idle"); // idle | recording | error
  const [partial, setPartial] = useState("");
  const [finals, setFinals] = useState([]);

  const wsRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const workletNodeRef = useRef(null);
  const sourceRef = useRef(null);

  const setStatusBoth = (s) => {
    setStatus(s);
    onStatusChange?.(s);
  };

  // ---- teardown
  const stopAll = async () => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "stop" }));
        wsRef.current.close();
      }
    } catch {}
    wsRef.current = null;

    try {
      if (workletNodeRef.current) {
        workletNodeRef.current.port.onmessage = null;
        workletNodeRef.current.disconnect();
      }
    } catch {}
    workletNodeRef.current = null;

    try { sourceRef.current?.disconnect(); } catch {}
    sourceRef.current = null;

    try { await audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;

    try { mediaStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    mediaStreamRef.current = null;

    setPartial("");
    setStatusBoth("idle");
  };

  useEffect(() => () => { stopAll(); }, []);

  // ---- start streaming
  async function start() {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setFinals([]); setPartial(""); setStatusBoth("ready");

    // 1) mic
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      alert("Microphone permission denied.");
      setStatusBoth("error");
      return;
    }
    mediaStreamRef.current = stream;

    // 2) audio context + worklet
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
    audioCtxRef.current = audioCtx;
    if (audioCtx.state === "suspended") await audioCtx.resume();
    try { await loadWorklet(audioCtx); }
    catch (e) {
      console.error("Failed to load pcm-worklet:", e);
      alert("Voice error: failed to load /pcm-worklet.js");
      setStatusBoth("error");
      return;
    }

    const src  = audioCtx.createMediaStreamSource(stream); sourceRef.current = src;
    const node = new AudioWorkletNode(audioCtx, "pcm-worklet"); workletNodeRef.current = node;

    // 3) websocket
    const ws = new WebSocket(WS_STT_URL);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "config", language_code: language }));
      setStatusBoth("recording");
    };
    ws.onerror = () => setStatusBoth("error");
    ws.onclose = () => { setStatusBoth("idle"); };

    // 4) pipe PCM to WS
    node.port.onmessage = (event) => {
      const buf = event.data; // ArrayBuffer (PCM16LE @ 16kHz)
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(buf);
    };
    src.connect(node);

    // 5) transcripts back
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "stt") {
          if (msg.final) {
            const text = (msg.text || "").trim();
            if (text) {
              setFinals((f) => [...f, text]);
              onFinalText?.(text);
            }
            setPartial(""); onPartial?.("");
          } else {
            setPartial(msg.text || "");
            onPartial?.(msg.text || "");
          }
        } else if (msg.type === "error") {
          console.error("STT error:", msg.text);
          alert("Voice error: " + msg.text);
          setStatusBoth("error");
        }
      } catch {}
    };
  }

  // expose controls to parent
  useImperativeHandle(ref, () => ({
    start,
    stop: stopAll,
    status,
    isRecording: () => status === "recording",
  }));

  // optional built-in UI (useful for debugging)
  if (hiddenUI) return null;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border">
      
      <div className="flex items-center gap-2">
        {status !== "recording" ? (
          <button className="px-3 py-2 bg-black text-white rounded-md" onClick={start}>
            🎙️ Start talking
          </button>
        ) : (
          <button className="px-3 py-2 bg-red-600 text-white rounded-md" onClick={stopAll}>
            ⏹ Stop
          </button>
        )}
      </div>
      {partial && (
        <div className="text-sm mt-2 opacity-70">… {partial}</div>
      )}
    </div>
  );
});

export default MicStreamer;
