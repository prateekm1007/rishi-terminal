interface RishiLogoProps {
  size?: number;
  showText?: boolean;
  variant?: 'icon' | 'full' | 'minimal';
  className?: string;
}

export default function RishiLogo({ 
  size = 48, 
  showText = true, 
  variant = 'full',
  className = '' 
}: RishiLogoProps) {
  
  // Minimal variant = just the sadhu silhouette
  if (variant === 'minimal') {
    return (
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Golden aura circle */}
        <circle cx="50" cy="35" r="28" fill="url(#auraGlow)" opacity="0.3"/>
        
        {/* Head */}
        <circle cx="50" cy="35" r="12" fill="#F8FAFC" stroke="#D4AF37" strokeWidth="1.5"/>
        
        {/* Eyes (closed, meditating) */}
        <path d="M 44 34 Q 46 32 48 34" stroke="#1E293B" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        <path d="M 52 34 Q 54 32 56 34" stroke="#1E293B" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        
        {/* Tilak (third eye mark) */}
        <circle cx="50" cy="30" r="1.5" fill="#DC2626"/>
        
        {/* Flowing white beard */}
        <path 
          d="M 42 42 Q 38 50 40 58 Q 42 65 45 68 L 50 70 L 55 68 Q 58 65 60 58 Q 62 50 58 42 Z" 
          fill="#F8FAFC" 
          stroke="#D4AF37" 
          strokeWidth="1"
          opacity="0.95"
        />
        
        {/* Body in white dhoti */}
        <ellipse cx="50" cy="60" rx="18" ry="14" fill="#F8FAFC" stroke="#D4AF37" strokeWidth="1.2"/>
        
        {/* Arms in meditation mudra */}
        <path 
          d="M 32 58 Q 28 60 30 65 L 35 68" 
          stroke="#F8FAFC" 
          strokeWidth="3" 
          fill="none" 
          strokeLinecap="round"
        />
        <path 
          d="M 68 58 Q 72 60 70 65 L 65 68" 
          stroke="#F8FAFC" 
          strokeWidth="3" 
          fill="none" 
          strokeLinecap="round"
        />
        
        {/* Hands forming dhyana mudra */}
        <ellipse cx="35" cy="68" rx="4" ry="3" fill="#F8FAFC" stroke="#D4AF37" strokeWidth="0.8"/>
        <ellipse cx="65" cy="68" rx="4" ry="3" fill="#F8FAFC" stroke="#D4AF37" strokeWidth="0.8"/>
        
        {/* Lotus petals beneath */}
        <path 
          d="M 50 85 L 45 78 L 40 80 L 38 86 L 42 88 Z" 
          fill="#D4AF37" 
          opacity="0.4"
        />
        <path 
          d="M 50 85 L 55 78 L 60 80 L 62 86 L 58 88 Z" 
          fill="#D4AF37" 
          opacity="0.4"
        />
        
        <defs>
          <radialGradient id="auraGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0"/>
          </radialGradient>
        </defs>
      </svg>
    );
  }

  // Icon variant = sadhu + subtle background
  if (variant === 'icon') {
    return (
      <div className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background circle */}
          <circle cx="50" cy="50" r="48" fill="rgba(212,175,55,0.08)" stroke="#D4AF37" strokeWidth="1"/>
          
          {/* Golden aura */}
          <circle cx="50" cy="35" r="24" fill="url(#iconAura)" opacity="0.4"/>
          
          {/* Head */}
          <circle cx="50" cy="35" r="11" fill="#F8FAFC" stroke="#D4AF37" strokeWidth="1.5"/>
          
          {/* Closed eyes */}
          <path d="M 45 34 Q 46.5 32.5 48 34" stroke="#1E293B" strokeWidth="1" fill="none" strokeLinecap="round"/>
          <path d="M 52 34 Q 53.5 32.5 55 34" stroke="#1E293B" strokeWidth="1" fill="none" strokeLinecap="round"/>
          
          {/* Tilak */}
          <circle cx="50" cy="30" r="1.2" fill="#DC2626"/>
          <path d="M 50 28 L 50 26" stroke="#DC2626" strokeWidth="0.8" strokeLinecap="round"/>
          
          {/* Flowing beard */}
          <path 
            d="M 43 42 Q 40 48 41 54 Q 43 60 46 63 L 50 65 L 54 63 Q 57 60 59 54 Q 60 48 57 42 Z" 
            fill="#F8FAFC" 
            stroke="#D4AF37" 
            strokeWidth="0.8"
            opacity="0.95"
          />
          
          {/* Body */}
          <ellipse cx="50" cy="58" rx="16" ry="12" fill="#F8FAFC" stroke="#D4AF37" strokeWidth="1"/>
          
          {/* Arms */}
          <path d="M 34 56 Q 31 58 32 62 L 36 65" stroke="#F8FAFC" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d="M 66 56 Q 69 58 68 62 L 64 65" stroke="#F8FAFC" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          
          {/* Hands */}
          <circle cx="36" cy="65" r="3" fill="#F8FAFC" stroke="#D4AF37" strokeWidth="0.6"/>
          <circle cx="64" cy="65" r="3" fill="#F8FAFC" stroke="#D4AF37" strokeWidth="0.6"/>
          
          {/* Small lotus */}
          <path d="M 42 75 L 50 72 L 58 75 L 56 78 L 50 80 L 44 78 Z" fill="#D4AF37" opacity="0.5"/>
          
          <defs>
            <radialGradient id="iconAura">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0"/>
            </radialGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // Full variant = logo + text
  return (
    <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: showText ? 12 : 0 }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer golden ring */}
        <circle cx="50" cy="50" r="47" stroke="url(#goldGradient)" strokeWidth="1.5" fill="none" opacity="0.6"/>
        
        {/* Inner glow */}
        <circle cx="50" cy="50" r="45" fill="url(#bgGradient)"/>
        
        {/* Radiating aura lines */}
        <path d="M 50 8 L 50 15" stroke="#D4AF37" strokeWidth="1" opacity="0.3"/>
        <path d="M 73 16 L 68 21" stroke="#D4AF37" strokeWidth="1" opacity="0.3"/>
        <path d="M 84 27 L 79 32" stroke="#D4AF37" strokeWidth="1" opacity="0.3"/>
        <path d="M 92 50 L 85 50" stroke="#D4AF37" strokeWidth="1" opacity="0.3"/>
        
        {/* Head with subtle shadow */}
        <ellipse cx="50" cy="36" rx="12" ry="13" fill="rgba(0,0,0,0.1)" transform="translate(1,1)"/>
        <circle cx="50" cy="35" r="12" fill="#F8FAFC" stroke="#D4AF37" strokeWidth="1.8"/>
        
        {/* Hair bun / topknot */}
        <circle cx="50" cy="24" r="4" fill="#F8FAFC" stroke="#D4AF37" strokeWidth="1"/>
        
        {/* Closed meditating eyes */}
        <path d="M 44 34 Q 46 32 48 34" stroke="#1E293B" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        <path d="M 52 34 Q 54 32 56 34" stroke="#1E293B" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        
        {/* Peaceful smile */}
        <path d="M 46 40 Q 50 42 54 40" stroke="#1E293B" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.6"/>
        
        {/* Sacred tilak (Tripundra) */}
        <circle cx="50" cy="29" r="1.5" fill="#DC2626"/>
        <path d="M 50 27 L 50 24" stroke="#DC2626" strokeWidth="1" strokeLinecap="round"/>
        
        {/* Long flowing white beard (layered for depth) */}
        <path 
          d="M 42 43 Q 38 52 40 60 Q 42 67 46 71 L 50 73 L 54 71 Q 58 67 60 60 Q 62 52 58 43 Z" 
          fill="rgba(248,250,252,0.3)" 
          stroke="none"
          transform="translate(2,2)"
        />
        <path 
          d="M 42 43 Q 38 52 40 60 Q 42 67 46 71 L 50 73 L 54 71 Q 58 67 60 60 Q 62 52 58 43 Z" 
          fill="#F8FAFC" 
          stroke="#D4AF37" 
          strokeWidth="1"
        />
        {/* Beard texture lines */}
        <path d="M 46 50 Q 48 55 50 60" stroke="#CBD5E1" strokeWidth="0.5" opacity="0.4"/>
        <path d="M 54 50 Q 52 55 50 60" stroke="#CBD5E1" strokeWidth="0.5" opacity="0.4"/>
        
        {/* White dhoti body */}
        <ellipse cx="50" cy="62" rx="19" ry="15" fill="#F8FAFC" stroke="#D4AF37" strokeWidth="1.5"/>
        
        {/* Sacred thread (Yajnopavita) */}
        <path d="M 43 48 Q 48 52 53 48" stroke="#D4AF37" strokeWidth="0.8" fill="none" opacity="0.7"/>
        
        {/* Arms forming dhyana mudra (meditation hand position) */}
        <path 
          d="M 31 58 Q 27 60 28 65 L 34 70" 
          stroke="#F8FAFC" 
          strokeWidth="3.5" 
          fill="none" 
          strokeLinecap="round"
        />
        <path 
          d="M 69 58 Q 73 60 72 65 L 66 70" 
          stroke="#F8FAFC" 
          strokeWidth="3.5" 
          fill="none" 
          strokeLinecap="round"
        />
        
        {/* Hands in meditation mudra */}
        <ellipse cx="34" cy="70" rx="4.5" ry="3.5" fill="#F8FAFC" stroke="#D4AF37" strokeWidth="1"/>
        <ellipse cx="66" cy="70" rx="4.5" ry="3.5" fill="#F8FAFC" stroke="#D4AF37" strokeWidth="1"/>
        
        {/* Lotus seat */}
        <ellipse cx="50" cy="82" rx="22" ry="6" fill="url(#lotusGradient)" opacity="0.6"/>
        
        {/* Lotus petals */}
        <path d="M 50 86 L 44 78 L 38 80 L 36 86 L 40 88 Z" fill="#D4AF37" opacity="0.5"/>
        <path d="M 50 86 L 48 78 L 44 77 L 40 83 L 44 86 Z" fill="#D4AF37" opacity="0.4"/>
        <path d="M 50 86 L 56 78 L 62 80 L 64 86 L 60 88 Z" fill="#D4AF37" opacity="0.5"/>
        <path d="M 50 86 L 52 78 L 56 77 L 60 83 L 56 86 Z" fill="#D4AF37" opacity="0.4"/>
        
        {/* Center lotus */}
        <circle cx="50" cy="85" r="3" fill="#D4AF37"/>
        <circle cx="50" cy="85" r="1.5" fill="#FFF"/>
        
        <defs>
          <radialGradient id="bgGradient" cx="50%" cy="30%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="rgba(212,175,55,0)" stopOpacity="0"/>
          </radialGradient>
          
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A88B20"/>
            <stop offset="50%" stopColor="#D4AF37"/>
            <stop offset="100%" stopColor="#8B5CF6"/>
          </linearGradient>
          
          <linearGradient id="lotusGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.3"/>
            <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.3"/>
          </linearGradient>
        </defs>
      </svg>
      
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: size * 0.32,
            fontWeight: 700,
            color: '#D4AF37',
            letterSpacing: '0.08em',
            lineHeight: 1,
          }}>
            RISHI
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: size * 0.16,
            color: '#475569',
            letterSpacing: '0.12em',
            lineHeight: 1,
          }}>
            TERMINAL
          </div>
        </div>
      )}
    </div>
  );
}