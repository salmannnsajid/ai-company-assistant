import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Answer text. Tables get a scroll container so wide ones don't stretch the chat.
export function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="table-wrap scroll-thin">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
