import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_guest")({
  component: GuestLayout,
});

function GuestLayout() {
  useEffect(() => {
    const root = document.documentElement;
    const prevTheme = root.dataset.theme;
    root.dataset.theme = "light";
    return () => {
      if (prevTheme === undefined) delete root.dataset.theme;
      else root.dataset.theme = prevTheme;
    };
  }, []);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-surface-page">
        <Outlet />
        <Toaster
          position="top-center"
          style={{ fontFamily: "var(--font-sans-stack)" }}
        />
      </div>
    </TooltipProvider>
  );
}
