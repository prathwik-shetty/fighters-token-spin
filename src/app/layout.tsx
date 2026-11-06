import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fighters Token Spin | Provably Fair Casino Draw",
  description:
    "Provably fair, cryptographic token spinning and winner selection arena with CSPRNG and real-time live sync.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#07070d] text-slate-100">
        {children}
      </body>
    </html>
  );
}
