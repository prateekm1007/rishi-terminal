"use client";

export default function SadhuVectorLogo({
  size = 56,
  showText = true,
}: {
  size?: number;
  showText?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        {/* Drop Shadow for the entire icon */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          boxShadow: "0 8px 24px rgba(0,0,0,0.8), 0 0 12px rgba(212,175,55,0.3)",
        }} />

        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 120 120" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background: Dark Temple Vignette */}
          <circle cx="60" cy="60" r="58" fill="url(#bgTemple)" />
          
          {/* Golden Aura behind the Rishi */}
          <circle cx="60" cy="50" r="38" fill="url(#goldenAura)" />

          {/* Robe/Body Base */}
          <path d="M 25 110 Q 20 80 40 70 Q 60 75 80 70 Q 100 80 95 110 Z" fill="url(#robeGradient)" />
          {/* Robe Folds */}
          <path d="M 35 110 Q 30 85 45 75" stroke="#CBD5E1" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
          <path d="M 85 110 Q 90 85 75 75" stroke="#CBD5E1" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
          <path d="M 50 110 Q 60 85 70 110" stroke="#CBD5E1" strokeWidth="1.5" fill="none" opacity="0.3" />

          {/* Face Base */}
          <ellipse cx="60" cy="52" rx="13" ry="16" fill="#C28455" />
          
          {/* Eye shadows / depth */}
          <ellipse cx="55" cy="49" rx="3" ry="1.5" fill="#5A3A22" opacity="0.6" />
          <ellipse cx="65" cy="49" rx="3" ry="1.5" fill="#5A3A22" opacity="0.6" />
          
          {/* Eyes (Intense, focused) */}
          <path d="M 53 49 Q 55 48 57 49" stroke="#1E293B" strokeWidth="1.2" fill="none" />
          <path d="M 63 49 Q 65 48 67 49" stroke="#1E293B" strokeWidth="1.2" fill="none" />
          <circle cx="55" cy="49.5" r="0.8" fill="#1E293B" />
          <circle cx="65" cy="49.5" r="0.8" fill="#1E293B" />

          {/* Nose shadow */}
          <path d="M 60 49 L 60 56 L 62 56" stroke="#8B5A33" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* Red Tilak (Tripundra/mark) */}
          <path d="M 56 42 Q 60 40 64 42" stroke="#DC2626" strokeWidth="1.2" fill="none" />
          <path d="M 57 44 Q 60 43 63 44" stroke="#DC2626" strokeWidth="1.2" fill="none" />
          <path d="M 58 46 Q 60 45 62 46" stroke="#DC2626" strokeWidth="1.2" fill="none" />
          <circle cx="60" cy="43.5" r="1.5" fill="#DC2626" />

          {/* White Turban/Wrap */}
          {/* Back wrap */}
          <ellipse cx="60" cy="38" rx="18" ry="16" fill="#E2E8F0" />
          {/* Main front wrap */}
          <path d="M 42 42 Q 40 25 60 22 Q 80 25 78 42 Q 70 34 60 36 Q 50 34 42 42 Z" fill="url(#turbanGradient)" />
          {/* Turban folds */}
          <path d="M 45 35 Q 60 25 75 35" stroke="#CBD5E1" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M 48 30 Q 60 22 72 30" stroke="#CBD5E1" strokeWidth="1" fill="none" strokeLinecap="round" />

          {/* Long White Beard & Mustache */}
          {/* Mustache */}
          <path d="M 52 58 Q 60 56 68 58 Q 65 62 60 60 Q 55 62 52 58 Z" fill="#F8FAFC" />
          {/* Main Beard Flow */}
          <path d="M 47 55 Q 40 75 55 85 Q 60 88 65 85 Q 80 75 73 55 Q 65 65 60 62 Q 55 65 47 55 Z" fill="url(#beardGradient)" />
          {/* Beard Texture Lines */}
          <path d="M 53 60 Q 55 75 58 82" stroke="#CBD5E1" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M 67 60 Q 65 75 62 82" stroke="#CBD5E1" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M 60 62 L 60 84" stroke="#E2E8F0" strokeWidth="1.5" fill="none" strokeLinecap="round" />

          {/* Rudraksha Mala (Beads around neck) */}
          <path d="M 48 68 Q 60 95 72 68" stroke="#78350F" strokeWidth="3" fill="none" strokeDasharray="3 3" strokeLinecap="round" />
          <path d="M 45 70 Q 60 102 75 70" stroke="#92400E" strokeWidth="2.5" fill="none" strokeDasharray="2.5 3" strokeLinecap="round" opacity="0.8" />
          {/* Center pendant/Guru bead */}
          <circle cx="60" cy="85" r="2.5" fill="#B45309" />

          {/* Right Hand in Gyan Mudra (raised on the left side of SVG) */}
          <g transform="translate(30, 50)">
            {/* Hand base / palm */}
            <path d="M 12 18 Q 8 25 10 32 L 20 32 Q 22 25 18 18 Z" fill="#C28455" />
            {/* 3 Fingers pointing up */}
            <path d="M 10 18 L 8 5" stroke="#C28455" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M 14 17 L 13 3" stroke="#C28455" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M 18 18 L 19 6" stroke="#C28455" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Thumb and Index touching (The Mudra Circle) */}
            <path d="M 16 22 Q 25 15 22 26 Q 16 28 16 22 Z" fill="none" stroke="#C28455" strokeWidth="2" strokeLinecap="round" />
            {/* Robe sleeve draping over arm */}
            <path d="M 5 35 Q 15 28 25 35 Q 20 50 10 50 Z" fill="#F8FAFC" />
            <path d="M 8 35 Q 15 32 22 35" stroke="#CBD5E1" strokeWidth="1.5" fill="none" />
          </g>

          {/* Outer Golden Border */}
          <circle cx="60" cy="60" r="58" fill="none" stroke="url(#goldRim)" strokeWidth="2" />
          <circle cx="60" cy="60" r="54" fill="none" stroke="url(#goldRim)" strokeWidth="0.5" opacity="0.5" />

          {/* Gradients & Defs */}
          <defs>
            <radialGradient id="bgTemple" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#291A10" />
              <stop offset="70%" stopColor="#120A05" />
              <stop offset="100%" stopColor="#050302" />
            </radialGradient>

            <radialGradient id="goldenAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="turbanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>

            <linearGradient id="robeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>

            <linearGradient id="beardGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>

            <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A88B20" />
              <stop offset="30%" stopColor="#FFD700" />
              <stop offset="70%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <div style={{
            fontFamily: "Cinzel, Georgia, serif",
            fontSize: 15,
            fontWeight: 800,
            color: "#D4AF37",
            letterSpacing: "0.08em",
          }}>
            RISHI
          </div>
          <div style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            fontWeight: 700,
            color: "#475569",
            letterSpacing: "0.14em",
            marginTop: 4,
          }}>
            TERMINAL
          </div>
        </div>
      )}
    </div>
  );
}