import Link from 'next/link';

// Next.js renders this automatically for any URL that doesn't match a
// real route (mistyped links, old bookmarks, typo'd domains landing on
// a real path that doesn't exist, etc.) - without this file, Next.js
// shows its own bare, unbranded default 404 page instead.
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <p className="text-6xl font-extrabold text-[#f97316] mb-2">404</p>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Page not found</h1>
        <p className="text-gray-500 text-sm mb-6">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link href="/" className="btn-primary inline-block px-6 py-3">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
