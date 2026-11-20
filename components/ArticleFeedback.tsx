"use client";
import { Alert, App, Button, Form, Input, Modal, Select, Space } from "antd";
import { useRef, useState } from "react";
type Props = {
  resource: "post" | "note";
  contentId: number;
  title: string;
  path: string;
  cover?: string | null;
  githubUrl: string;
};
export default function ArticleFeedback({
  resource,
  contentId,
  title,
  path,
  cover,
  githubUrl,
}: Props) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false),
    [sending, setSending] = useState(false),
    [error, setError] = useState(""),
    [sharing, setSharing] = useState(false);
  const [form] = Form.useForm();
  const pending = useRef(false),
    key = useRef({ hash: "", id: "" });
  const submit = async (value: {
    type: string;
    message: string;
    contact?: string;
    website?: string;
  }) => {
    if (pending.current) return;
    pending.current = true;
    setSending(true);
    setError("");
    const payload = {
      resource,
      contentId,
      type: value.type,
      message: value.message.trim(),
      contact: value.contact?.trim() || "",
      website: value.website || "",
    };
    const hash = JSON.stringify(payload);
    if (key.current.hash !== hash) {
      key.current = { hash, id: crypto.randomUUID() };
    }
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, submissionId: key.current.id }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? "反馈提交较频繁，请稍后重试。"
            : data.error || "提交失败",
        );
      message.success("反馈已私下送达，谢谢你帮忙完善这篇内容。");
      setOpen(false);
      form.resetFields();
      key.current = { hash: "", id: "" };
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "网络异常，输入已保留，请手动重试。",
      );
    } finally {
      pending.current = false;
      setSending(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(new URL(path, location.origin).href);
      message.success("文章链接已复制");
    } catch {
      setError("复制失败，可以从浏览器地址栏复制链接。");
    }
  };
  const share = async () => {
    if (sharing) return;
    setSharing(true);
    setError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("分享卡片暂不可用");
      ctx.fillStyle = "#111821";
      ctx.fillRect(0, 0, 1200, 630);
      if (cover) {
        try {
          const image = new Image();
          image.crossOrigin = "anonymous";
          const loaded = new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("封面不可用"));
          });
          image.src = cover;
          await Promise.race([
            loaded,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("封面超时")), 3000),
            ),
          ]);
          ctx.save();
          ctx.globalAlpha = 0.28;
          const scale = Math.max(1200 / image.width, 630 / image.height);
          ctx.drawImage(
            image,
            (1200 - image.width * scale) / 2,
            (630 - image.height * scale) / 2,
            image.width * scale,
            image.height * scale,
          );
          ctx.restore();
        } catch {
          /* Card remains usable without cross-origin cover. */
        }
      }
      ctx.fillStyle = "#9ad9e6";
      ctx.font = "24px sans-serif";
      ctx.fillText(
        resource === "post"
          ? "文章 · 留给下一次需要的自己"
          : "笔记 · 留给下一次需要的自己",
        70,
        90,
      );
      ctx.fillStyle = "#f3f6fa";
      ctx.font = "bold 50px sans-serif";
      const lines: string[] = [];
      let line = "";
      for (const char of title) {
        if (ctx.measureText(line + char).width > 1060) {
          lines.push(line);
          line = char;
        } else line += char;
      }
      if (line) lines.push(line);
      lines
        .slice(0, 4)
        .forEach((text, index) =>
          ctx.fillText(
            index === 3 && lines.length > 4 ? text.slice(0, -1) + "…" : text,
            70,
            190 + index * 66,
          ),
        );
      ctx.fillStyle = "#b5c2cf";
      ctx.font = "22px sans-serif";
      const url = new URL(path, location.origin).href;
      ctx.fillText(url.length > 90 ? url.slice(0, 87) + "…" : url, 70, 555);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error("生成失败"))),
          "image/png",
        ),
      );
      const object = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = object;
      link.download = "blog-share.png";
      link.click();
      setTimeout(() => URL.revokeObjectURL(object), 1000);
      message.success("分享卡片已生成");
    } catch (e) {
      setError(e instanceof Error ? e.message : "分享卡片生成失败，请重试。");
    } finally {
      setSharing(false);
    }
  };
  return (
    <section className="article-feedback" aria-label="交流与分享">
      <Space wrap>
        <Button
          type="text"
          size="small"
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          纠错与反馈
        </Button>
        {githubUrl && (
          <Button
            type="link"
            size="small"
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub 讨论 ↗
          </Button>
        )}
        <Button type="text" size="small" onClick={copy}>
          复制链接
        </Button>
        <Button type="text" size="small" onClick={share} loading={sharing}>
          生成分享卡片
        </Button>
      </Space>
      {!open && error && (
        <p role="status" className="text-xs text-gray-500">
          {error}
        </p>
      )}
      <Modal
        title="纠错与反馈"
        open={open}
        onCancel={() => {
          if (!pending.current) setOpen(false);
        }}
        footer={null}
        maskClosable={!sending}
        closable={!sending}
      >
        <p className="mb-4 text-gray-500">
          仅作者在后台可见，不会公开展示。无需登录，邮箱选填；这不是即时客服。
        </p>
        {error && <Alert type="error" showIcon message={error} />}
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: "CORRECTION", website: "" }}
          disabled={sending}
          onFinish={submit}
        >
          <Form.Item name="type" label="反馈类型">
            <Select
              options={[
                { value: "CORRECTION", label: "内容纠错" },
                { value: "QUESTION", label: "阅读疑问" },
                { value: "OTHER", label: "其他建议" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="message"
            label="反馈内容"
            rules={[
              { required: true, whitespace: true, message: "请填写具体内容" },
              { max: 2000 },
            ]}
          >
            <Input.TextArea
              rows={5}
              showCount
              maxLength={2000}
              placeholder="哪一段有问题？也可以说明你的建议。"
            />
          </Form.Item>
          <Form.Item
            name="contact"
            label="联系邮箱（选填）"
            rules={[{ type: "email" }, { max: 160 }]}
          >
            <Input type="email" maxLength={160} />
          </Form.Item>
          <Form.Item name="website" hidden>
            <Input tabIndex={-1} autoComplete="off" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={sending}>
            私下发送给作者
          </Button>
        </Form>
      </Modal>
    </section>
  );
}
