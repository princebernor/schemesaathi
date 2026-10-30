import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Layered SVG guide character. Each arm is two nested groups (upper arm → forearm → hand) that rotate
 * around their own joint, so the hand can aim at any point on screen. Rotation 0° = arm hanging down.
 */

const SKIN = '#f3bf98';
const SKIN_SHADE = '#e2a07a';
const HAIR = '#1f2340';
const JACKET = '#2453b3';
const JACKET_DARK = '#1b4196';
const PANTS = '#1d2a5a';
const SHIRT_LINE = '#d3dcea';

interface Pose {
  upper: number;
  fore: number;
  point: boolean;
}

const REST_L: Pose = { upper: 14, fore: -112, point: false }; // hand resting on belly
const REST_R: Pose = { upper: -14, fore: 112, point: false };
const WELCOME_R: Pose = { upper: -30, fore: -70, point: false }; // open-palm welcome gesture

const EASE = 'transform 0.6s cubic-bezier(.34,1.22,.64,1)';

function Arm({ side, pose, anchorRef }: { side: 'L' | 'R'; pose: Pose; anchorRef: React.Ref<SVGCircleElement> }) {
  const x = side === 'L' ? 112 : 208;
  const flip = side === 'L' ? -1 : 1;
  return (
    <g transform={`translate(${x} 206)`}>
      <circle ref={anchorRef} r="1" fill="none" />
      <g style={{ transform: `rotate(${pose.upper}deg)`, transition: EASE }}>
        {/* upper arm (shirt sleeve) */}
        <rect x="-13.5" y="-10" width="27" height="88" rx="13.5" fill="#fff" stroke={SHIRT_LINE} strokeWidth="2" />
        <path d="M-6 20 Q-2 40 -5 60" stroke={SHIRT_LINE} strokeWidth="1.6" fill="none" />
        <g transform="translate(0 74)">
          <g style={{ transform: `rotate(${pose.fore}deg)`, transition: EASE }}>
            {/* forearm: rolled sleeve then skin */}
            <rect x="-9.5" y="16" width="19" height="50" rx="9.5" fill={SKIN} />
            <rect x="-12.5" y="-8" width="25" height="30" rx="11" fill="#fff" stroke={SHIRT_LINE} strokeWidth="2" />
            <rect x="-13" y="15" width="26" height="9" rx="4.5" fill="#eef2f8" stroke={SHIRT_LINE} strokeWidth="1.6" />
            <g transform={`translate(0 62) scale(${flip} 1)`}>
              {/* open palm */}
              <g style={{ opacity: pose.point ? 0 : 1, transition: 'opacity .3s' }}>
                <path d="M-11 0 Q-15 18 -7 30 Q0 36 8 30 Q15 18 11 0 Z" fill={SKIN} stroke={SKIN_SHADE} strokeWidth="1.5" />
                <path d="M-3 22 L-3 32 M2 22 L2 33 M7 20 L7 30" stroke={SKIN_SHADE} strokeWidth="1.3" strokeLinecap="round" />
                <ellipse cx="12" cy="8" rx="5" ry="9" transform="rotate(-25 12 8)" fill={SKIN} stroke={SKIN_SHADE} strokeWidth="1.5" />
              </g>
              {/* pointing hand */}
              <g style={{ opacity: pose.point ? 1 : 0, transition: 'opacity .3s' }}>
                <rect x="-3.8" y="10" width="7.6" height="30" rx="3.8" fill={SKIN} stroke={SKIN_SHADE} strokeWidth="1.5" />
                <circle cx="0" cy="8" r="11.5" fill={SKIN} stroke={SKIN_SHADE} strokeWidth="1.5" />
                <path d="M-7 10 Q-4 16 2 14" stroke={SKIN_SHADE} strokeWidth="1.3" fill="none" strokeLinecap="round" />
                <ellipse cx="9" cy="12" rx="4.2" ry="7" transform="rotate(-30 9 12)" fill={SKIN} stroke={SKIN_SHADE} strokeWidth="1.5" />
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}

export default function Character({ target, className = '' }: { target: DOMRect | null; className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const lRef = useRef<SVGCircleElement>(null);
  const rRef = useRef<SVGCircleElement>(null);
  const [left, setLeft] = useState<Pose>(REST_L);
  const [right, setRight] = useState<Pose>(WELCOME_R);
  const [look, setLook] = useState({ dx: 0, dy: 0, tilt: 0 });

  useLayoutEffect(() => {
    if (!target || !svgRef.current || !lRef.current || !rRef.current) {
      setLeft(REST_L);
      setRight(WELCOME_R);
      setLook({ dx: 0, dy: 0, tilt: 0 });
      return;
    }
    const box = svgRef.current.getBoundingClientRect();
    const midX = box.left + box.width / 2;
    const tx = target.left + target.width / 2;
    const useLeft = tx < midX;
    const shoulder = (useLeft ? lRef : rRef).current!.getBoundingClientRect();
    // aim at the near edge of the card, vertically centred
    const aimX = useLeft ? target.right - 12 : target.left + 12;
    const aimY = target.top + target.height / 2;
    const dx = aimX - shoulder.left;
    const dy = aimY - shoulder.top;
    const angle = (Math.atan2(-dx, dy) * 180) / Math.PI;
    const pointing: Pose = { upper: angle, fore: 0, point: true };
    if (useLeft) {
      setLeft(pointing);
      setRight(REST_R);
    } else {
      setRight(pointing);
      setLeft(REST_L);
    }
    const len = Math.hypot(dx, dy) || 1;
    setLook({ dx: (dx / len) * 3.2, dy: (dy / len) * 2.5, tilt: useLeft ? -6 : 6 });
  }, [target]);

  return (
    <svg
      ref={svgRef}
      viewBox="-80 20 480 520"
      className={className}
      role="img"
      aria-label="Friendly guide pointing at citizen categories"
    >
      <ellipse cx="160" cy="515" rx="100" ry="13" fill={JACKET} opacity="0.1" />

      {/* legs & shoes */}
      <rect x="123" y="318" width="74" height="44" rx="12" fill={PANTS} />
      <rect x="126" y="330" width="32" height="172" rx="13" fill={PANTS} />
      <rect x="162" y="330" width="32" height="172" rx="13" fill={PANTS} />
      <path d="M159 345 L160 480" stroke="#141d44" strokeWidth="2" />
      <rect x="110" y="490" width="50" height="20" rx="10" fill={HAIR} />
      <rect x="160" y="490" width="50" height="20" rx="10" fill={HAIR} />
      <path d="M116 506 H154 M166 506 H204" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".7" />

      {/* neck */}
      <rect x="149" y="160" width="22" height="34" rx="7" fill={SKIN} />
      <path d="M149 178 Q160 186 171 178" stroke={SKIN_SHADE} strokeWidth="3" fill="none" opacity=".6" />

      {/* shirt */}
      <path d="M126 194 Q160 182 194 194 L214 214 Q220 270 210 334 L110 334 Q100 270 106 214 Z" fill="#fff" stroke={SHIRT_LINE} strokeWidth="2" />
      {/* nehru jacket */}
      <path d="M116 202 Q130 195 147 192 L160 250 L160 338 L113 338 Q105 280 108 232 Q110 212 116 202 Z" fill={JACKET} />
      <path d="M204 202 Q190 195 173 192 L160 250 L160 338 L207 338 Q215 280 212 232 Q210 212 204 202 Z" fill={JACKET} />
      <path d="M160 250 L160 338" stroke={JACKET_DARK} strokeWidth="2.5" />
      <rect x="124" y="268" width="20" height="4" rx="2" fill={JACKET_DARK} />
      {[262, 280, 298, 316].map((y) => (
        <circle key={y} cx="164.5" cy={y} r="2.6" fill={JACKET_DARK} />
      ))}
      {/* mandarin collar */}
      <path d="M145 186 Q160 195 175 186 L177 197 Q160 206 143 197 Z" fill="#fff" stroke={SHIRT_LINE} strokeWidth="1.8" />

      <Arm side="L" pose={left} anchorRef={lRef} />
      <Arm side="R" pose={right} anchorRef={rRef} />

      {/* head */}
      <g style={{ transform: `rotate(${look.tilt}deg)`, transformOrigin: '160px 170px', transition: EASE }}>
        <ellipse cx="119" cy="122" rx="7" ry="11" fill={SKIN} />
        <ellipse cx="201" cy="122" rx="7" ry="11" fill={SKIN} />
        <ellipse cx="160" cy="118" rx="41" ry="47" fill={SKIN} />
        <path d="M119 116 Q112 72 150 62 Q178 54 196 72 Q208 88 202 116 Q196 98 184 92 Q168 99 148 93 Q130 94 121 116 Z" fill={HAIR} />
        <path d="M146 64 Q172 42 200 64 Q184 60 172 70 Z" fill={HAIR} />
        <path d="M135 103 q9 -6 17 -1 M168 102 q9 -5 17 1" stroke={HAIR} strokeWidth="3.4" strokeLinecap="round" fill="none" />
        <g className="blink">
          <ellipse cx="144" cy="119" rx="7.5" ry="8.5" fill="#fff" />
          <ellipse cx="176" cy="119" rx="7.5" ry="8.5" fill="#fff" />
          <g style={{ transform: `translate(${look.dx}px, ${look.dy}px)`, transition: 'transform .4s ease' }}>
            <circle cx="144" cy="120" r="4.6" fill={HAIR} />
            <circle cx="176" cy="120" r="4.6" fill={HAIR} />
            <circle cx="145.6" cy="118.4" r="1.4" fill="#fff" />
            <circle cx="177.6" cy="118.4" r="1.4" fill="#fff" />
          </g>
        </g>
        <path d="M160 122 q-5 10 1 12" stroke={SKIN_SHADE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M145 140 Q160 158 175 140 Q160 146 145 140 Z" fill="#9b2f2f" />
        <path d="M148 141.5 Q160 146.5 172 141.5 L171 144 Q160 149 149 144 Z" fill="#fff" />
        <circle cx="132" cy="135" r="6" fill="#f59e8b" opacity=".35" />
        <circle cx="188" cy="135" r="6" fill="#f59e8b" opacity=".35" />
      </g>
    </svg>
  );
}
