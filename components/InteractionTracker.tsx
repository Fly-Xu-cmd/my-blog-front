"use client";
import { useEffect } from "react";
import { trackInteraction } from "@/lib/interaction-client";
export default function InteractionTracker() {
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a");
      if (!link) return;
      const entry = link.closest<HTMLElement>("[data-interaction]");
      if (entry?.dataset.interaction && entry.dataset.target)
        trackInteraction(entry.dataset.interaction, entry.dataset.target);
      else if (new URL(link.href, location.origin).pathname === "/subscribe")
        trackInteraction("subscribe_click", "subscribe");
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, []);
  return null;
}
