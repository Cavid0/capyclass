import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "CapyClass — Interactive Coding Classroom Platform",
    template: "%s | CapyClass",
  },
  description:
    "CapyClass is the interactive coding classroom platform where teachers create classrooms, assign coding tasks, and students write & run code in real-time with AI-powered analysis. Free online code editor for education.",
  keywords: [
    "CapyClass", "capyclass", "capy class", "capy", "capyclass.com",
    "interactive coding platform", "online code editor", "classroom coding",
    "coding education", "learn programming", "code environment",
    "AI code analysis", "classroom platform", "online classroom",
    "programming education", "coding tasks", "student coding",
    "teacher coding platform", "Monaco editor", "real-time coding",
    "free coding platform", "education technology", "edtech",
  ],
  metadataBase: new URL("https://capyclass.com"),
  alternates: {
    canonical: "https://capyclass.com",
  },
  openGraph: {
    title: "CapyClass — Interactive Coding Classroom Platform",
    description: "Create classrooms, assign coding tasks, and let students write & run code in real-time. Free interactive coding platform for education.",
    url: "https://capyclass.com",
    siteName: "CapyClass",
    images: [
      {
        url: "/capybara.png",
        width: 512,
        height: 512,
        alt: "CapyClass - Interactive Coding Classroom Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CapyClass — Interactive Coding Classroom Platform",
    description: "Create classrooms, assign coding tasks, and let students write & run code in real-time. Free interactive coding platform for education.",
    images: ["/capybara.png"],
    creator: "@capyclass",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  verification: {
    // Add Google Search Console verification when available
    // google: "your-verification-code",
  },
  category: "education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" sizes="256x256" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body className="gradient-bg grid-pattern">
        <Providers>{children}</Providers>
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "glass-card border border-white/10 text-white shadow-2xl",
              title: "text-sm font-medium text-white",
              description: "text-xs text-[var(--text-secondary)]",
              actionButton: "!bg-white !text-black hover:!bg-white/90",
              cancelButton: "!bg-white/10 !text-white hover:!bg-white/20",
            },
          }}
        />
      </body>
    </html>
  );
}
