Admin Sidebar Navigation Update
================================

Contents:
  components/AdminSidebar.tsx  -> new file
  app/admin/layout.tsx          -> new file
  app/admin/page.tsx            -> replaces your existing file (top nav row removed, now lives in the sidebar)

HOW TO USE IN CODESPACES:

1. Upload this zip (admin-sidebar-update.zip) into the ROOT of your repo in the
   Codespace file explorer (same level as package.json).

2. In the Codespace terminal, run:

     unzip -o admin-sidebar-update.zip -d . && rm admin-sidebar-update.zip

   This overwrites app/admin/page.tsx and adds the two new files in place.

3. Commit and push:

     git add components/AdminSidebar.tsx app/admin/layout.tsx app/admin/page.tsx
     git commit -m "Add responsive sidebar nav to admin panel"
     git push

4. Restart the dev server if it's running (npm run dev) to see the change.
