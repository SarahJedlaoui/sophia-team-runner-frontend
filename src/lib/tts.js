// src/lib/tts.js
let currentAudio = null;
let currentAbort = null;

const TTS_URL = import.meta.env.VITE_TTS_URL || "http://localhost:8000/tts";

export async function speakPolly(text, { voice = "Olivia", style = "conversational" } = {}) {
  stopTTS(); // stop anything already playing

  currentAbort = new AbortController();
  const body = new URLSearchParams({ text, voice, style });

  const res = await fetch(TTS_URL, {
    method: "POST",
    body,
    signal: currentAbort.signal,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!res.ok) throw new Error("TTS failed");

  const blob = await res.blob(); // small mp3 arrives fast
  const url = URL.createObjectURL(blob);

  currentAudio = new Audio(url);
  currentAudio.onended = () => {
    URL.revokeObjectURL(url);
    currentAudio = null;
    currentAbort = null;
  };
  currentAudio.play().catch(() => {
    // autoplay might fail; surface a hint
    console.warn("Autoplay blocked. User action required.");
  });
}

export function stopTTS() {
  if (currentAbort) {
    try { currentAbort.abort(); } catch {}
    currentAbort = null;
  }
  if (currentAudio) {
    try { currentAudio.pause(); } catch {}
    currentAudio = null;
  }
}
