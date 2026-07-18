// Shared brand mark. "horizontal" (badge beside wordmark) fits nav bars;
// "stacked" (badge centered above wordmark) fits footers, auth screens,
// and anywhere with vertical room. Both use the same badge SVG so the
// mark itself never drifts out of sync between layouts.
type LogoProps = {
  variant?: 'horizontal' | 'stacked';
  className?: string;
};

function Badge({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sammystore-badge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#sammystore-badge-grad)" />
      <circle cx="60" cy="60" r="58" fill="none" stroke="white" strokeWidth="2" opacity="0.25" />
      <text x="60" y="80" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="64" fill="white" textAnchor="middle">
        S
      </text>
      <circle cx="100" cy="98" r="16" fill="#1f2937" />
      <path d="M 92 98 L 98 104 L 109 91" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ variant = 'horizontal', className = '' }: LogoProps) {
  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <Badge size={64} />
        <span className="mt-2 text-2xl font-extrabold">
          <span className="text-gray-800">Sammy</span>
          <span className="text-[#f97316]">Store</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge size={36} />
      <span className="hidden sm:inline text-2xl font-bold">
        <span className="text-gray-800">SAMMY</span>
        <span className="text-[#f97316]">STORE</span>
      </span>
    </div>
  );
}
