import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "../components/Nav";
import LazyChatWidget from "../components/LazyChatWidget";
import Footer from "../components/Footer";
import VercelAnalytics from "../components/VercelAnalytics";
import { ensurePresetIndexes } from "../lib/mongodb";
import { ThemeProvider } from "../components/ThemeProvider";
import CustomCursor from "../components/CustomCursor";


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
  // Warm DB indexes / connection in the background during initial render.
  // We don't await aggressively to avoid slowing SSR; this kicks off the promise.
  try {
    ensurePresetIndexes().catch(() => { });
  } catch { }

  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="icon" href="/gen.svg" />
        {/* Preconnect to Cloudinary to improve image fetch latency */}
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        {/* Inline script to apply dark class BEFORE first paint — eliminates FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <CustomCursor />
          <Nav />
          {children}
          <LazyChatWidget />
          <Footer />
          <VercelAnalytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
