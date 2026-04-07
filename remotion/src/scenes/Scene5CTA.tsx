import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const Scene5CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const titleOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [10, 30], [30, 0], { extrapolateRight: "clamp" });

  const subtitleOpacity = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: "clamp" });

  const badgeScale = spring({ frame: frame - 35, fps, config: { damping: 15, stiffness: 200 } });

  // Pulse on the badge
  const pulse = interpolate(
    frame % 30,
    [0, 15, 30],
    [1, 1.05, 1],
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontSize: 60,
          transform: `scale(${logoScale})`,
          marginBottom: 24,
        }}
      >
        ⚡
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: "white",
          fontFamily: "sans-serif",
          textAlign: "center",
          lineHeight: 1.2,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          margin: 0,
        }}
      >
        Transforme sua clínica com{" "}
        <span
          style={{
            background: "linear-gradient(135deg, #6366f1, #a78bfa, #06b6d4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Axis Inova
        </span>
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 24,
          color: "rgba(255,255,255,0.6)",
          fontFamily: "sans-serif",
          marginTop: 20,
          opacity: subtitleOpacity,
          textAlign: "center",
        }}
      >
        Teste grátis por 14 dias · Sem cartão de crédito
      </p>

      {/* CTA badge */}
      <div
        style={{
          marginTop: 40,
          transform: `scale(${badgeScale * pulse})`,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          borderRadius: 50,
          padding: "16px 48px",
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "white",
            fontFamily: "sans-serif",
          }}
        >
          axisinova.lovable.app
        </span>
      </div>
    </AbsoluteFill>
  );
};
