/**
 * frontend 子路由布局（已废弃，根 layout 已包含完整布局）
 * 保留此文件仅为兼容旧路径，重定向后不会实际渲染
 */
export default function FrontendLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
