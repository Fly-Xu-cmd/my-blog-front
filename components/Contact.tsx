'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Button, Popover, Tooltip } from 'antd';

const CONTACTS = [
  { key: 'wechat', name: '微信', icon: '\ue600', color: 'text-green-600 dark:text-green-400' },
  { key: 'qq', name: 'QQ', icon: '\ue882', color: 'text-brand-500' },
];

export default function Contact() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="flex items-center justify-center gap-1">
      {CONTACTS.map((contact) => (
        <Popover
          key={contact.key}
          trigger="click"
          placement="bottomRight"
          title={contact.name + '二维码'}
          open={open === contact.key}
          onOpenChange={(visible) => setOpen(visible ? contact.key : null)}
          content={
            <div className="w-44 text-center">
              <Image
                src={'/imgs/' + contact.key + '-qrcode.jpg'}
                alt={contact.name + '二维码'}
                width={176}
                height={176}
                className="w-full h-auto"
              />
              <p className="mt-2">扫码添加{contact.name}</p>
              <Button type="link" onClick={() => setOpen(null)}>
                关闭
              </Button>
            </div>
          }
        >
          <Button
            type="text"
            shape="circle"
            aria-label={contact.name + '二维码'}
            icon={
              <i aria-hidden="true" className={'iconfont !text-[26px] ' + contact.color}>
                {contact.icon}
              </i>
            }
          />
        </Popover>
      ))}
      <Tooltip title="GitHub">
        <Button
          type="text"
          shape="circle"
          href="https://github.com/Fly-Xu-cmd"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          icon={
            <i
              aria-hidden="true"
              className="iconfont !text-[26px] text-gray-800 dark:text-gray-200"
            >
              {'\ue885'}
            </i>
          }
        />
      </Tooltip>
    </div>
  );
}
