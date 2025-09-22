// src/lib/tts.js
let inflight = {
  abort: null,
  url: null,
};

const TTS_URL = import.meta.env.VITE_TTS_URL || "http://localhost:8000/tts";

/**
 * Fetch Polly TTS audio (no autoplay).
 * Returns { blob, url, stop } and you decide how to play it.
 */
export async function speakPolly(
  text,
  { voice = "Olivia", style = "conversational", neural = true } = {}
) {
  if (!text || !text.trim()) throw new Error("No text to speak");

  // cancel any in-flight request
  stopTTS();

  inflight.abort = new AbortController();
  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: inflight.abort.signal,
    body: JSON.stringify({ text, voice, style, neural }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`TTS failed (${res.status}): ${err}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  inflight.url = url;

  // Return—do NOT create or play an <audio> tag here.
  return {
    blob,
    url,
    stop: () => stopTTS(),
  };
}

/** Cancel in-flight fetch and revoke last object URL. */
export function stopTTS() {
  try { inflight.abort?.abort(); } catch {}
  inflight.abort = null;

  if (inflight.url) {
    try { URL.revokeObjectURL(inflight.url); } catch {}
    inflight.url = null;
  }
}
