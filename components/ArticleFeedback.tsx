"use client";
import { Alert, App, Button, Form, Input, Modal, Select, Space } from "antd";
import { useEffect, useRef, useState } from "react";
type Props = {
  resource: "post" | "note";
  contentId: number;
  title: string;
  path: string;
  cover?: string | null;
};
export default function ArticleFeedback({
  resource,
  contentId,
  title,
  path,
}: Props) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false),
    [sending, setSending] = useState(false),
    [error, setError] = useState("");
  const [form] = Form.useForm();
  const [nativeShare, setNativeShare] = useState(false);
  useEffect(() => setNativeShare(typeof navigator.share === "function"), []);
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
    if (!navigator.share) return;
    try {
      await navigator.share({
        title,
        url: new URL(path, location.origin).href,
      });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError("分享失败，可以复制文章链接。");
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
        <Button type="text" size="small" onClick={copy}>
          复制链接
        </Button>
        {nativeShare && (
          <Button type="text" size="small" onClick={share}>
            分享
          </Button>
        )}
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
          <Button
            type="primary"
            htmlType="submit"
            aria-label="私下发送给作者"
            aria-busy={sending}
            disabled={sending}
            loading={sending}
          >
            私下发送给作者
          </Button>
        </Form>
      </Modal>
    </section>
  );
}
