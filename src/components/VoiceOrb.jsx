import React from "react";

export default function VoiceOrb({ speaking }) {
  return (
    <div
      aria-hidden
      style={{
        width: 36, height: 36, borderRadius: 999,
        background: "radial-gradient(60% 60% at 50% 50%, #6b7cff 0%, #2c2f3a 100%)",
        boxShadow: speaking ? "0 0 24px rgba(107,124,255,.45)" : "none",
        position: "relative",
        transform: speaking ? "scale(1.05)" : "scale(1)",
        transition: "transform 200ms ease",
      }}
      className={speaking ? "sophia-pulse" : ""}
    >
      <style>
        {`
        .sophia-pulse::after {
          content:"";
          position:absolute; inset:-6px;
          border-radius:999px;
          border:2px solid rgba(107,124,255,.35);
          animation: pulse 1200ms ease-out infinite;
        }
        @keyframes pulse {
          0% { opacity: .9; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.5); }
        }
      `}
      </style>
    </div>
  );
}
