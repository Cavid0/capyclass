import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "ClassFlow Repo — Interaktiv Təhsil Platforması",
  description:
    "Müəllimlər üçün sinif yaratma, tələbələr üçün izolasiya olunmuş kod mühiti və AI dəstəkli kod analizi platforması.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az">
      <body className="gradient-bg grid-pattern">
        <Providers>{children}</Providers>
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
