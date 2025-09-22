import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppCtx } from "../App.jsx";
import { listCheckins } from "../lib/api.js";

export default function Home() {
  const { role } = useContext(AppCtx);
  const [items, setItems] = useState([]);

  const load = async () => {
    const data = await listCheckins();
    setItems(data.items || []);
  };
  useEffect(()=>{ load(); }, []);

  return (
    <div>
      <h1 style={{margin:"6px 0 18px"}}>Hey, let’s start building! 🚀</h1>

      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
        <div style={{opacity:.75}}>Choose a card or create a new check-in.</div>
        <Link to="/create" style={cta}>+ Create check-in</Link>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))", gap:16}}>
        {items.map((c)=>(
          <Link key={c.id} to={`/checkins/${c.id}`} style={card}>
            <div style={{fontSize:12, opacity:.7, marginBottom:6}}>{c.status.toUpperCase()}</div>
            <div style={{fontWeight:700, marginBottom:8}}>{c.title}</div>
            <div style={{fontSize:12, opacity:.75}}>
              {c.question_count} question{c.question_count===1?"":"s"} • {c.response_count} response{c.response_count===1?"":"s"}
            </div>
          </Link>
        ))}
      </div>

      {items.length===0 && <div style={{opacity:.6, marginTop:16}}>No check-ins yet.</div>}
      <div style={{marginTop:20}}>
        {role==="manager" ? "Tip: create a new check-in and share with team." : "Tip: open a card to answer."}
      </div>
    </div>
  );
}

const cta = { background:"#6b7cff", color:"#fff", textDecoration:"none", padding:"8px 12px", borderRadius:10 };
const card = { textDecoration:"none", color:"#e9e9ff", background:"#171a22", padding:16, borderRadius:14, border:"1px solid #262a35" };
