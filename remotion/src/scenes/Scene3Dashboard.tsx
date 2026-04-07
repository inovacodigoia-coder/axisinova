import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const metrics = [
  { label: "Atendimentos", value: "1.284", color: "#6366f1" },
  { label: "Faturamento", value: "R$ 89k", color: "#8b5cf6" },
  { label: "Agendados", value: "47", color: "#06b6d4" },
];

const barHeights = [40, 65, 50, 80, 60, 90, 75];

export const Scene3Dashboard = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panelScale = spring({ frame, fps, config: { damping: 20, stiffness: 100 } });
  const panelOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 80,
        padding: "0 120px",
      }}
    >
      {/* Left text */}
      <div style={{ flex: 1 }}>
        <h2
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "white",
            fontFamily: "sans-serif",
            lineHeight: 1.2,
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Dashboard em{" "}
          <span style={{ color: "#a78bfa" }}>tempo real</span>
        </h2>
        <p
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.6)",
            fontFamily: "sans-serif",
            marginTop: 16,
            opacity: interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          KPIs, gráficos e alertas para decisões rápidas.
        </p>
      </div>

      {/* Right dashboard mock */}
      <div
        style={{
          flex: 1,
          opacity: panelOpacity,
          transform: `scale(${panelScale})`,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 24,
          padding: 32,
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* Metrics row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          {metrics.map((m, i) => {
            const delay = 10 + i * 6;
            const s = spring({ frame: frame - delay, fps, config: { damping: 15 } });
            return (
              <div
                key={m.label}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: "16px 20px",
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 800, color: m.color, fontFamily: "sans-serif" }}>
                  {m.value}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "sans-serif", marginTop: 4 }}>
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bar chart */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
          {barHeights.map((h, i) => {
            const delay = 20 + i * 3;
            const barH = interpolate(frame, [delay, delay + 15], [0, h], {
              extrapolateRight: "clamp",
              extrapolateLeft: "clamp",
            });
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${barH}%`,
                  borderRadius: "6px 6px 0 0",
                  background: `linear-gradient(180deg, #6366f1, #8b5cf6)`,
                  opacity: 0.8,
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
