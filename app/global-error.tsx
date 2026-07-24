'use client';

// Catches any otherwise-uncaught rendering error anywhere in the app.
// Without this, an unexpected bug shows Next.js's raw "Application error:
// a client-side exception has occurred" message with no way back to the
// site - this gives real users a branded page and a way out instead.
//
// This file MUST render its own <html>/<body> - it replaces the root
// layout entirely when it triggers, since the layout itself may be part
// of what crashed.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#f9fafb',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '24rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              We hit an unexpected error. You can try again, or head back to the homepage.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => reset()}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  background: 'linear-gradient(to right, #fb923c, #ea580c)',
                  color: '#000',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
              <a
                href="/"
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: '2px solid #f97316',
                  color: '#f97316',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
