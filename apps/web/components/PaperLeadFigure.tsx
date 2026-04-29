export function PaperLeadFigure({
  arxivId,
  url,
  size = 130,
  caption = 'FIG. 1',
}: {
  arxivId: string;
  url?: string | null;
  size?: number;
  caption?: string;
}) {
  if (url) {
    return (
      <figure
        className="m-0 shrink-0 border border-ink-rule bg-paper-2"
        style={{ width: size, height: size }}
      >
        <img
          src={url}
          alt={`Figure from ${arxivId}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            // Match the broadsheet's print aesthetic: desaturate + slight contrast
            filter: 'grayscale(0.15) contrast(1.05)',
          }}
        />
      </figure>
    );
  }

  return (
    <div
      className="ph-stripe relative shrink-0 border border-ink-rule bg-paper-2"
      style={{ width: size, height: size }}
      aria-label={`No figure available for ${arxivId}`}
    >
      <div className="absolute inset-0 flex items-center justify-center p-1.5 text-center font-mono text-ticker text-ink-mute">
        {caption}
      </div>
    </div>
  );
}
