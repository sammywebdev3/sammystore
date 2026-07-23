Dashboard Sidebar - Mobile Support
====================================
New:      lib/sidebarContext.tsx
Updated:  components/Sidebar.tsx   (adds mobile slide-in drawer)
Updated:  components/Navbar.tsx    (adds hamburger button, mobile only)
Updated:  app/layout.tsx           (wraps app in SidebarProvider)

This affects all 14 pages that already use <Navbar /> + <Sidebar />
(dashboard, catalog, fund, orders, settings, cart, etc.) automatically -
no per-page edits needed. Desktop layout is unchanged.

HOW TO USE:
1. Upload dashboard-sidebar-mobile.zip into the ROOT of your repo in Codespace.
2. Run:
     unzip -o dashboard-sidebar-mobile.zip -d . && rm dashboard-sidebar-mobile.zip
3. Review with:
     npm run dev
4. Commit just these files:
     git add lib/sidebarContext.tsx components/Sidebar.tsx components/Navbar.tsx app/layout.tsx
     git commit -m "Add mobile sidebar drawer to dashboard pages"
     git push
