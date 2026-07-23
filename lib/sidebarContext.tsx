'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer automatically whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  // Falls back to local-only state if a page ever renders Sidebar/Navbar
  // outside the provider, so nothing crashes - it just won't be shared.
  const [localOpen, setLocalOpen] = useState(false);
  if (!ctx) return { open: localOpen, setOpen: setLocalOpen };
  return ctx;
}
