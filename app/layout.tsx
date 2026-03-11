import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GuardProvider } from "@/providers/guard";
import { Toaster } from "sonner";
import { WarningMainCard } from "@/components/warningMainCard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ETX GESTÃO - Inteligência em Conformidade Operacional",
  description: "Plataforma avançada para gestão de funcionários, treinamentos e conformidade documental. Segurança e eficiência para sua operação.",
  keywords: ["gestão de funcionários", "conformidade operacional", "passaporte de segurança", "treinamentos NR", "gestão de documentos"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GuardProvider>
          <Toaster richColors theme="light" />
          {children}
        </GuardProvider>
      </body>
    </html>
  );
}
