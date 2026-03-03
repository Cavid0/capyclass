import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "CapyClass — Interactive Learning Platform",
  description:
    "CapyClass — a platform for teachers to create classrooms, students to code in isolated environments, and get AI-powered code analysis.",
  keywords: ["CapyClass", "capyclass", "capy", "interactive learning", "code environment", "AI code analysis", "classroom platform", "online classroom"],
  metadataBase: new URL("https://capyclass.com"),
  alternates: {
    canonical: "https://capyclass.com",
  },
  openGraph: {
    title: "CapyClass — Interactive Learning Platform",
    description: "CapyClass — a platform for teachers to create classrooms, students to code in isolated environments, and get AI-powered code analysis.",
    url: "https://capyclass.com",
    siteName: "CapyClass",
    images: [
      {
        url: "/capybara.png",
        width: 512,
        height: 512,
        alt: "CapyClass",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "CapyClass — Interactive Learning Platform",
    description: "CapyClass — a platform for teachers to create classrooms, students to code in isolated environments, and get AI-powered code analysis.",
    images: ["/capybara.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" sizes="256x256" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body className="gradient-bg grid-pattern">
        <Providers>{children}</Providers>
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
