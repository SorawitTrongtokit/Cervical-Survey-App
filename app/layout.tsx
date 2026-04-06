import type { Metadata } from "next";
import { Prompt, Sarabun } from "next/font/google";

import "./globals.css";

const headingFont = Prompt({
  subsets: ["latin", "thai"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
});

const bodyFont = Sarabun({
  subsets: ["latin", "thai"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  description:
    "ระบบสำรวจความต้องการตรวจมะเร็งปากมดลูกด้วยตัวเองสำหรับการใช้งานภายในองค์กร",
  title: "สำรวจความต้องการตรวจมะเร็งปากมดลูก",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${headingFont.variable} ${bodyFont.variable} min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
