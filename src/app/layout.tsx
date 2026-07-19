import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'CarFinder KZ — Мониторинг цен на авто до 10 млн ₸',
  description:
    'Дэшборд для выбора первого автомобиля в Казахстане. 10 лучших машин до 10 миллионов тенге с ежедневным мониторингом цен на Kolesa.kz и Mycar.kz.',
  keywords: [
    'купить авто Казахстан',
    'первая машина',
    'авто до 10 миллионов',
    'kolesa.kz',
    'mycar.kz',
    'мониторинг цен авто',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
