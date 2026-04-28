import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="px-9 py-20 text-center">
      <div className="font-mono text-ticker uppercase tracking-kicker text-almanac-red">
        Errata · Page Not Found
      </div>
      <h1 className="mt-2 font-serif text-page-title font-bold tracking-lead">
        The Editor regrets.
      </h1>
      <p className="mx-auto mt-3 max-w-md font-serif italic text-[15px] text-ink-mute">
        The page you sought is not in this issue. It may have been pulled at proof, filed under a different number, or never set in type.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block font-mono text-meta uppercase tracking-[0.2em]"
        style={{
          background: '#1f1a14',
          color: '#f1ece1',
          padding: '8px 22px',
          borderRadius: 0,
        }}
      >
        Return to the Front Page ▶
      </Link>
    </div>
  );
}
