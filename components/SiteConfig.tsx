"use client";
import { createContext, useContext } from "react";
import { defaultSite, type SiteFields } from "@/lib/site-default";
const SiteContext = createContext<SiteFields>(defaultSite);
export const useSiteConfig = () => useContext(SiteContext);
export default function SiteConfig({
  value,
  children,
}: {
  value: SiteFields;
  children: React.ReactNode;
}) {
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}
