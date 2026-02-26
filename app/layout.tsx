import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Venice Model Arcade 🎮',
  description: 'Gamified AI model testing - head-to-head battles with voting and leaderboards',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="text-white scanlines">
        {children}
      </body>
    </html>
  );
}
