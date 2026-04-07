import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Scene1Intro } from "./scenes/Scene1Intro";
import { Scene2Features } from "./scenes/Scene2Features";
import { Scene3Dashboard } from "./scenes/Scene3Dashboard";
import { Scene4Integration } from "./scenes/Scene4Integration";
import { Scene5CTA } from "./scenes/Scene5CTA";

export const MainVideo = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  // Persistent animated background gradient
  const gradientAngle = interpolate(frame, [0, durationInFrames], [135, 180]);

  return (
    <AbsoluteFill>
      {/* Animated background */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(${gradientAngle}deg, #0f0f1a 0%, #1a1030 30%, #0d1b2a 60%, #0f0f1a 100%)`,
        }}
      />

      {/* Floating accent orbs */}
      <FloatingOrb
        x={interpolate(frame, [0, durationInFrames], [100, 300])}
        y={interpolate(frame, [0, durationInFrames], [200, 400])}
        size={400}
        color="rgba(99, 102, 241, 0.08)"
      />
      <FloatingOrb
        x={interpolate(frame, [0, durationInFrames], [1400, 1200])}
        y={interpolate(frame, [0, durationInFrames], [600, 300])}
        size={500}
        color="rgba(139, 92, 246, 0.06)"
      />

      {/* Scenes */}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={70}>
          <Scene1Intro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={65}>
          <Scene2Features />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={65}>
          <Scene3Dashboard />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={65}>
          <Scene4Integration />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={100}>
          <Scene5CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

const FloatingOrb = ({ x, y, size, color }: { x: number; y: number; size: number; color: string }) => (
  <div
    style={{
      position: "absolute",
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      borderRadius: "50%",
      background: color,
      filter: "blur(80px)",
      pointerEvents: "none",
    }}
  />
);
