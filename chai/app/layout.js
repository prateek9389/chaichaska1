import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";

export const metadata = {
  title: "Chai Chuska — Premium Chai Delivered Fresh",
  description: "Corporate chai delivery service — order fresh, customised chai delivered to your desk.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
