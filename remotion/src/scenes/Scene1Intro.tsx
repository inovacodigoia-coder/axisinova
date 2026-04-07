import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const Scene1Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = interpolate(
    spring({ frame, fps, config: { damping: 20, stiffness: 100 } }),
    [0, 1],
    [60, 0]
  );
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const subtitleOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });
  const subtitleY = interpolate(frame, [15, 35], [30, 0], { extrapolateRight: "clamp" });

  const badgeScale = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 200 } });

  const lineWidth = interpolate(frame, [25, 50], [0, 200], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Badge */}
      <div
        style={{
          transform: `scale(${badgeScale})`,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          borderRadius: 40,
          padding: "10px 28px",
          marginBottom: 32,
        }}
      >
        <span style={{ color: "white", fontSize: 20, fontWeight: 700, fontFamily: "sans-serif" }}>
          🚀 Axis Inova
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            fontFamily: "sans-serif",
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          A gestão completa
        </h1>
        <h1
          style={{
            fontSize: 72,
            fontWeight: 800,
            fontFamily: "sans-serif",
            lineHeight: 1.1,
            margin: 0,
            background: "linear-gradient(135deg, #6366f1, #a78bfa, #06b6d4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          da sua clínica
        </h1>
      </div>

      {/* Decorative line */}
      <div
        style={{
          width: lineWidth,
          height: 3,
          background: "linear-gradient(90deg, #6366f1, #06b6d4)",
          borderRadius: 2,
          marginTop: 24,
          marginBottom: 24,
        }}
      />

      {/* Subtitle */}
      <p
        style={{
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          fontSize: 28,
          color: "rgba(255,255,255,0.7)",
          fontFamily: "sans-serif",
          fontWeight: 400,
          textAlign: "center",
          maxWidth: 700,
        }}
      >
        Do agendamento ao faturamento TISS, tudo integrado em tempo real.
      </p>
    </AbsoluteFill>
  );
};
