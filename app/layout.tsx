import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PropManage — Landlord finance & property management",
  description:
    "Track rental income and expenses, monitor arrears, store compliance documents, estimate tax (SA105) and stay MTD-ready. Built for UK landlords.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
