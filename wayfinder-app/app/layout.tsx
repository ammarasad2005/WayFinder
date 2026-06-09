import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Wayfinder — Search with Google. Travel with Yango.",
  description:
    "Wayfinder uses Google Maps intelligence to help you find, verify, and navigate to any destination in Pakistan — then seamlessly hands off to Yango for your ride.",
  keywords: ["Yango", "Google Maps", "Pakistan", "ride hailing", "destination search", "Islamabad"],
  authors: [{ name: "Wayfinder" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Wayfinder — Search with Google. Travel with Yango.",
    description: "Find any destination with Google Maps intelligence. Book your ride with Yango.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#090B12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
