import { type FC } from "react";

type MuscleKey = "legsGlutes" | "back" | "chest" | "shoulders" | "arms" | "core";

interface MuscleBodySvgProps {
  getFill: (key: MuscleKey) => string;
  getStroke: (key: MuscleKey) => string;
  getStrokeWidth: (key: MuscleKey) => number;
  onClickMuscle: (key: MuscleKey) => void;
}

const BODY_OUTLINE_COLOR = "hsl(var(--foreground) / 0.35)";
const BODY_OUTLINE_WIDTH = 0.6;

/**
 * Pure SVG schematic human body — front (left) and back (right).
 * Each muscle group is a separate <path> element that can be filled independently.
 * Body outline is drawn separately so contours always remain crisp.
 */
const MuscleBodySvg: FC<MuscleBodySvgProps> = ({
  getFill,
  getStroke,
  getStrokeWidth,
  onClickMuscle,
}) => {
  const muscleProps = (key: MuscleKey) => ({
    fill: getFill(key),
    stroke: getStroke(key),
    strokeWidth: getStrokeWidth(key),
    strokeLinejoin: "round" as const,
    className: "cursor-pointer transition-all duration-200",
    onClick: () => onClickMuscle(key),
  });

  return (
    <svg
      viewBox="0 0 440 500"
      className="w-full h-auto max-w-sm mx-auto"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ===================== FRONT VIEW (left figure) ===================== */}
      <g id="front-body">
        {/* Body outline — front */}
        <g fill="none" stroke={BODY_OUTLINE_COLOR} strokeWidth={BODY_OUTLINE_WIDTH} strokeLinejoin="round">
          {/* Head */}
          <ellipse cx="110" cy="32" rx="18" ry="22" />
          {/* Neck */}
          <path d="M100,52 L100,62 L120,62 L120,52" />
          {/* Torso */}
          <path d="M72,72 L72,220 Q72,240 90,245 L110,248 L130,245 Q148,240 148,220 L148,72 Z" />
          {/* Left arm */}
          <path d="M72,72 L56,80 L42,110 L36,160 L30,200 L36,210 L44,200 L50,160 L58,120 L72,100" />
          {/* Right arm */}
          <path d="M148,72 L164,80 L178,110 L184,160 L190,200 L184,210 L176,200 L170,160 L162,120 L148,100" />
          {/* Left leg */}
          <path d="M90,245 L82,310 L76,380 L72,440 L68,470 L82,472 L86,444 L92,380 L100,310 L110,248" />
          {/* Right leg */}
          <path d="M130,245 L138,310 L144,380 L148,440 L152,470 L138,472 L134,444 L128,380 L120,310 L110,248" />
        </g>

        {/* --- FRONT MUSCLES --- */}

        {/* SHOULDERS — front deltoids */}
        <path d="M72,72 L56,80 L58,100 L72,100 Z" {...muscleProps("shoulders")} />
        <path d="M148,72 L164,80 L162,100 L148,100 Z" {...muscleProps("shoulders")} />

        {/* CHEST — pectorals */}
        <path d="M76,76 Q80,72 95,72 L110,80 L110,100 Q100,108 88,104 L76,92 Z" {...muscleProps("chest")} />
        <path d="M144,76 Q140,72 125,72 L110,80 L110,100 Q120,108 132,104 L144,92 Z" {...muscleProps("chest")} />

        {/* ARMS — front biceps/forearms */}
        <path d="M56,82 L42,112 L50,118 L62,96 Z" {...muscleProps("arms")} />
        <path d="M42,114 L36,162 L44,166 L50,120 Z" {...muscleProps("arms")} />
        <path d="M164,82 L178,112 L170,118 L158,96 Z" {...muscleProps("arms")} />
        <path d="M178,114 L184,162 L176,166 L170,120 Z" {...muscleProps("arms")} />

        {/* CORE — abdominals */}
        <path d="M88,108 Q96,114 110,112 Q124,114 132,108 L132,200 Q124,210 110,212 Q96,210 88,200 Z" {...muscleProps("core")} />

        {/* LEGS — front quads */}
        <path d="M90,245 L82,310 L92,380 L100,310 L110,248 Z" {...muscleProps("legsGlutes")} />
        <path d="M130,245 L138,310 L128,380 L120,310 L110,248 Z" {...muscleProps("legsGlutes")} />
        {/* Front calves */}
        <path d="M82,316 L76,380 L86,444 L92,380 Z" {...muscleProps("legsGlutes")} />
        <path d="M138,316 L144,380 L134,444 L128,380 Z" {...muscleProps("legsGlutes")} />
      </g>

      {/* ===================== BACK VIEW (right figure) ===================== */}
      <g id="back-body" transform="translate(220, 0)">
        {/* Body outline — back */}
        <g fill="none" stroke={BODY_OUTLINE_COLOR} strokeWidth={BODY_OUTLINE_WIDTH} strokeLinejoin="round">
          {/* Head */}
          <ellipse cx="110" cy="32" rx="18" ry="22" />
          {/* Neck */}
          <path d="M100,52 L100,62 L120,62 L120,52" />
          {/* Torso */}
          <path d="M72,72 L72,220 Q72,240 90,245 L110,248 L130,245 Q148,240 148,220 L148,72 Z" />
          {/* Left arm */}
          <path d="M72,72 L56,80 L42,110 L36,160 L30,200 L36,210 L44,200 L50,160 L58,120 L72,100" />
          {/* Right arm */}
          <path d="M148,72 L164,80 L178,110 L184,160 L190,200 L184,210 L176,200 L170,160 L162,120 L148,100" />
          {/* Left leg */}
          <path d="M90,245 L82,310 L76,380 L72,440 L68,470 L82,472 L86,444 L92,380 L100,310 L110,248" />
          {/* Right leg */}
          <path d="M130,245 L138,310 L144,380 L148,440 L152,470 L138,472 L134,444 L128,380 L120,310 L110,248" />
        </g>

        {/* --- BACK MUSCLES --- */}

        {/* SHOULDERS — rear deltoids */}
        <path d="M72,72 L56,80 L58,100 L72,100 Z" {...muscleProps("shoulders")} />
        <path d="M148,72 L164,80 L162,100 L148,100 Z" {...muscleProps("shoulders")} />

        {/* BACK — trapezius + lats */}
        <path d="M80,72 L100,62 L110,68 L110,90 Q100,96 88,92 L80,84 Z" {...muscleProps("back")} />
        <path d="M140,72 L120,62 L110,68 L110,90 Q120,96 132,92 L140,84 Z" {...muscleProps("back")} />
        {/* Lats */}
        <path d="M78,92 Q86,98 110,100 Q134,98 142,92 L142,160 Q134,170 110,172 Q86,170 78,160 Z" {...muscleProps("back")} />
        {/* Lower back */}
        <path d="M88,170 Q96,176 110,178 Q124,176 132,170 L132,210 Q124,220 110,222 Q96,220 88,210 Z" {...muscleProps("back")} />

        {/* ARMS — rear triceps/forearms */}
        <path d="M56,82 L42,112 L50,118 L62,96 Z" {...muscleProps("arms")} />
        <path d="M42,114 L36,162 L44,166 L50,120 Z" {...muscleProps("arms")} />
        <path d="M164,82 L178,112 L170,118 L158,96 Z" {...muscleProps("arms")} />
        <path d="M178,114 L184,162 L176,166 L170,120 Z" {...muscleProps("arms")} />

        {/* GLUTES */}
        <path d="M84,222 Q96,230 110,232 Q124,230 136,222 L136,250 Q124,260 110,262 Q96,260 84,250 Z" {...muscleProps("legsGlutes")} />

        {/* LEGS — rear hamstrings */}
        <path d="M90,255 L82,310 L92,380 L100,310 L110,258 Z" {...muscleProps("legsGlutes")} />
        <path d="M130,255 L138,310 L128,380 L120,310 L110,258 Z" {...muscleProps("legsGlutes")} />
        {/* Rear calves */}
        <path d="M82,316 L76,380 L86,444 L92,380 Z" {...muscleProps("legsGlutes")} />
        <path d="M138,316 L144,380 L134,444 L128,380 Z" {...muscleProps("legsGlutes")} />
      </g>
    </svg>
  );
};

export default MuscleBodySvg;
