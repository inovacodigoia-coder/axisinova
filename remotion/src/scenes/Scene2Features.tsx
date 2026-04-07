import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const features = [
  { icon: "📅", label: "Agendamento" },
  { icon: "🏥", label: "Recepção" },
  { icon: "📋", label: "Prontuário" },
  { icon: "💳", label: "Faturamento TISS" },
  { icon: "📊", label: "BI & Relatórios" },
  { icon: "🔬", label: "Resultados" },
];

export const Scene2Features = () => {
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
        padding: "0 120px",
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
        Tudo que sua operação precisa
      </h2>

      <div
        style={{
          display: "flex",
          gap: 32,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {features.map((f, i) => {
          const delay = 8 + i * 5;
          const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 200 } });
          const y = interpolate(s, [0, 1], [40, 0]);
          return (
            <div
              key={f.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                opacity: s,
                transform: `translateY(${y}px)`,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 20,
                padding: "28px 36px",
                border: "1px solid rgba(255,255,255,0.1)",
                minWidth: 180,
              }}
            >
              <span style={{ fontSize: 44 }}>{f.icon}</span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "white",
                  fontFamily: "sans-serif",
                }}
              >
                {f.label}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
