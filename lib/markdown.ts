import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
type Node = {
  type: string;
  value?: string;
  children?: Node[];
  depth?: number;
  position?: { start: { offset?: number } };
};
const plain = (node: Node): string => node.value ?? node.children?.map(plain).join('') ?? '';
export function markdownHeadings(source: string) {
  const root = remark().use(remarkGfm).parse(source) as Node;
  const headings: { id: string; title: string; level: number }[] = [];
  const walk = (node: Node) => {
    if (node.type === 'heading')
      headings.push({
        id: headingId(node.position?.start.offset),
        title: plain(node),
        level: node.depth ?? 1,
      });
    node.children?.forEach(walk);
  };
  walk(root);
  return headings;
}
export const headingId = (offset: number | undefined) => 'heading-' + (offset ?? 0);
export const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
export function shanghaiDate(value: Date | string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value))
    : '';
}
