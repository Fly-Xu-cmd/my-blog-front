import Header from "@/components/Header";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import Footer from "@/components/Footer";

export default function FrontendLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="w-full flex flex-col min-h-screen">
      <AnalyticsTracker />
      <Header />
      <div className="w-full flex flex-1">{children}</div>
      <Footer />
    </div>
  );
}
