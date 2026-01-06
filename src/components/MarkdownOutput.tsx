import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Download, Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MarkdownOutputProps {
  content: string;
  isLoading?: boolean;
}

const MarkdownOutput = ({ content, isLoading }: MarkdownOutputProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('已复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Wavenote-Nexad-方案.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('文件已下载');
  };

  if (isLoading) {
    return (
      <div className="glass-card-elevated p-8 min-h-[400px] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-primary animate-pulse-soft" />
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" />
        </div>
        <div className="text-center">
          <p className="text-foreground font-medium">AI 正在生成报价单...</p>
          <p className="text-sm text-muted-foreground mt-1">
            正在分析录音内容并匹配最佳方案
          </p>
        </div>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/60 animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="glass-card p-8 min-h-[400px] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-muted-foreground font-medium">报价单预览区域</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            上传录音并填写价目表后，点击生成按钮
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card-elevated overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          生成的报价单
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check className="w-4 h-4 text-primary" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            复制
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-muted-foreground hover:text-foreground"
          >
            <Download className="w-4 h-4" />
            下载
          </Button>
        </div>
      </div>
      <div className="p-6 max-h-[600px] overflow-y-auto">
        <div className="markdown-output">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default MarkdownOutput;
