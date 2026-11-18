"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Collapse, Input, type InputRef } from "antd";
import { Check, Copy, ArrowUpRight } from "lucide-react";

export default function SubscriptionTools({ initialFeedUrl }: { initialFeedUrl: string }) {
  const input = useRef<InputRef>(null);
  const [feedUrl, setFeedUrl] = useState(initialFeedUrl);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "error">(
    "idle",
  );
  useEffect(() => {
    setFeedUrl(new URL("/feed.xml", window.location.origin).href);
    setReady(true);
  }, []);
  async function copy() {
    setStatus("copying");
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(feedUrl);
      setStatus("copied");
    } catch {
      setStatus("error");
      input.current?.focus();
      input.current?.select();
    }
  }
  return (
    <section
      className="subscription-tools"
      aria-labelledby="subscription-address"
    >
      <h2 id="subscription-address">添加这个订阅地址</h2>
      <div className="subscription-address-row">
        <Input
          ref={input}
          value={feedUrl}
          readOnly
          size="large"
          aria-label="RSS 订阅地址"
        />
        <Button
          type="primary"
          size="large"
          disabled={!ready}
          loading={status === "copying"}
          onClick={copy}
          icon={status === "copied" ? <Check size={16} /> : <Copy size={16} />}
        >
          {status === "copied" ? "已复制" : "复制地址"}
        </Button>
      </div>
      <p
        className={
          "subscription-copy-hint" + (status === "error" ? " is-error" : "")
        }
        role={status === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {status === "copied"
          ? "地址已复制，可粘贴到你的 RSS 阅读器。"
          : status === "error"
            ? "未能自动复制，请选中上方地址手动复制。"
            : "在阅读器中选择「添加订阅」，粘贴这个地址即可。"}
      </p>
      <noscript>
        <p className="subscription-copy-hint">
          可选中订阅地址手动复制，或使用下方阅读器入口。
        </p>
      </noscript>
      <div className="subscription-reader-row">
        <span>已有阅读器？</span>
        <Button
          type="text"
          href={
            "https://feedly.com/i/subscription/feed/" +
            encodeURIComponent(feedUrl)
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          用 Feedly 订阅 <ArrowUpRight size={14} aria-hidden="true" />
        </Button>
        <Button
          type="text"
          href={
            "https://www.inoreader.com/?add_feed=" + encodeURIComponent(feedUrl)
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          用 Inoreader 订阅 <ArrowUpRight size={14} aria-hidden="true" />
        </Button>
        <a
          href="/feed.xml"
          target="_blank"
          rel="noopener noreferrer"
          className="subscription-raw"
        >
          原始 RSS <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </div>
      <Collapse
        ghost
        className="subscription-guide"
        items={[
          {
            key: "start",
            label: "第一次用 RSS？这样开始",
            children: (
              <ol>
                <li>
                  <strong>选一个阅读器。</strong>网页端可以用 Feedly 或
                  Inoreader，也可以用支持 RSS 的桌面、手机应用。
                </li>
                <li>
                  <strong>添加订阅地址。</strong>
                  复制上面的地址，找到阅读器中的「添加订阅」或「关注网站」。
                </li>
                <li>
                  <strong>等待下一次更新。</strong>
                  阅读器会定时检查新内容，点开标题即可回到博客阅读全文。
                </li>
              </ol>
            ),
          },
        ]}
      />
    </section>
  );
}
