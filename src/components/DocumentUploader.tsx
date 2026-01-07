import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, FileAudio, File, CheckCircle2, Mic, Building2, Link, ExternalLink, Loader2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { firecrawlApi } from '@/lib/api/firecrawl';
import { toast } from 'sonner';

export type InputMode = 'url' | 'document' | 'text' | 'audio';

interface DocumentUploaderProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  transcript: string;
  onTranscriptChange: (text: string) => void;
  inputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
  clientBrand: string;
  onClientBrandChange: (brand: string) => void;
  productUrl: string;
  onProductUrlChange: (url: string) => void;
  meetingUrl: string;
  onMeetingUrlChange: (url: string) => void;
  scrapedContent: string;
  onScrapedContentChange: (content: string) => void;
}

const ACCEPTED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/webm'];
const ACCEPTED_DOCUMENTS = [
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const DocumentUploader = ({ 
  onFileSelect, 
  selectedFile, 
  transcript, 
  onTranscriptChange,
  inputMode,
  onInputModeChange,
  clientBrand,
  onClientBrandChange,
  productUrl,
  onProductUrlChange,
  meetingUrl,
  onMeetingUrlChange,
  scrapedContent,
  onScrapedContentChange
}: DocumentUploaderProps) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getAcceptedTypes = () => {
    if (inputMode === 'audio') return ACCEPTED_AUDIO;
    if (inputMode === 'document') return [...ACCEPTED_DOCUMENTS];
    return [];
  };

  const getAcceptString = () => {
    if (inputMode === 'audio') return 'audio/*';
    if (inputMode === 'document') return '.txt,.pdf,.doc,.docx';
    return '';
  };

  const isValidFile = (file: File) => {
    const acceptedTypes = getAcceptedTypes();
    return acceptedTypes.some(type => file.type === type || file.type.startsWith(type.split('/')[0] + '/'));
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files?.[0] && isValidFile(files[0])) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect, inputMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) {
      onFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="w-7 h-7 text-muted-foreground" />;
    if (selectedFile.type.startsWith('audio/')) return <FileAudio className="w-6 h-6 text-primary" />;
    if (selectedFile.type === 'application/pdf') return <FileText className="w-6 h-6 text-primary" />;
    return <File className="w-6 h-6 text-primary" />;
  };

  const getUploadLabel = () => {
    if (inputMode === 'audio') return '拖拽音频文件到此处';
    if (inputMode === 'document') return '拖拽文档到此处';
    return '';
  };

  const getUploadHint = () => {
    if (inputMode === 'audio') return '支持 MP3, WAV, M4A 等格式';
    if (inputMode === 'document') return '支持 TXT, PDF, DOC, DOCX 格式';
    return '';
  };

  const handleModeChange = (value: string) => {
    onInputModeChange(value as InputMode);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleScrapeUrl = async () => {
    if (!meetingUrl.trim()) {
      toast.error('请先输入会议纪要链接');
      return;
    }

    setIsScraping(true);
    try {
      const response = await firecrawlApi.scrape(meetingUrl.trim(), {
        formats: ['markdown'],
        onlyMainContent: true,
      });

      if (response.success) {
        const content = response.data?.markdown || response.data?.data?.markdown || '';
        if (content) {
          onScrapedContentChange(content);
          setShowPreview(true);
          toast.success('会议纪要内容读取成功！');
        } else {
          toast.error('未能提取到内容，请检查链接是否正确');
        }
      } else {
        toast.error(response.error || '读取失败，请检查链接是否可访问');
      }
    } catch (error) {
      console.error('Error scraping URL:', error);
      toast.error('读取失败，请稍后重试');
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Required Client Info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            客户名/品牌名 <span className="text-destructive">*</span>
          </label>
          <Input
            value={clientBrand}
            onChange={(e) => onClientBrandChange(e.target.value)}
            placeholder="例如：小米、字节跳动"
            className="bg-secondary/30 border-border/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Link className="w-3.5 h-3.5 text-primary" />
            产品页面URL <span className="text-destructive">*</span>
          </label>
          <Input
            value={productUrl}
            onChange={(e) => onProductUrlChange(e.target.value)}
            placeholder="https://..."
            className="bg-secondary/30 border-border/50"
          />
        </div>
      </div>

      {/* Mode Tabs - 调整顺序: URL优先, 文档其次, 文本第三, 音频最后 */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">BD会议详情</label>
        <Tabs value={inputMode} onValueChange={handleModeChange}>
          <TabsList className="grid grid-cols-4 bg-secondary/50">
            <TabsTrigger value="url" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <ExternalLink className="w-4 h-4 mr-1.5" />
              会议链接
            </TabsTrigger>
            <TabsTrigger value="document" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <FileText className="w-4 h-4 mr-1.5" />
              文档
            </TabsTrigger>
            <TabsTrigger value="text" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <File className="w-4 h-4 mr-1.5" />
              文本
            </TabsTrigger>
            <TabsTrigger value="audio" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Mic className="w-4 h-4 mr-1.5" />
              录音
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* URL Input Mode */}
      {inputMode === 'url' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={meetingUrl}
              onChange={(e) => onMeetingUrlChange(e.target.value)}
              placeholder="粘贴飞书/腾讯会议/Notion等会议纪要链接..."
              className="bg-secondary/30 border-border/50 flex-1"
            />
            <Button 
              onClick={handleScrapeUrl} 
              disabled={isScraping || !meetingUrl.trim()}
              variant="outline"
              className="shrink-0"
            >
              {isScraping ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  读取中...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  读取内容
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 支持的平台：</p>
            <p>飞书会议纪要、腾讯会议纪要、Notion页面、Google Docs（公开链接）等</p>
            <p className="mt-1 text-amber-500/80">⚠️ 注意：需确保链接公开可访问，私有链接可能无法读取</p>
          </div>

          {/* Scraped Content Preview */}
          {scrapedContent && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                  已读取 {scrapedContent.length} 个字符
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  {showPreview ? '收起预览' : '查看内容'}
                </Button>
              </div>
              
              {showPreview && (
                <div className="max-h-[200px] overflow-y-auto bg-secondary/30 border border-border/50 rounded-lg p-3">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                    {scrapedContent.slice(0, 2000)}
                    {scrapedContent.length > 2000 && '\n\n... (内容过长，仅显示前2000字符)'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Text Input Mode */}
      {inputMode === 'text' && (
        <div className="space-y-2">
          <Textarea
            value={transcript}
            onChange={(e) => onTranscriptChange(e.target.value)}
            placeholder="请粘贴客户对话的文字记录或会议纪要...&#10;&#10;例如：&#10;客户：我们是一家做智能硬件的公司，想要拓展海外市场...&#10;销售：您目前有哪些市场是重点关注的？&#10;客户：主要是北美和欧洲市场..."
            className="min-h-[180px] bg-secondary/30 border-border/50 resize-none focus:border-primary/50 focus:ring-primary/20 placeholder:text-muted-foreground/60"
          />
          {transcript && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="w-4 h-4" />
              已输入 {transcript.length} 个字符
            </div>
          )}
        </div>
      )}

      {/* File Upload Mode (Audio/Document) */}
      {(inputMode === 'audio' || inputMode === 'document') && (
        <div
          className={cn(
            'upload-zone cursor-pointer relative',
            isDragActive && 'active',
            selectedFile && 'border-primary/50 bg-primary/5'
          )}
          onClick={handleClick}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept={getAcceptString()}
            onChange={handleChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  {getFileIcon()}
                </div>
                <div>
                  <p className="font-medium text-foreground">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <button
                  onClick={handleRemove}
                  className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center">
                {inputMode === 'audio' ? (
                  <Mic className="w-7 h-7 text-muted-foreground" />
                ) : (
                  <FileText className="w-7 h-7 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium">{getUploadLabel()}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  或点击选择文件 • {getUploadHint()}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;
