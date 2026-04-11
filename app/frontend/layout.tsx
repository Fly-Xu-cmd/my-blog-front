import Header from "@/components/Header";

export default function FrontendLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="w-full flex flex-col">
      <Header />
      <div className="w-full flex">{children}</div>
    </div>
  );
}
