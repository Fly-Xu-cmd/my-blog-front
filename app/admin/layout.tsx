"use client";
import React, { useState, useEffect } from "react";
import {
  AntDesignOutlined,
  FileOutlined,
  FormOutlined,
  HomeOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Breadcrumb, Layout, Menu, theme } from "antd";

const { Header, Content, Footer, Sider } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[]
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

const items: MenuItem[] = [
  getItem("仪表盘", "admin", <HomeOutlined />),
  getItem("文章管理", "admin", <FormOutlined />, [
    getItem("所有文章", "admin/posts"),
    getItem("新增文章", "admin/new"),
    getItem("回收站", "admin/recycle"),
    getItem("草稿箱", "admin/drafts"),
    getItem("发布文章", "admin/publish"),
  ]),
  getItem("用户管理", "users", <TeamOutlined />, [
    getItem("所有用户", "users-all"),
    getItem("新增用户", "users-new"),
    getItem("删除用户", "users-delete"),
  ]),
  getItem("Files", "9", <FileOutlined />),
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState("home");
  const [selectedKeyPath, setSelectedKeyPath] = useState<string[]>(["home"]);

  useEffect(() => {

  }, [selectedKey]);
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
      >
        {/* <div className="demo-logo-vertical" /> */}
        <Menu
          theme="dark"
          defaultSelectedKeys={[selectedKey]}
          onClick={({ key, keyPath }) => {
            setSelectedKey(key);
            setSelectedKeyPath(keyPath.reverse());
          }}
          mode="inline"
          items={items}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }}>
          <Avatar
            className="!ml-auto !block"
            size={60}
            icon={<AntDesignOutlined />}
            src="/imgs/head-img.jpg"
          />
        </Header>
        <Content style={{ margin: "0 16px" }}>
          <Breadcrumb
            style={{ margin: "16px 0" }}
            items={
              selectedKeyPath
                ? selectedKeyPath.map((item) => ({ title: item }))
                : [{ title: "home" }]
            }
          />
          <div>{children}</div>
        </Content>
        <Footer style={{ textAlign: "center" }}>
          Ant Design ©{new Date().getFullYear()} Created by Ant UED
        </Footer>
      </Layout>
    </Layout>
  );
}
