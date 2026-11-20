import Link from "next/link";
import { FeaturedArticle } from "./ContentEntries";
import { publicReading } from "@/lib/reading-entry";
export default async function ReadingEntry() {
  let reading;
  try {
    reading = await publicReading();
  } catch {
    return (
      <p className="editorial-error" role="alert">
        精选阅读暂不可用，仍可浏览下方最新内容。
      </p>
    );
  }
  if (!reading.featured && !reading.starts.length && !reading.series.length)
    return null;
  return (
    <section
      className="editorial-home-section"
      aria-labelledby="reading-entry-title"
    >
      <div className="editorial-section-head">
        <h2 id="reading-entry-title">从这里开始</h2>
        <span className="editorial-eyebrow">留给第一次来的你</span>
      </div>
      {reading.featured && (
        <FeaturedArticle
          item={JSON.parse(JSON.stringify(reading.featured))}
          headingLevel={3}
          showSeries={false}
        />
      )}
      <div className="reading-entry-columns">
        {!!reading.starts.length && (
          <div>
            <h3>先读这几篇</h3>
            <ol>
              {reading.starts.map((post) => (
                <li key={post.id}>
                  <Link href={"/posts/" + post.slug}>{post.title} ↗</Link>
                </li>
              ))}
            </ol>
          </div>
        )}
        {!!reading.series.length && (
          <div>
            <h3>沿着系列读</h3>
            <ul>
              {reading.series.map((series) => (
                <li key={series.id}>
                  <Link href={"/series/" + series.slug}>{series.name} ↗</Link>
                  <p>
                    {series.description ||
                      `${series._count.posts} 篇公开文章，按顺序阅读。`}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
