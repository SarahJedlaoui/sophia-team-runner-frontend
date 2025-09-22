const TTS_URL = import.meta.env.VITE_TTS_URL || "http://localhost:8000/tts";

export async function speak(text, { voice = "Joanna", neural = true } = {}) {
  if (!text?.trim()) return;
  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice, neural })
  });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  try { await audio.play(); } finally { URL.revokeObjectURL(url); }
}
