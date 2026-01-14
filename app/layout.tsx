import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DB Truth Auditor",
  description: "Production-ready database integrity auditing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-black text-white min-h-screen">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="bg-video"
        >
          <source src="/background.mp4" type="video/mp4" />
        </video>
        <div id="root" className="relative z-10 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
