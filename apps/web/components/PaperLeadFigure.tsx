export function PaperLeadFigure({
  arxivId,
  size = 130,
  caption = 'FIG. 1 · arch. diagram',
}: {
  arxivId: string;
  size?: number;
  caption?: string;
}) {
  return (
    <div
      className="ph-stripe relative shrink-0 border border-ink-rule bg-paper-2"
      style={{ width: size, height: size }}
      aria-label={`Figure for ${arxivId}`}
    >
      <div className="absolute inset-0 flex items-center justify-center p-1.5 text-center font-mono text-ticker text-ink-mute">
        {caption}
      </div>
    </div>
  );
}
