import { Analytics } from "@/components/analytics";
import { LanguageProvider } from "@/context/language";
import { SessionProvider } from "@/context/session";
import { ThemeProvider } from "@/context/theme";
import { queryClient } from "@/lib/query-client";
import "@/styles/styles.css";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "MANA" },
    ],
    links: [
      {
        rel: "icon",
        type: "image/png",
        href: "/logo/favicon-32.png",
        sizes: "32x32",
      },
      {
        rel: "icon",
        type: "image/png",
        href: "/logo/favicon-16.png",
        sizes: "16x16",
      },
    ],
    scripts: [
      {
        // Prerendered HTML carries no theme class — apply it before first paint to avoid a flash.
        // Must mirror applyTheme in @/context/theme (storage key 'theme', default auto).
        // Guest/client-facing pages (/view/*) always force light, regardless of stored theme.
        children: `try{var r=document.documentElement;if(location.pathname.indexOf('/view/')===0){r.dataset.theme='light'}else{var t=localStorage.getItem('theme');var v=t==='light'?'light':t==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):'dark';r.dataset.theme=v;r.classList.toggle('dark',v==='dark')}}catch(e){document.documentElement.dataset.theme='dark';document.documentElement.classList.add('dark')}`,
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    // the pre-paint theme script mutates <html> before hydration; the mismatch is intentional
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <LanguageProvider>
              <SessionProvider>
                <Analytics />
                {/* No background here — body already paints --background, and a
                    background on this positioned wrapper would cover the app
                    shell's -z-10 safe-area backdrop. */}
                {/* dvh, not vh: vh is the large viewport, so on mobile this
                    wrapper stayed taller than the visible area and every screen
                    could be dragged by the URL-bar height. */}
                <div className="min-h-dvh relative">
                  <Outlet />
                </div>
              </SessionProvider>
            </LanguageProvider>
          </ThemeProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
