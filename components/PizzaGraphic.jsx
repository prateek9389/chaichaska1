export default function PizzaGraphic({ size = 320, className = "", toppingSeed = 0 }) {
  const toppings = [
    { x: 0.28, y: 0.32, r: 0.05, fill: "#b3232f" }, // pepperoni
    { x: 0.62, y: 0.24, r: 0.045, fill: "#b3232f" },
    { x: 0.72, y: 0.55, r: 0.05, fill: "#b3232f" },
    { x: 0.4, y: 0.66, r: 0.045, fill: "#b3232f" },
    { x: 0.5, y: 0.45, r: 0.055, fill: "#b3232f" },
    { x: 0.34, y: 0.52, r: 0.03, fill: "#4c6b3a" }, // basil
    { x: 0.6, y: 0.62, r: 0.028, fill: "#4c6b3a" },
    { x: 0.68, y: 0.36, r: 0.026, fill: "#4c6b3a" },
    { x: 0.45, y: 0.28, r: 0.022, fill: "#2b2422" }, // olive
    { x: 0.3, y: 0.6, r: 0.022, fill: "#2b2422" },
    { x: 0.58, y: 0.48, r: 0.02, fill: "#2b2422" },
  ];

  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      className={className}
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id={`crust-${toppingSeed}`} cx="50%" cy="45%" r="60%">
          <stop offset="72%" stopColor="#e8a23c" />
          <stop offset="100%" stopColor="#c97a1f" />
        </radialGradient>
        <radialGradient id={`cheese-${toppingSeed}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#f6d675" />
          <stop offset="100%" stopColor="#eab84a" />
        </radialGradient>
      </defs>

      <circle cx="150" cy="150" r="148" fill={`url(#crust-${toppingSeed})`} />
      <circle cx="150" cy="150" r="128" fill={`url(#cheese-${toppingSeed})`} />

      {/* sauce texture speckles */}
      {Array.from({ length: 18 }).map((_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const r = 60 + (i % 3) * 18;
        const cx = 150 + Math.cos(angle) * r;
        const cy = 150 + Math.sin(angle) * r;
        return <circle key={i} cx={cx} cy={cy} r="2.4" fill="#d98a2f" opacity="0.45" />;
      })}

      {toppings.map((t, i) => (
        <circle
          key={i}
          cx={t.x * 300}
          cy={t.y * 300}
          r={t.r * 300}
          fill={t.fill}
          stroke="rgba(0,0,0,0.08)"
        />
      ))}

      <circle cx="150" cy="150" r="148" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="2" />
    </svg>
  );
}
