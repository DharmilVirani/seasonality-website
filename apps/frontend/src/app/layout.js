import './globals.css';
import { AuthProvider } from '../lib/auth';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

export const metadata = {
  title: 'Seasonality Analysis Dashboard',
  description: 'Modern seasonality analysis platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Container fluid className="p-0">
            {children}
          </Container>
        </AuthProvider>
      </body>
    </html>
  );
}