import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VS Gaming Arena | Play. Compete. Dominate.',
  description: 'Book your PS5 gaming session at VS Gaming Arena.',
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
