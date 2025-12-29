import './globals.css';
import { AuthProvider } from '../lib/auth';

export const metadata = {
  title: 'Seasonality Analysis Dashboard',
  description: 'Modern seasonality analysis platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}