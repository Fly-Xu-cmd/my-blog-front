"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { literalMatches } from "@/lib/text-match";
function arrive() {
  const hash = location.hash;
  if (!/^#search-(title|\d+)$/.test(hash)) return;
  const query =
    new URLSearchParams(location.search).get("highlight")?.slice(0, 100) ?? "";
  const article = document.getElementById("article");
  if (!article) return;
  const at = Number(hash.slice(8));
  const candidates = [
    ...article.querySelectorAll<HTMLElement>("[data-search-start]"),
  ];
  const target =
    hash === "#search-title"
      ? article.querySelector<HTMLElement>("h1")
      : (candidates
          .filter(
            (n) =>
              Number(n.dataset.searchStart) <= at &&
              Number(n.dataset.searchEnd) > at,
          )
          .sort(
            (a, b) =>
              Number(a.dataset.searchEnd) -
              Number(a.dataset.searchStart) -
              (Number(b.dataset.searchEnd) - Number(b.dataset.searchStart)),
          )[0] ??
        candidates.find(
          (n) => literalMatches(n.textContent ?? "", query, 1).length > 0,
        ));
  if (!target) return;
  target.scrollIntoView({ block: "center", behavior: "instant" });
  target.classList.add("search-arrival");
  const marks: HTMLElement[] = [];
  if (query) {
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      if (node.parentElement?.closest("button,script,style,mark")) continue;
      if (marks.length >= 200) break;
      const value = node.data;
      const spans = literalMatches(value, query, 200 - marks.length);
      let start = 0;
      if (!spans.length) continue;
      const fragment = document.createDocumentFragment();
      for (const { start: at, end } of spans) {
        fragment.append(value.slice(start, at));
        const mark = document.createElement("mark");
        mark.className = "search-arrival-word";
        mark.textContent = value.slice(at, end);
        fragment.append(mark);
        marks.push(mark);
        start = end;
      }
      fragment.append(value.slice(start));
      node.replaceWith(fragment);
    }
  }
  const clear = () => {
    target.classList.remove("search-arrival");
    for (const mark of marks)
      if (mark.isConnected)
        mark.replaceWith(document.createTextNode(mark.textContent ?? ""));
    target.normalize();
  };
  const timer = window.setTimeout(clear, 3000);
  return () => {
    clearTimeout(timer);
    clear();
  };
}
export default function SearchArrival() {
  const query = useSearchParams().toString();
  useEffect(() => {
    let clear = arrive();
    const repeat = () => {
      clear?.();
      clear = arrive();
    };
    window.addEventListener("hashchange", repeat);
    window.addEventListener("blog-search-arrival", repeat);
    return () => {
      clear?.();
      window.removeEventListener("hashchange", repeat);
      window.removeEventListener("blog-search-arrival", repeat);
    };
  }, [query]);
  return null;
}
