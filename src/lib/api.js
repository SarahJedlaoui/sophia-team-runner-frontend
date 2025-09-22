const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function listCheckins() {
  const r = await fetch(`${BASE}/checkins`); return r.json();
}
export async function createCheckin({ title, created_by, questions }) {
  const r = await fetch(`${BASE}/checkins`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ title, created_by, questions })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
export async function getCheckin(id, { forUser, includeResponses } = {}) {
  const u = new URL(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/checkins/${id}`);
  if (forUser) u.searchParams.set("for_user", forUser);
  if (includeResponses) u.searchParams.set("include_responses", "true");
  const r = await fetch(u);
  return r.json();
}

export async function closeCheckin(id) {
  const r = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/checkins/${id}/close`, {
    method: "POST"
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function addResponse(id, { question_id, user_name, text }) {
  const r = await fetch(`${BASE}/checkins/${id}/responses`, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ question_id, user_name, text })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function draftCheckin(payload) {
  const r = await fetch("http://localhost:8000/assistant/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`draft failed: ${r.status}`);
  return r.json();
}