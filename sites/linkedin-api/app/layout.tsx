import "./globals.css";

export const metadata: import("next").Metadata = {
  title: "LinkedIn API",
  description: "Deine eigene LinkedIn-Verbindung für ChatGPT.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}
