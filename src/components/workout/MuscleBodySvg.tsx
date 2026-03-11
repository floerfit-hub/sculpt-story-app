import { type FC } from "react";

export type MuscleKey =
  | "chest"
  | "upper_back"
  | "lower_back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "abs"
  | "glutes"
  | "quadriceps"
  | "hamstrings"
  | "calves";

interface MuscleBodySvgProps {
  getFill: (key: MuscleKey) => string;
  getStroke: (key: MuscleKey) => string;
  getStrokeWidth: (key: MuscleKey) => number;
  onClickMuscle: (key: MuscleKey) => void;
}

const OUTLINE = "hsl(var(--muted-foreground) / 0.4)";
const BODY_FILL = "hsl(var(--muted) / 0.15)";

const MuscleBodySvg: FC<MuscleBodySvgProps> = ({
  getFill,
  getStroke,
  getStrokeWidth,
  onClickMuscle,
}) => {
  const m = (key: MuscleKey) => ({
    id: key,
    fill: getFill(key),
    stroke: getStroke(key),
    strokeWidth: getStrokeWidth(key),
    strokeLinejoin: "round" as const,
    className: "cursor-pointer transition-all duration-300 hover:opacity-80",
    onClick: () => onClickMuscle(key),
  });

  return (
    <svg
      viewBox="0 0 520 620"
      className="w-full h-auto max-w-md mx-auto select-none"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ===== FRONT VIEW (left) ===== */}
      <g id="front">
        {/* Body outline */}
        <g fill={BODY_FILL} stroke={OUTLINE} strokeWidth={1} strokeLinejoin="round" strokeLinecap="round">
          {/* Head */}
          <ellipse cx="110" cy="52" rx="30" ry="38" />
          {/* Neck */}
          <rect x="98" y="86" width="24" height="16" rx="4" />
          {/* Torso */}
          <path d="M62,108 Q60,104 72,100 L148,100 Q160,104 158,108 L160,160 L158,220 L154,252 Q142,272 110,280 Q78,272 66,252 L62,220 L60,160 Z" />
          {/* Left arm */}
          <path d="M62,108 L46,118 L32,148 L22,190 L16,230 L14,254 L22,254 L30,230 L38,196 L48,158 L58,126 Z" />
          {/* Right arm */}
          <path d="M158,108 L174,118 L188,148 L198,190 L204,230 L206,254 L198,254 L190,230 L182,196 L172,158 L162,126 Z" />
          {/* Left hand */}
          <ellipse cx="18" cy="264" rx="8" ry="14" />
          {/* Right hand */}
          <ellipse cx="202" cy="264" rx="8" ry="14" />
          {/* Left leg */}
          <path d="M82,274 L76,320 L72,370 L68,420 L66,470 L64,520 L62,560 L74,562 L78,530 L82,480 L86,420 L92,360 L98,310 L110,280 Z" />
          {/* Right leg */}
          <path d="M138,274 L144,320 L148,370 L152,420 L154,470 L156,520 L158,560 L146,562 L142,530 L138,480 L134,420 L128,360 L122,310 L110,280 Z" />
          {/* Left foot */}
          <path d="M62,558 L56,572 L58,580 L76,580 L78,572 L74,558 Z" />
          {/* Right foot */}
          <path d="M158,558 L164,572 L162,580 L144,580 L142,572 L146,558 Z" />
        </g>

        {/* --- SHOULDERS (front delts) --- */}
        <path
          d="M62,108 L46,118 L42,136 L52,142 L60,128 L62,114 Z"
          {...m("shoulders")}
        />
        <path
          d="M158,108 L174,118 L178,136 L168,142 L160,128 L158,114 Z"
          {...m("shoulders")}
        />

        {/* --- CHEST (pectorals) --- */}
        <path
          d="M66,112 L84,106 L106,104 L110,112 L110,140
             Q102,152 90,150 L76,144 L68,136 L64,124 Z"
          {...m("chest")}
        />
        <path
          d="M154,112 L136,106 L114,104 L110,112 L110,140
             Q118,152 130,150 L144,144 L152,136 L156,124 Z"
          {...m("chest")}
        />

        {/* --- BICEPS --- */}
        <path
          d="M48,120 L34,150 L30,170 L40,174 L50,150 L56,128 Z"
          {...m("biceps")}
        />
        <path
          d="M172,120 L186,150 L190,170 L180,174 L170,150 L164,128 Z"
          {...m("biceps")}
        />

        {/* --- ABS --- */}
        <path
          d="M86,152 Q96,160 110,162 Q124,160 134,152
             L136,190 L136,220 L134,248 L132,262
             Q124,272 110,276 Q96,272 88,262
             L86,248 L84,220 L84,190 Z"
          {...m("abs")}
        />

        {/* --- QUADRICEPS --- */}
        <path
          d="M86,274 L82,320 L78,360 L76,390 L86,396
             L96,378 L102,340 L106,310 L110,282
             Q100,278 92,274 Z"
          {...m("quadriceps")}
        />
        <path
          d="M134,274 L138,320 L142,360 L144,390 L134,396
             L124,378 L118,340 L114,310 L110,282
             Q120,278 128,274 Z"
          {...m("quadriceps")}
        />

        {/* --- CALVES (front) --- */}
        <path
          d="M76,400 L72,440 L68,475 L66,510 L64,548
             L72,552 L78,524 L82,486 L86,440 L84,406 Z"
          {...m("calves")}
        />
        <path
          d="M144,400 L148,440 L152,475 L154,510 L156,548
             L148,552 L142,524 L138,486 L134,440 L136,406 Z"
          {...m("calves")}
        />

        {/* Front label */}
        <text x="110" y="604" textAnchor="middle" className="fill-muted-foreground text-[11px] font-medium">FRONT</text>
      </g>

      {/* ===== BACK VIEW (right) ===== */}
      <g id="back" transform="translate(290, 0)">
        {/* Body outline */}
        <g fill={BODY_FILL} stroke={OUTLINE} strokeWidth={1} strokeLinejoin="round" strokeLinecap="round">
          <ellipse cx="110" cy="52" rx="30" ry="38" />
          <rect x="98" y="86" width="24" height="16" rx="4" />
          <path d="M62,108 Q60,104 72,100 L148,100 Q160,104 158,108 L160,160 L158,220 L154,252 Q142,272 110,280 Q78,272 66,252 L62,220 L60,160 Z" />
          <path d="M62,108 L46,118 L32,148 L22,190 L16,230 L14,254 L22,254 L30,230 L38,196 L48,158 L58,126 Z" />
          <path d="M158,108 L174,118 L188,148 L198,190 L204,230 L206,254 L198,254 L190,230 L182,196 L172,158 L162,126 Z" />
          <ellipse cx="18" cy="264" rx="8" ry="14" />
          <ellipse cx="202" cy="264" rx="8" ry="14" />
          <path d="M82,274 L76,320 L72,370 L68,420 L66,470 L64,520 L62,560 L74,562 L78,530 L82,480 L86,420 L92,360 L98,310 L110,280 Z" />
          <path d="M138,274 L144,320 L148,370 L152,420 L154,470 L156,520 L158,560 L146,562 L142,530 L138,480 L134,420 L128,360 L122,310 L110,280 Z" />
          <path d="M62,558 L56,572 L58,580 L76,580 L78,572 L74,558 Z" />
          <path d="M158,558 L164,572 L162,580 L144,580 L142,572 L146,558 Z" />
        </g>

        {/* --- SHOULDERS (rear delts) --- */}
        <path
          d="M62,108 L46,118 L42,136 L52,142 L60,128 L62,114 Z"
          {...m("shoulders")}
        />
        <path
          d="M158,108 L174,118 L178,136 L168,142 L160,128 L158,114 Z"
          {...m("shoulders")}
        />

        {/* --- TRICEPS --- */}
        <path
          d="M48,120 L34,150 L30,170 L40,174 L50,150 L56,128 Z"
          {...m("triceps")}
        />
        <path
          d="M172,120 L186,150 L190,170 L180,174 L170,150 L164,128 Z"
          {...m("triceps")}
        />

        {/* --- UPPER BACK (traps + lats) --- */}
        <path
          d="M68,104 L92,100 L110,110 L128,100 L152,104
             L156,130 L158,170 L154,210
             Q136,224 110,226 Q84,224 66,210
             L62,170 L64,130 Z"
          {...m("upper_back")}
        />

        {/* --- LOWER BACK (erectors) --- */}
        <path
          d="M80,220 Q94,230 110,232 Q126,230 140,220
             L142,250 Q130,268 110,272 Q90,268 78,250 Z"
          {...m("lower_back")}
        />

        {/* --- GLUTES --- */}
        <path
          d="M78,258 Q90,272 110,276 Q130,272 142,258
             L144,290 Q132,306 110,308 Q88,306 76,290 Z"
          {...m("glutes")}
        />

        {/* --- HAMSTRINGS --- */}
        <path
          d="M84,300 L80,340 L76,380 L76,406 L88,410
             L98,388 L104,350 L108,320 L110,304
             Q100,300 92,298 Z"
          {...m("hamstrings")}
        />
        <path
          d="M136,300 L140,340 L144,380 L144,406 L132,410
             L122,388 L116,350 L112,320 L110,304
             Q120,300 128,298 Z"
          {...m("hamstrings")}
        />

        {/* --- CALVES (rear) --- */}
        <path
          d="M76,414 L72,450 L68,485 L66,520 L64,548
             L72,552 L78,524 L82,486 L86,448 L84,418 Z"
          {...m("calves")}
        />
        <path
          d="M144,414 L148,450 L152,485 L154,520 L156,548
             L148,552 L142,524 L138,486 L134,448 L136,418 Z"
          {...m("calves")}
        />

        {/* Back label */}
        <text x="110" y="604" textAnchor="middle" className="fill-muted-foreground text-[11px] font-medium">BACK</text>
      </g>
    </svg>
  );
};

export default MuscleBodySvg;
