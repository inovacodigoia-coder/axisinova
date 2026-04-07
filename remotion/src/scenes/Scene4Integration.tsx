import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const flow = [
  { icon: "📅", label: "Agendar" },
  { icon: "👤", label: "Check-in" },
  { icon: "📋", label: "Atender" },
  { icon: "💳", label: "Faturar" },
  { icon: "📊", label: "Analisar" },
];

export const Scene4Integration = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h2
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: "white",
          fontFamily: "sans-serif",
          opacity: titleOpacity,
          marginBottom: 60,
        }}
      >
        Fluxo <span style={{ color: "#06b6d4" }}>integrado</span> de ponta a ponta
      </h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {flow.map((step, i) => {
          const delay = 5 + i * 8;
          const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 200 } });
          const scale = interpolate(s, [0, 1], [0.5, 1]);

          return (
            <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  opacity: s,
                  transform: `scale(${scale})`,
                }}
              >
                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                    border: "2px solid rgba(99,102,241,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 40,
                  }}
                >
                  {step.icon}
                </div>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.8)",
                    fontFamily: "sans-serif",
                  }}
                >
                  {step.label}
                </span>
              </div>
              {i < flow.length - 1 && (
                <div
                  style={{
                    width: 60,
                    height: 2,
                    background: `linear-gradient(90deg, rgba(99,102,241,${s * 0.6}), rgba(6,182,212,${s * 0.4}))`,
                    marginBottom: 28,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
