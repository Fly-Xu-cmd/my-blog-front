export function trackInteraction(event: string, target: string) {
  try {
    const visitorId = localStorage.getItem("blog_visitor_id");
    if (!visitorId) return;
    void fetch("/api/analytics/interaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, target, visitorId }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* Optional analytics never blocks an action. */
  }
}
