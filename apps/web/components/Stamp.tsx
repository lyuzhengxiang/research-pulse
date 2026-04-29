type StampColor = 'red' | 'blue' | 'brown';

const COLOR: Record<StampColor, string> = {
  red: '#b1342a',
  blue: '#214a8a',
  brown: '#5a4220',
};

export function Stamp({
  children,
  color = 'red',
  onRemove,
  sub,
}: {
  children: React.ReactNode;
  color?: StampColor;
  onRemove?: () => void;
  sub?: string;
}) {
  const c = COLOR[color];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-meta tracking-[0.05em]"
      style={{ border: `1px solid ${c}`, color: c, borderRadius: 1 }}
    >
      <span aria-hidden>·</span>
      <span>{children}</span>
      {sub && <span className="ml-1 text-ink-mute" style={{ fontSize: 12 }}>{sub}</span>}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="ml-1.5 text-ink-mute transition hover:text-almanac-red"
          style={{ opacity: 0.7 }}
        >
          ×
        </button>
      )}
    </span>
  );
}
