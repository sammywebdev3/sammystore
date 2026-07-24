UX sweep: expired sessions, 404 page, crash page
====================================================

FINDING #1 - Expired/invalid sessions were silently broken on 7 of 9
protected pages (dashboard, orders, history, fund, referrals, smm,
numbers all lacked any 401 handling - only settings and cart had it).
A user whose login token expired would just see broken/empty pages with
no explanation, instead of being sent back to log in.

Fixed globally instead of patching each page separately:
New:     components/SessionGuard.tsx  (patches window.fetch ONCE, checks
                                        every authenticated request for a
                                        401, redirects to /login?expired=1)
Updated: app/layout.tsx               (renders SessionGuard globally)
Updated: app/login/page.tsx           (shows "Your session expired -
                                        please log in again" when
                                        redirected here)

This only triggers for requests that were already sending a Bearer
token - it deliberately does NOT trigger on the login/register forms'
own fetch calls, so a wrong password still just shows a normal error,
not a forced redirect.

FINDING #2 - No custom 404 or crash page.
Any mistyped URL, or any unexpected bug that crashes rendering, showed
Next.js's bare default page with no branding and no way back to the site.
New: app/not-found.tsx    (styled 404 page with a link back home)
New: app/global-error.tsx (styled crash page with Try Again / Back Home)

HOW TO USE:
1. Upload to repo root in Codespace.
2. unzip -o ux-session-error-pages.zip -d .
   rm ux-session-error-pages.zip
3. npm run dev - test: visit a random nonsense URL (should show the new
   404 page, not Next's default). To test session expiry, manually edit
   localStorage's "token" value to garbage in devtools, then navigate to
   /dashboard - should redirect to /login with the expired message.
4. git add -A
   git commit -m "Add global session-expiry handling, custom 404 and error pages"
   git push
