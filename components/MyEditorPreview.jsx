"use client";

import React, {
  useState,
  useRef,
  useEffect,
  Fragment,
  useCallback,
} from "react";
import { getCodeString } from "rehype-rewrite";
import mermaid from "mermaid";
import MarkdownPreview from "@uiw/react-markdown-preview";

const randomid = () => parseInt(String(Math.random() * 1e15), 10).toString(36);
const Code = ({ inline, children = [], className, ...props }) => {
  const demoid = useRef(`dome${randomid()}`);
  const [container, setContainer] = useState(null);
  const isMermaid =
    className && /^language-mermaid/.test(className.toLocaleLowerCase());
  const code =
    props.node && props.node.children
      ? getCodeString(props.node.children)
      : children[0] || "";

  const reRender = async () => {
    if (container && isMermaid) {
      try {
        const str = await mermaid.render(demoid.current, code);
        container.innerHTML = str.svg;
      } catch (error) {
        container.innerHTML = error;
      }
    }
  };

  useEffect(() => {
    reRender();
  }, [container, isMermaid, code, demoid]);

  const refElement = useCallback((node) => {
    if (node !== null) {
      setContainer(node);
    }
  }, []);

  if (isMermaid) {
    return (
      <Fragment>
        <code id={demoid.current} style={{ display: "none" }} />
        <code ref={refElement} data-name="mermaid" />
      </Fragment>
    );
  }
  return <code>{children}</code>;
};

export default function MyEditorPreview({ source }) {
  return (
    <div className="w-full max-w-full break-words overflow-x-hidden [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_img]:max-w-full [&_img]:h-auto [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:break-words [&_code]:break-words [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_td]:break-words [&_th]:break-words">
      <MarkdownPreview
        source={source}
        style={{ padding: 10, backgroundColor: 'transparent' }}
        components={{
          code: Code,
        }}
      />
    </div>
  );
}
