import { ReactNode } from "react";

/**
 * 所有动态展示页面布局
 */
export default async function AllStatusLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative w-full p-6">
      <div className="max-w-4xl mx-auto">{children}</div>
    </div>
  );
}
