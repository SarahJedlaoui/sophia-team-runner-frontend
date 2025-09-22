// src/lib/agent.js
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function sendIntent(text, user) {
  const r = await fetch(`${API_BASE}/sophia/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, user }),
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => r.statusText);
    throw new Error(`Intent error: ${msg}`);
  }
  return r.json(); // { intent, question, speak }
}
