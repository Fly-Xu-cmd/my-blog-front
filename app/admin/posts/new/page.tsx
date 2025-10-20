"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import {
  Checkbox,
  Form,
  Input,
  message,
  SelectProps,
  Upload,
  UploadFile,
} from "antd";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { GetProp, UploadProps, Select } from "antd";
import React from "react";
type FileType = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

const getBase64 = (img: FileType, callback: (url: string) => void) => {
  const reader = new FileReader();
  reader.addEventListener("load", () => callback(reader.result as string));
  reader.readAsDataURL(img);
};
const beforeUpload = (file: FileType) => {
  const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
  if (!isJpgOrPng) {
    message.error("请上传 JPG/PNG 格式的图片");
  }
  const isLt2M = file.size / 1024 / 1024 < 2;
  if (!isLt2M) {
    message.error("图片大小不能超过 2MB");
  }
  return isJpgOrPng && isLt2M;
};

export default function AdminPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("## 开始写文章");
  const [coverUrl, setCoverUrl] = useState("");
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([
    { id: 0, name: "未分类" },
    { id: 1, name: "技术" },
    { id: 2, name: "生活" },
  ]);
  const [categoryId, setCategoryId] = useState<number | undefined>(
    categories[0]?.id || undefined
  );
  const [tagsText, setTagsText] = useState(""); // "tag1,tag2"
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [tags, setTags] = useState<{ id: number; name: string }[]>([]);

  // 处理图片上传变化
  const handleChangeUpload: UploadProps["onChange"] = (info) => {
    if (info.file.status === "uploading") {
      setLoading(true);
      return;
    }
    if (info.file.status === "done") {
      if (info.file.response?.ok) {
        // 使用 getBase64 函数预览图片
        getBase64(info.file.originFileObj as FileType, (url) => {
          setLoading(false);
          setCoverUrl(url);
        });
      } else {
        message.error(info.file.response?.error || "上传失败");
      }
    }
  };
  // 处理标签选择变化
  const handleChangeTags: SelectProps["onChange"] = (value) => {
    setTagsText(value.join(","));
  };

  useEffect(() => {
    fetch("/api/categories")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Request failed: ${r.status}`);
        }
        const text = await r.text();
        if (!text) return []; // 防止空响应
        return JSON.parse(text);
      })
      .then(setCategories)
      .catch((err) => console.error("加载分类失败:", err));

    fetch("/api/tags")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Request failed: ${r.status}`);
        }
        const text = await r.text();
        if (!text) return [];
        return JSON.parse(text);
      })
      .then(setTags)
      .catch((err) => console.error("加载标签失败:", err));

    console.log("react", React.version);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const tags = tagsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      title,
      slug,
      excerpt: content.slice(0, 160),
      content,
      cover: coverUrl || null,
      published,
      categoryId: categoryId === undefined ? null : Number(categoryId),
      tags,
    };

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) {
      alert("发布成功");
      // 清空表单或跳转
      setTitle("");
      setSlug("");
      setContent("");
      setCoverUrl("");
      setTagsText("");
      setCategoryId(undefined);
      setPublished(false);
    } else {
      const err = await res.text();
      message.error("发布失败: " + err);
    }
  };

  const uploadButton = (
    <button style={{ border: 0, background: "none" }} type="button">
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>Upload</div>
    </button>
  );

  return (
    <div className="mx-auto py-10 space-y-6 ">
      <Form name="post" onFinish={handleSubmit} layout="horizontal">
        <Form.Item
          label="标题"
          name="title"
          rules={[{ required: true, message: "请输入标题" }]}
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入文章标题"
            required
          />
        </Form.Item>
        <Form.Item
          label="slug"
          name="slug"
          rules={[{ required: true, message: "请输入slug" }]}
        >
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="请输入文章slug"
            required
          />
        </Form.Item>
        <Form.Item label="封面" name="cover">
          <Upload
            name="file"
            listType="picture-card"
            className="avatar-uploader"
            showUploadList={false}
            action="/api/upload"
            beforeUpload={beforeUpload}
            onChange={handleChangeUpload}
          >
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt="cover"
                className="w-36 h-24 object-cover rounded"
                width={36}
                height={24}
              />
            ) : (
              uploadButton
            )}
          </Upload>
        </Form.Item>

        <Form.Item label="分类" name="categoryId">
          <div>
            <Select
              options={categories.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
              defaultValue={categoryId}
              placeholder="请选择分类"
            ></Select>
            <div className="mt-2">
              <small className="text-gray-500">
                若想新增分类，请调用 /api/categories POST 或手动在后台添加。
              </small>
            </div>
          </div>
        </Form.Item>

        <Form.Item label="标签" name="tags">
          <Select
            mode="multiple"
            allowClear
            style={{ width: "100%" }}
            placeholder="请选择标签"
            onChange={handleChangeTags}
            options={tags.map((t) => ({
              label: t.name,
              value: t.id,
            }))}
          />
        </Form.Item>
        <Form.Item label="已发布" name="published" valuePropName="checked">
          <Checkbox
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          >
            已发布
          </Checkbox>
        </Form.Item>
        <Form.Item label="内容" name="content" style={{ width: "100%" }}>
          <MDEditor
            value={content}
            onChange={(v) => setContent(v || "")}
            height={420}
          />
        </Form.Item>

        <Form.Item label="" name="submit">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={saving}
          >
            {saving ? "发布中..." : "发布"}
          </button>
        </Form.Item>
      </Form>
    </div>
  );
}
