import Header from "@/components/Header";

export default function FrontendLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <div className="w-full h-full flex-1 flex">{children}</div>
    </>
  );
}
