import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
export default function Preview({source}){return <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>;}
