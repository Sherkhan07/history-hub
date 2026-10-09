import type { Metadata, Viewport } from "next";
import { Inter, Onest } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/provider";
import { getDictionary, getLocale } from "@/i18n";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic", "cyrillic-ext"], display: "swap" });
const onest = Onest({ variable: "--font-onest", subsets: ["latin", "cyrillic", "cyrillic-ext"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "History Hub", template: "%s · History Hub" },
  description: "5–11-сынып мұғалімдеріне арналған Қазақстан тарихы мен Дүниежүзі тарихының дайын сабақтары",
};

export const viewport: Viewport = { themeColor: "#1f5fa0" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <html lang={locale} className={`${inter.variable} ${onest.variable} h-full antialiased`}>
      <body className="min-h-full">
        <I18nProvider dict={dict} locale={locale}>
          <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
          <Toaster position="top-center" richColors closeButton />
        </I18nProvider>
      </body>
    </html>
  );
}
