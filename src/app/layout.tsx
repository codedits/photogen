import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import type { CSSProperties } from "react";
import "./globals.css";
import Nav from "../components/Nav";
import LazyChatWidget from "../components/LazyChatWidget";
import Footer from "../components/Footer";
import VercelAnalytics from "../components/VercelAnalytics";
import { ensurePresetIndexes } from "../lib/mongodb";
import { ThemeProvider } from "../components/ThemeProvider";
import CustomCursor from "../components/CustomCursor";
import { getStoreConfig, getThemeCookieBootstrapScript, toThemeCssVariables } from "@/services/config";
import { Providers } from "../components/Providers";


const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PhotoGen",
  description: "The Magician",
  metadataBase: new URL("https://photogen2.vercel.app"),
  openGraph: {
    title: "PhotoGen",
    description: "The Magician",
    images: [
      {
        url: "/1.png",
        alt: "PhotoGen",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "PhotoGen",
    description: "The Magician",
    images: ["/1.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getStoreConfig();
  const rootThemeStyle = toThemeCssVariables(config.theme) as CSSProperties;

  // Warm DB indexes / connection in the background during initial render.
  // We don't await aggressively to avoid slowing SSR; this kicks off the promise.
  try {
    ensurePresetIndexes().catch(() => { });
  } catch { }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${geistMono.variable}`}
      style={rootThemeStyle}
    >
      <head>
        <link rel="icon" href="/gen.svg" />
        {/* Preconnect to Cloudinary to improve image fetch latency */}
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        {/* Cookie-mirrored token override to apply fresh admin theme values before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: getThemeCookieBootstrapScript(),
          }}
        />
        {/* Inline script to apply theme BEFORE first paint — eliminates light-mode flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.add('light')}else{document.documentElement.classList.remove('light')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
            <CustomCursor />
            <Nav />
            {children}
            <LazyChatWidget />
            <Footer />
            <VercelAnalytics />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
