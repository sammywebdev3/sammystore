'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Patches window.fetch ONCE, globally, so that if a user's session token
// has expired or become invalid mid-use, EVERY page automatically sends
// them back to login with a clear reason - instead of each page having
// to remember to check for 401 itself (most didn't, which is exactly why
// this exists: dashboard, orders, history, fund, referrals, smm, and
// numbers were all silently showing broken/empty data on an expired
// session with no explanation to the user).
//
// Only triggers for requests that were ALREADY sending a Bearer token
// (i.e. an authenticated request that got rejected) - this deliberately
// excludes the login/register forms' own fetch calls, since a wrong
// password there is an expected 401, not an expired session, and
// shouldn't force a redirect that would wipe out the error message the
// login page is trying to show.
export default function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if ((window as any).__sessionGuardInstalled) return;
    (window as any).__sessionGuardInstalled = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);

      if (response.status === 401) {
        const [, init] = args;
        const headers = init?.headers;
        const hasBearerToken =
          headers instanceof Headers
            ? !!headers.get('Authorization')
            : !!(headers as Record<string, string> | undefined)?.['Authorization'];

        const onAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';

        if (hasBearerToken && !onAuthPage) {
          localStorage.removeItem('token');
          window.location.href = '/login?expired=1';
        }
      }

      return response;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
