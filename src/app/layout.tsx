import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "CapyClass — Interaktiv Təhsil Platforması",
  description:
    "CapyClass — müəllimlər üçün sinif yaratma, tələbələr üçün izolasiya olunmuş kod mühiti və AI dəstəkli kod analizi platforması.",
  keywords: ["CapyClass", "capyclass", "capy", "interaktiv təhsil", "kod mühiti", "AI kod analizi", "sinif platforması", "online sinif"],
  metadataBase: new URL("https://capyclass.com"),
  alternates: {
    canonical: "https://capyclass.com",
  },
  openGraph: {
    title: "CapyClass — Interaktiv Təhsil Platforması",
    description: "CapyClass — müəllimlər üçün sinif yaratma, tələbələr üçün izolasiya olunmuş kod mühiti və AI dəstəkli kod analizi platforması.",
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
    locale: "az_AZ",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "CapyClass — Interaktiv Təhsil Platforması",
    description: "CapyClass — müəllimlər üçün sinif yaratma, tələbələr üçün izolasiya olunmuş kod mühiti və AI dəstəkli kod analizi platforması.",
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
    <html lang="az">
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
