import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { PortalShell } from "@/components/layout/portal-shell";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "PartsArc Supplier Portal",
  description:
    "PartsArc supplier workspace for listings, requests, quotations, orders and commission credits.",
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('supplier-theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <PortalShell>{children}</PortalShell>
            <Toaster position="bottom-right" richColors closeButton />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
