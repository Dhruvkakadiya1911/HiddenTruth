'use client';

import React, { useState } from 'react';

const ROLE_COLORS = {
  detective: '#2EE6FF',
  killer: '#FF2D55',
  witness: '#FFC93C',
  suspect: '#B76CFF',
  unknown: '#A49CC4',
};

const ROLE_NAMES = {
  detective: 'The Detective',
  killer: 'The Killer',
  witness: 'The Witness',
  suspect: 'The Suspect',
  unknown: 'Masked player',
};

export default function AgentFigure({
  role = 'detective',
  size = 200,
  tint,
  glow = true,
  tilt = false,
  className = '',
  style = {},
  variant = 'auto', // 'auto' | 'avatar' | 'full'
}) {
  const [rot, setRot] = useState({ rx: 0, ry: 0 });

  const normRole = (r) => {
    const s = String(r || '').toLowerCase().trim();
    if (s.includes('detec')) return 'detective';
    if (s.includes('kill')) return 'killer';
    if (s.includes('witn')) return 'witness';
    if (s.includes('susp')) return 'suspect';
    return 'unknown';
  };

  const activeRole = normRole(role);
  const c = tint || ROLE_COLORS[activeRole] || '#A49CC4';
  const label = ROLE_NAMES[activeRole] || 'Character';

  const isAvatar = variant === 'avatar' || (variant === 'auto' && Number(size) <= 80);
  const w = Number(size) || (isAvatar ? 48 : 200);
  const h = isAvatar ? w : Math.round(w * 1.25);
  const viewBox = isAvatar ? '10 5 180 180' : '0 0 200 250';

  const filterStyle = glow
    ? `drop-shadow(0 0 ${Math.max(6, Math.round(w / 14))}px ${c}55)`
    : 'none';
  const dash = activeRole === 'unknown' ? '5 6' : 'none';

  const handleMouseMove = (e) => {
    if (!tilt || w < 100 || isAvatar) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setRot({ ry: x * 28, rx: -y * 18 });
  };

  const handleMouseLeave = () => {
    if (!tilt || isAvatar) return;
    setRot({ rx: 0, ry: 0 });
  };

  return (
    <div
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: w,
        height: h,
        perspective: tilt && !isAvatar ? '700px' : 'none',
        fontFamily: "'Unbounded', sans-serif",
        color: '#F2EEFF',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: tilt && !isAvatar ? `rotateX(${rot.rx}deg) rotateY(${rot.ry}deg)` : 'none',
          transition: 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
          transformStyle: tilt && !isAvatar ? 'preserve-3d' : 'flat',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={viewBox}
          role="img"
          aria-label={label}
          style={{
            display: 'block',
            overflow: isAvatar ? 'hidden' : 'visible',
            filter: filterStyle,
          }}
        >
          {/* Pedestal - only rendered in full figure mode */}
          {!isAvatar && (
            <>
              <ellipse
                cx="100"
                cy="232"
                rx="68"
                ry="13"
                fill="#0A0716"
                stroke={c}
                strokeWidth="3"
                strokeDasharray={dash}
              />
              <ellipse cx="100" cy="232" rx="50" ry="7" fill={c} opacity=".28" />
              <rect x="86" y="206" width="11" height="26" rx="4" fill="#150F2C" />
              <rect x="103" y="206" width="11" height="26" rx="4" fill="#150F2C" />
            </>
          )}

          {/* DETECTIVE */}
          {activeRole === 'detective' && (
            <g>
              <path d="M60 214 L70 146 Q100 130 130 146 L140 214 Z" fill="#C99A5E" />
              <path d="M84 138 L100 168 L116 138 Z" fill="#F0C990" />
              <path d="M84 138 L95 162 L82 172 Z" fill="#6E4A26" />
              <path d="M116 138 L105 162 L118 172 Z" fill="#6E4A26" />
              <rect x="63" y="180" width="74" height="8" fill="#6E4A26" />
              <rect x="95" y="179" width="10" height="10" rx="2" fill="none" stroke="#2EE6FF" strokeWidth="2" />
              <path d="M71 152 Q56 172 64 194" stroke="#C99A5E" strokeWidth="14" strokeLinecap="round" fill="none" />
              <path d="M129 152 Q146 162 146 176" stroke="#C99A5E" strokeWidth="14" strokeLinecap="round" fill="none" />
              <line x1="146" y1="180" x2="140" y2="198" stroke="#5A3D22" strokeWidth="6" strokeLinecap="round" />
              <circle cx="154" cy="160" r="18" fill="#2EE6FF" fillOpacity=".18" stroke="#2EE6FF" strokeWidth="5" />
              <path d="M146 152 Q150 148 156 148" stroke="#E0FBFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <circle cx="100" cy="100" r="40" fill="#F2D2B6" />
              <ellipse cx="86" cy="104" rx="4" ry="5" fill="#1A1236" />
              <ellipse cx="114" cy="104" rx="4" ry="5" fill="#1A1236" />
              <path d="M79 93 L92 96" stroke="#3A2A1E" strokeWidth="3" strokeLinecap="round" />
              <path d="M121 93 L108 96" stroke="#3A2A1E" strokeWidth="3" strokeLinecap="round" />
              <circle cx="78" cy="114" r="5" fill="#F0A89A" opacity=".6" />
              <circle cx="122" cy="114" r="5" fill="#F0A89A" opacity=".6" />
              <path d="M93 118 Q100 121 107 118" stroke="#8A4A3A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M70 78 Q70 36 100 34 Q130 36 130 78 Z" fill="#231A40" />
              <path d="M90 37 Q100 48 110 37" stroke="#161226" strokeWidth="3" fill="none" />
              <rect x="70" y="64" width="60" height="10" fill="#2EE6FF" />
              <ellipse cx="100" cy="78" rx="60" ry="10" fill="#1A1236" />
            </g>
          )}

          {/* KILLER */}
          {activeRole === 'killer' && (
            <g>
              <path d="M136 170 L172 208 M144 163 L178 200" stroke="#FF7A3D" strokeWidth="5" strokeLinecap="round" />
              <path d="M54 216 Q58 150 100 134 Q142 150 146 216 Z" fill="#1E1830" />
              <path d="M100 146 L100 216" stroke="#FF2D55" strokeWidth="2" opacity=".55" />
              <path d="M54 216 Q58 150 100 134" stroke="#FF2D55" strokeWidth="1.5" fill="none" opacity=".35" />
              <path d="M54 154 Q40 180 50 200" stroke="#1E1830" strokeWidth="14" strokeLinecap="round" fill="none" />
              <path d="M146 154 Q162 174 156 198" stroke="#1E1830" strokeWidth="14" strokeLinecap="round" fill="none" />
              <circle cx="100" cy="94" r="42" fill="#120C26" stroke="#463A66" strokeWidth="2" />
              <path d="M60 88 Q100 48 140 88 Q140 128 100 138 Q60 128 60 88 Z" fill="#0A0716" />
              <path d="M78 102 L95 110 L79 114 Z" fill="#FF2D55" />
              <path d="M122 102 L105 110 L121 114 Z" fill="#FF2D55" />
              <path d="M86 126 Q100 134 114 126" stroke="#FF2D55" strokeWidth="2" fill="none" opacity=".75" strokeLinecap="round" />
            </g>
          )}

          {/* WITNESS */}
          {activeRole === 'witness' && (
            <g>
              <path d="M62 214 L72 146 Q100 132 128 146 L138 214 Z" fill="#FFC93C" />
              <path d="M100 144 L100 214" stroke="#B57A00" strokeWidth="2" />
              <circle cx="94" cy="162" r="3" fill="#8A6508" />
              <circle cx="94" cy="180" r="3" fill="#8A6508" />
              <circle cx="94" cy="198" r="3" fill="#8A6508" />
              <path d="M72 152 Q58 172 66 194" stroke="#FFC93C" strokeWidth="14" strokeLinecap="round" fill="none" />
              <path d="M128 152 Q140 160 134 172" stroke="#FFC93C" strokeWidth="14" strokeLinecap="round" fill="none" />
              <rect x="116" y="160" width="36" height="24" rx="5" fill="#2A1E4A" />
              <rect x="120" y="155" width="10" height="6" rx="2" fill="#2A1E4A" />
              <circle cx="136" cy="172" r="8" fill="#0A0716" stroke="#FFC93C" strokeWidth="2.5" />
              <circle cx="138" cy="170" r="2" fill="#FFF6D6" />
              <circle cx="100" cy="100" r="40" fill="#E8B996" />
              <path d="M58 104 Q54 54 100 54 Q146 54 142 104 L134 104 Q130 74 100 72 Q70 74 66 104 Z" fill="#5A3A22" />
              <path d="M68 76 Q86 90 102 72 Q116 88 134 76 Q122 58 100 58 Q78 58 68 76 Z" fill="#5A3A22" />
              <circle cx="86" cy="106" r="9" fill="#FFFFFF" />
              <circle cx="114" cy="106" r="9" fill="#FFFFFF" />
              <circle cx="87" cy="107" r="5" fill="#1A1236" />
              <circle cx="115" cy="107" r="5" fill="#1A1236" />
              <circle cx="89" cy="105" r="1.6" fill="#FFFFFF" />
              <circle cx="117" cy="105" r="1.6" fill="#FFFFFF" />
              <ellipse cx="100" cy="125" rx="4" ry="5" fill="#7A3A2A" />
              <rect x="95" y="4" width="10" height="28" rx="5" fill="#FFC93C" />
              <circle cx="100" cy="42" r="5" fill="#FFC93C" />
            </g>
          )}

          {/* SUSPECT */}
          {activeRole === 'suspect' && (
            <g>
              <path d="M60 214 L70 146 Q100 132 130 146 L140 214 Z" fill="#3E2368" />
              <path d="M88 140 L100 168 L112 140 Z" fill="#F8D2B4" />
              <path d="M100 146 L95 152 L100 178 L105 152 Z" fill="#B76CFF" />
              <path d="M88 140 L98 166 L84 172 Z" fill="#7650B0" />
              <path d="M112 140 L102 166 L116 172 Z" fill="#7650B0" />
              <path d="M71 152 Q58 172 66 194" stroke="#3E2368" strokeWidth="14" strokeLinecap="round" fill="none" />
              <path d="M129 152 Q144 166 144 180" stroke="#3E2368" strokeWidth="14" strokeLinecap="round" fill="none" />
              <path d="M142 182 v-6 h16 v6" stroke="#3A2412" strokeWidth="3" fill="none" />
              <rect x="132" y="182" width="36" height="26" rx="4" fill="#6B4423" />
              <rect x="146" y="190" width="8" height="5" rx="1" fill="#B76CFF" />
              <circle cx="100" cy="100" r="40" fill="#D9A784" />
              <path d="M60 98 Q60 54 104 56 Q140 58 140 90 Q126 72 98 74 Q74 76 66 104 Z" fill="#2A1438" />
              <path d="M100 56 Q134 46 150 68 Q130 62 110 68 Z" fill="#2A1438" />
              <rect x="73" y="98" width="23" height="13" rx="5" fill="#0A0716" />
              <rect x="104" y="98" width="23" height="13" rx="5" fill="#0A0716" />
              <path d="M96 103 h8" stroke="#0A0716" strokeWidth="3" />
              <path d="M77 101 h7" stroke="#B76CFF" strokeWidth="2" strokeLinecap="round" />
              <path d="M108 101 h7" stroke="#B76CFF" strokeWidth="2" strokeLinecap="round" />
              <path d="M91 123 Q102 127 111 119" stroke="#6A3A2A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M148 92 Q155 103 148 108 Q141 103 148 92 Z" fill="#7DD3FC" />
            </g>
          )}

          {/* UNKNOWN */}
          {activeRole === 'unknown' && (
            <g>
              <path d="M62 214 L72 146 Q100 132 128 146 L138 214 Z" fill="#120C26" stroke={c} strokeWidth="2" strokeOpacity=".6" />
              <path d="M72 152 Q58 172 66 194" stroke="#120C26" strokeWidth="14" strokeLinecap="round" fill="none" />
              <path d="M128 152 Q142 172 134 194" stroke="#120C26" strokeWidth="14" strokeLinecap="round" fill="none" />
              <circle cx="100" cy="100" r="40" fill="#120C26" stroke={c} strokeWidth="2" strokeOpacity=".6" />
              <text
                x="100"
                y="100"
                textAnchor="middle"
                dominantBaseline="central"
                alignmentBaseline="central"
                fontFamily="'Unbounded', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                fontWeight="700"
                fontSize="44"
                fill={c}
              >
                ?
              </text>
              <path d="M86 50 Q100 40 114 50" stroke={c} strokeWidth="2" fill="none" opacity=".4" strokeLinecap="round" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
