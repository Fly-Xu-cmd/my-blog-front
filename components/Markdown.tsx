import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { createElement } from "react";
import { headingId, characterOffset } from "@/lib/markdown";
import MermaidBlock from "./MermaidBlock";
import CdnImage from "./CdnImage";
const components: Components = {};
components.img = ({ src, alt, title }) =>
  typeof src === "string" ? (
    <CdnImage src={src} alt={alt ?? ""} title={title} />
  ) : null;
for (const level of [1, 2, 3, 4, 5, 6] as const) {
  components[("h" + level) as "h1"] = ({ node, children, ...props }) =>
    createElement(
      "h" + level,
      {
        ...props,
        id: headingId(node?.position?.start.offset),
        className: "scroll-mt-28",
      },
      children,
    );
}
components.pre = ({ node, children, ...props }) => {
  const code = node?.children[0];
  const mermaid =
    code &&
    "properties" in code &&
    Array.isArray(code.properties.className) &&
    code.properties.className.includes("language-mermaid");
  return mermaid ? (
    createElement("div", props, children)
  ) : (
    <pre {...props}>{children}</pre>
  );
};
components.code = ({ className, children }) =>
  className === "language-mermaid" ? (
    <MermaidBlock source={String(children)} />
  ) : (
    <code className={className}>{children}</code>
  );
export default function Markdown({ source }: { source: string }) {
  const offset = characterOffset(source);
  type SearchNode = {
    tagName?: string;
    properties?: Record<string, unknown>;
    children?: SearchNode[];
    position?: { start: { offset?: number }; end: { offset?: number } };
  };
  const searchBlocks = () => (tree: SearchNode) => {
    const visit = (node: SearchNode) => {
      if (
        node.tagName &&
        /^(p|li|pre|table|blockquote|h[1-6])$/.test(node.tagName)
      ) {
        node.properties = {
          ...node.properties,
          id: "block-" + offset(node.position?.start.offset),
          "data-search-start": offset(node.position?.start.offset),
          "data-search-end": offset(node.position?.end.offset),
        };
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
  return (
    <div className="article-content break-words">
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[searchBlocks]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
