import type { Metadata } from "next";
import Image from "next/image";
import Markdown from "@/components/Markdown";
import { aboutForPage } from "@/lib/about";
import { extractDescription } from "@/lib/seo";
import styles from "./about.module.css";
import { siteForPage } from '@/lib/site-settings';

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const about = await aboutForPage();
  return {
    title: about.title,
    description: about.subtitle || extractDescription(about.content),
    alternates: { canonical: "/about" },
  };
}

export default async function About() {
  const about = await aboutForPage();
  const site = await siteForPage();
  return (
    <div className="w-full py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-12">
          <Image
            src={site.avatar}
            alt={site.author + '的头像'}
            unoptimized
            width={112}
            height={112}
            priority
            className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover mx-auto mb-6 ring-4 ring-white shadow-lg dark:ring-white/10"
          />
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
            <span className="bg-gradient-to-r from-cyan-500 to-violet-500 bg-clip-text text-transparent">
              {about.title}
            </span>
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-white/50">
            {about.subtitle}
          </p>
        </header>
        <div className="p-8 md:p-10">
          <div className={styles.copy}>
            <Markdown source={about.content} />
          </div>
        </div>
      </div>
    </div>
  );
}
