import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-white/60">
        The paper or page you're looking for doesn't exist.
      </p>
      <Link href="/" className="mt-4 inline-block text-accent-400 hover:text-accent-300">
        ← Back to feed
      </Link>
    </div>
  );
}
