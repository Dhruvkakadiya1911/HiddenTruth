import './globals.css';
import { PlayerProvider } from '@/context/PlayerContext';
import Navbar from '@/components/Navbar';
import ScrollToTop from '@/components/ScrollToTop';

export const metadata = {
  title: 'HiddenTruth — AI Murder Mystery',
  description: 'Nothing is what it seems. A live AI-narrated social deduction game. One room, one killer, pure chaos.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#050507',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PlayerProvider>
          <ScrollToTop />
          <Navbar />
          {children}
        </PlayerProvider>
      </body>
    </html>
  );
}

