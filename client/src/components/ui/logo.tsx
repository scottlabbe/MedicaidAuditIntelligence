export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg 
      width="32" 
      height="32" 
      viewBox="0 0 32 32" 
      fill="none"
      xmlns="http://www.w3.org/2000/svg" 
      role="img" 
      aria-label="Report logo"
      className={className}
    >
      {/* Document outline with folded corner */}
      <path 
        d="M8 4h11l7 7v15c0 1.105-.895 2-2 2H8c-1.105 0-2-.895-2-2V6c0-1.105.895-2 2-2Z"
        stroke="#EA580C" 
        strokeWidth="2" 
        strokeLinejoin="round"
      />
      <path 
        d="M19 4v7h7" 
        stroke="#EA580C" 
        strokeWidth="2" 
        strokeLinejoin="round"
      />
      {/* Text lines */}
      <path 
        d="M10 16h12M10 20h12M10 24h8"
        stroke="#EA580C" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
    </svg>
  );
}