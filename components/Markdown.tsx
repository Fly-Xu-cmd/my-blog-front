import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createElement } from 'react';
import { headingId } from '@/lib/markdown';
import MermaidBlock from './MermaidBlock';
const components: Components = {};
for (const level of [1, 2, 3, 4, 5, 6] as const) {
  components[('h' + level) as 'h1'] = ({ node, children, ...props }) =>
    createElement(
      'h' + level,
      { ...props, id: headingId(node?.position?.start.offset), className: 'scroll-mt-28' },
      children,
    );
}
components.pre = ({ node, children }) => {
  const code = node?.children[0];
  const mermaid =
    code &&
    'properties' in code &&
    Array.isArray(code.properties.className) &&
    code.properties.className.includes('language-mermaid');
  return mermaid ? <div>{children}</div> : <pre>{children}</pre>;
};
components.code = ({ className, children }) =>
  className === 'language-mermaid' ? (
    <MermaidBlock source={String(children)} />
  ) : (
    <code className={className}>{children}</code>
  );
export default function Markdown({ source }: { source: string }) {
  return (
    <div className="article-content break-words">
      <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
