import { type FC } from "react";

export type MuscleKey = "legsGlutes" | "back" | "chest" | "shoulders" | "arms" | "core";

interface MuscleBodySvgProps {
  getFill: (key: MuscleKey) => string;
  getStroke: (key: MuscleKey) => string;
  getStrokeWidth: (key: MuscleKey) => number;
  onClickMuscle: (key: MuscleKey) => void;
}

const OUTLINE = "hsl(0, 0%, 62%)";
const OUTLINE_W = 1.1;

/**
 * Schematic SVG human body — front & back — based on the uploaded anatomical reference.
 * Every muscle group is a discrete <path> that is transparent by default and can be filled independently.
 * Body silhouette is drawn as a separate outline layer so contours always stay crisp.
 */
const MuscleBodySvg: FC<MuscleBodySvgProps> = ({
  getFill,
  getStroke,
  getStrokeWidth,
  onClickMuscle,
}) => {
  const m = (key: MuscleKey) => ({
    fill: getFill(key),
    stroke: getStroke(key),
    strokeWidth: getStrokeWidth(key),
    strokeLinejoin: "round" as const,
    className: "cursor-pointer transition-all duration-300",
    onClick: () => onClickMuscle(key),
  });

  return (
    <svg
      viewBox="0 0 500 600"
      className="w-full h-auto max-w-md mx-auto select-none"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ======================== FRONT VIEW ======================== */}
      <g id="front">
        {/* --- Body silhouette outline --- */}
        <g fill="none" stroke={OUTLINE} strokeWidth={OUTLINE_W} strokeLinejoin="round" strokeLinecap="round">
          {/* Head */}
          <path d="M105,12 C85,12 72,30 72,52 C72,74 88,88 105,88 C122,88 138,74 138,52 C138,30 125,12 105,12 Z" />
          {/* Neck */}
          <path d="M92,86 L92,102 M118,86 L118,102" />
          {/* Torso outer */}
          <path d="M58,108 C58,106 60,102 68,100 L92,100 L118,100 L142,100 C150,102 152,106 152,108
                   L156,130 L158,160 L156,200 L152,230 L148,252
                   Q140,268 130,272 L120,276 L110,280 L105,282
                   L100,280 L90,276 L80,272 Q70,268 62,252
                   L58,230 L54,200 L52,160 L54,130 Z" />
          {/* Left arm */}
          <path d="M58,108 L44,116 L32,140 L24,172 L18,204 L14,232 L12,252 L16,256 L22,252 L28,232 L32,210 L38,180 L44,152 L52,128" />
          {/* Right arm */}
          <path d="M152,108 L166,116 L178,140 L186,172 L192,204 L196,232 L198,252 L194,256 L188,252 L182,232 L178,210 L172,180 L166,152 L158,128" />
          {/* Left leg */}
          <path d="M80,272 L76,310 L72,350 L68,400 L66,440 L64,470 L62,500 L60,530 L58,558 L62,564 L72,562 L76,540 L78,510 L80,480 L82,450 L84,410 L88,370 L92,330 L96,300 L105,282" />
          {/* Right leg */}
          <path d="M130,272 L134,310 L138,350 L142,400 L144,440 L146,470 L148,500 L150,530 L152,558 L148,564 L138,562 L134,540 L132,510 L130,480 L128,450 L126,410 L122,370 L118,330 L114,300 L105,282" />
        </g>

        {/* --- SHOULDERS (front deltoids) --- */}
        <path d="M58,108 L44,116 L38,134 L46,140 L56,130 L58,118 Z" {...m("shoulders")} />
        <path d="M152,108 L166,116 L172,134 L164,140 L154,130 L152,118 Z" {...m("shoulders")} />

        {/* --- CHEST (pectorals) --- */}
        <path d="M62,112 L80,106 L100,104 L105,110 L105,136
                 Q98,148 88,146 L74,140 L64,132 L60,122 Z" {...m("chest")} />
        <path d="M148,112 L130,106 L110,104 L105,110 L105,136
                 Q112,148 122,146 L136,140 L146,132 L150,122 Z" {...m("chest")} />

        {/* --- ARMS (biceps + forearms front) --- */}
        {/* Left upper arm */}
        <path d="M44,118 L32,142 L28,158 L38,162 L46,142 L52,124 Z" {...m("arms")} />
        {/* Left forearm */}
        <path d="M28,160 L22,192 L18,220 L14,244 L20,248 L28,228 L34,200 L38,170 Z" {...m("arms")} />
        {/* Right upper arm */}
        <path d="M166,118 L178,142 L182,158 L172,162 L164,142 L158,124 Z" {...m("arms")} />
        {/* Right forearm */}
        <path d="M182,160 L188,192 L192,220 L196,244 L190,248 L182,228 L176,200 L172,170 Z" {...m("arms")} />

        {/* --- CORE (abdominals + obliques) --- */}
        <path d="M82,148 Q90,154 105,156 Q120,154 128,148
                 L130,180 L132,210 L130,240 L128,258
                 Q120,268 105,270 Q90,268 82,258
                 L80,240 L78,210 L80,180 Z" {...m("core")} />

        {/* --- LEGS & GLUTES (front quads + calves) --- */}
        {/* Left quad */}
        <path d="M82,272 L78,310 L74,350 L72,380 L80,386 L90,370 L96,330 L100,300 L105,282
                 Q96,278 88,274 Z" {...m("legsGlutes")} />
        {/* Right quad */}
        <path d="M128,272 L132,310 L136,350 L138,380 L130,386 L120,370 L114,330 L110,300 L105,282
                 Q114,278 122,274 Z" {...m("legsGlutes")} />
        {/* Left calf */}
        <path d="M72,392 L68,430 L66,460 L64,490 L62,530 L60,554
                 L68,556 L74,534 L78,500 L82,460 L84,420 L80,392 Z" {...m("legsGlutes")} />
        {/* Right calf */}
        <path d="M138,392 L142,430 L144,460 L146,490 L148,530 L150,554
                 L142,556 L136,534 L132,500 L128,460 L126,420 L130,392 Z" {...m("legsGlutes")} />
      </g>

      {/* ======================== BACK VIEW ======================== */}
      <g id="back" transform="translate(250, 0)">
        {/* --- Body silhouette outline --- */}
        <g fill="none" stroke={OUTLINE} strokeWidth={OUTLINE_W} strokeLinejoin="round" strokeLinecap="round">
          {/* Head */}
          <path d="M105,12 C85,12 72,30 72,52 C72,74 88,88 105,88 C122,88 138,74 138,52 C138,30 125,12 105,12 Z" />
          {/* Neck */}
          <path d="M92,86 L92,102 M118,86 L118,102" />
          {/* Torso outer */}
          <path d="M58,108 C58,106 60,102 68,100 L92,100 L118,100 L142,100 C150,102 152,106 152,108
                   L156,130 L158,160 L156,200 L152,230 L148,252
                   Q140,268 130,272 L120,276 L110,280 L105,282
                   L100,280 L90,276 L80,272 Q70,268 62,252
                   L58,230 L54,200 L52,160 L54,130 Z" />
          {/* Left arm */}
          <path d="M58,108 L44,116 L32,140 L24,172 L18,204 L14,232 L12,252 L16,256 L22,252 L28,232 L32,210 L38,180 L44,152 L52,128" />
          {/* Right arm */}
          <path d="M152,108 L166,116 L178,140 L186,172 L192,204 L196,232 L198,252 L194,256 L188,252 L182,232 L178,210 L172,180 L166,152 L158,128" />
          {/* Left leg */}
          <path d="M80,272 L76,310 L72,350 L68,400 L66,440 L64,470 L62,500 L60,530 L58,558 L62,564 L72,562 L76,540 L78,510 L80,480 L82,450 L84,410 L88,370 L92,330 L96,300 L105,282" />
          {/* Right leg */}
          <path d="M130,272 L134,310 L138,350 L142,400 L144,440 L146,470 L148,500 L150,530 L152,558 L148,564 L138,562 L134,540 L132,510 L130,480 L128,450 L126,410 L122,370 L118,330 L114,300 L105,282" />
        </g>

        {/* --- SHOULDERS (rear deltoids) --- */}
        <path d="M58,108 L44,116 L38,134 L46,140 L56,130 L58,118 Z" {...m("shoulders")} />
        <path d="M152,108 L166,116 L172,134 L164,140 L154,130 L152,118 Z" {...m("shoulders")} />

        {/* --- BACK (traps + lats + lower back) --- */}
        {/* Traps */}
        <path d="M68,102 L92,100 L105,108 L105,126
                 Q96,130 86,128 L72,122 L66,114 Z" {...m("back")} />
        <path d="M142,102 L118,100 L105,108 L105,126
                 Q114,130 124,128 L138,122 L144,114 Z" {...m("back")} />
        {/* Lats */}
        <path d="M64,126 Q76,136 105,140 Q134,136 146,126
                 L150,170 L148,210 Q134,222 105,224 Q76,222 62,210
                 L60,170 Z" {...m("back")} />
        {/* Lower back / erectors */}
        <path d="M80,224 Q90,230 105,232 Q120,230 130,224
                 L132,252 Q124,264 105,268 Q86,264 78,252 Z" {...m("back")} />

        {/* --- ARMS (rear triceps + forearms) --- */}
        <path d="M44,118 L32,142 L28,158 L38,162 L46,142 L52,124 Z" {...m("arms")} />
        <path d="M28,160 L22,192 L18,220 L14,244 L20,248 L28,228 L34,200 L38,170 Z" {...m("arms")} />
        <path d="M166,118 L178,142 L182,158 L172,162 L164,142 L158,124 Z" {...m("arms")} />
        <path d="M182,160 L188,192 L192,220 L196,244 L190,248 L182,228 L176,200 L172,170 Z" {...m("arms")} />

        {/* --- GLUTES --- */}
        <path d="M78,258 Q86,268 105,272 Q124,268 132,258
                 L134,280 Q124,294 105,296 Q86,294 76,280 Z" {...m("legsGlutes")} />

        {/* --- LEGS (rear hamstrings + calves) --- */}
        {/* Left hamstring */}
        <path d="M80,290 L76,320 L72,360 L72,392 L82,396 L90,374 L96,340 L100,310 L105,294
                 Q96,290 88,288 Z" {...m("legsGlutes")} />
        {/* Right hamstring */}
        <path d="M130,290 L134,320 L138,360 L138,392 L128,396 L120,374 L114,340 L110,310 L105,294
                 Q114,290 122,288 Z" {...m("legsGlutes")} />
        {/* Left calf */}
        <path d="M72,398 L68,430 L66,460 L64,490 L62,530 L60,554
                 L68,556 L74,534 L78,500 L82,460 L84,420 L80,398 Z" {...m("legsGlutes")} />
        {/* Right calf */}
        <path d="M138,398 L142,430 L144,460 L146,490 L148,530 L150,554
                 L142,556 L136,534 L132,500 L128,460 L126,420 L130,398 Z" {...m("legsGlutes")} />
      </g>
    </svg>
  );
};

export default MuscleBodySvg;
