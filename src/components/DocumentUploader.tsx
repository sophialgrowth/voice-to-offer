import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, FileAudio, File, CheckCircle2, Mic, Building2, Link, ExternalLink, Loader2, Eye, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { firecrawlApi } from '@/lib/api/firecrawl';
import { toast } from 'sonner';

export type InputMode = 'url' | 'document' | 'text' | 'audio';

export interface MultiInput {
  urls: { id: string; url: string; content: string; loading: boolean }[];
  documents: File[];
  texts: string[];
  audios: File[];
}

interface DocumentUploaderProps {
  multiInput: MultiInput;
  onMultiInputChange: (input: MultiInput) => void;
  inputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
  clientBrand: string;
  onClientBrandChange: (brand: string) => void;
  productUrls: string[];
  onProductUrlsChange: (urls: string[]) => void;
}

const ACCEPTED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/webm'];
const ACCEPTED_DOCUMENTS = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const DocumentUploader = ({ 
  multiInput,
  onMultiInputChange,
  inputMode,
  onInputModeChange,
  clientBrand,
  onClientBrandChange,
  productUrls,
  onProductUrlsChange
}: DocumentUploaderProps) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getAcceptedTypes = () => {
    if (inputMode === 'audio') return ACCEPTED_AUDIO;
    if (inputMode === 'document') return [...ACCEPTED_DOCUMENTS];
    return [];
  };

  const getAcceptString = () => {
    if (inputMode === 'audio') return 'audio/*';
    if (inputMode === 'document') return '.txt,.md,.pdf,.doc,.docx';
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

    const files = Array.from(e.dataTransfer.files).filter(isValidFile);
    if (files.length > 0) {
      if (inputMode === 'audio') {
        onMultiInputChange({ ...multiInput, audios: [...multiInput.audios, ...files] });
      } else if (inputMode === 'document') {
        onMultiInputChange({ ...multiInput, documents: [...multiInput.documents, ...files] });
      }
    }
  }, [multiInput, onMultiInputChange, inputMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (inputMode === 'audio') {
        onMultiInputChange({ ...multiInput, audios: [...multiInput.audios, ...files] });
      } else if (inputMode === 'document') {
        onMultiInputChange({ ...multiInput, documents: [...multiInput.documents, ...files] });
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const removeFile = (type: 'documents' | 'audios', index: number) => {
    const newArr = [...multiInput[type]];
    newArr.splice(index, 1);
    onMultiInputChange({ ...multiInput, [type]: newArr });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleModeChange = (value: string) => {
    onInputModeChange(value as InputMode);
  };

  // URL functions
  const addUrl = () => {
    onMultiInputChange({
      ...multiInput,
      urls: [...multiInput.urls, { id: crypto.randomUUID(), url: '', content: '', loading: false }]
    });
  };

  const updateUrl = (id: string, url: string) => {
    onMultiInputChange({
      ...multiInput,
      urls: multiInput.urls.map(u => u.id === id ? { ...u, url } : u)
    });
  };

  const removeUrl = (id: string) => {
    onMultiInputChange({
      ...multiInput,
      urls: multiInput.urls.filter(u => u.id !== id)
    });
  };

  const scrapeUrl = async (id: string) => {
    const urlItem = multiInput.urls.find(u => u.id === id);
    if (!urlItem?.url.trim()) {
      toast.error('请先输入链接');
      return;
    }

    onMultiInputChange({
      ...multiInput,
      urls: multiInput.urls.map(u => u.id === id ? { ...u, loading: true } : u)
    });

    try {
      const response = await firecrawlApi.scrape(urlItem.url.trim(), {
        formats: ['markdown'],
        onlyMainContent: true,
      });

      if (response.success) {
        const content = response.data?.markdown || response.data?.data?.markdown || '';
        if (content) {
          onMultiInputChange({
            ...multiInput,
            urls: multiInput.urls.map(u => u.id === id ? { ...u, content, loading: false } : u)
          });
          toast.success('内容读取成功！');
        } else {
          onMultiInputChange({
            ...multiInput,
            urls: multiInput.urls.map(u => u.id === id ? { ...u, loading: false } : u)
          });
          toast.error('未能提取到内容');
        }
      } else {
        onMultiInputChange({
          ...multiInput,
          urls: multiInput.urls.map(u => u.id === id ? { ...u, loading: false } : u)
        });
        toast.error(response.error || '读取失败');
      }
    } catch (error) {
      console.error('Error scraping URL:', error);
      onMultiInputChange({
        ...multiInput,
        urls: multiInput.urls.map(u => u.id === id ? { ...u, loading: false } : u)
      });
      toast.error('读取失败');
    }
  };

  // Text functions
  const addText = () => {
    onMultiInputChange({ ...multiInput, texts: [...multiInput.texts, ''] });
  };

  const updateText = (index: number, value: string) => {
    const newTexts = [...multiInput.texts];
    newTexts[index] = value;
    onMultiInputChange({ ...multiInput, texts: newTexts });
  };

  const removeText = (index: number) => {
    const newTexts = [...multiInput.texts];
    newTexts.splice(index, 1);
    onMultiInputChange({ ...multiInput, texts: newTexts });
  };

  // Product URL functions
  const addProductUrl = () => {
    onProductUrlsChange([...productUrls, '']);
  };

  const updateProductUrl = (index: number, value: string) => {
    const newUrls = [...productUrls];
    newUrls[index] = value;
    onProductUrlsChange(newUrls);
  };

  const removeProductUrl = (index: number) => {
    if (productUrls.length <= 1) return;
    const newUrls = [...productUrls];
    newUrls.splice(index, 1);
    onProductUrlsChange(newUrls);
  };

  const getInputSummary = () => {
    const counts = [];
    if (multiInput.urls.filter(u => u.content).length > 0) counts.push(`${multiInput.urls.filter(u => u.content).length}个链接`);
    if (multiInput.documents.length > 0) counts.push(`${multiInput.documents.length}个文档`);
    if (multiInput.texts.filter(t => t.trim()).length > 0) counts.push(`${multiInput.texts.filter(t => t.trim()).length}段文本`);
    if (multiInput.audios.length > 0) counts.push(`${multiInput.audios.length}个录音`);
    return counts.length > 0 ? counts.join('、') : '无输入';
  };

  return (
    <div className="space-y-5">
      {/* Required Client Info */}
      <div className="space-y-3">
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
        
        {/* Multiple Product URLs */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-primary" />
              产品页面URL <span className="text-destructive">*</span>
            </label>
            <Button variant="ghost" size="sm" onClick={addProductUrl} className="h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" /> 添加URL
            </Button>
          </div>
          {productUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => updateProductUrl(index, e.target.value)}
                placeholder="https://..."
                className="bg-secondary/30 border-border/50"
              />
              {productUrls.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeProductUrl(index)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mode Tabs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-foreground">BD会议详情</label>
          <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
            已添加: {getInputSummary()}
          </span>
        </div>
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
          {multiInput.urls.map((urlItem) => (
            <div key={urlItem.id} className="space-y-2 p-3 bg-secondary/20 rounded-lg border border-border/50">
              <div className="flex gap-2">
                <Input
                  value={urlItem.url}
                  onChange={(e) => updateUrl(urlItem.id, e.target.value)}
                  placeholder="粘贴飞书/腾讯会议/Notion等会议纪要链接..."
                  className="bg-secondary/30 border-border/50 flex-1"
                />
                <Button 
                  onClick={() => scrapeUrl(urlItem.id)} 
                  disabled={urlItem.loading || !urlItem.url.trim()}
                  variant="outline"
                  className="shrink-0"
                >
                  {urlItem.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeUrl(urlItem.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              {urlItem.content && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <CheckCircle2 className="w-4 h-4" />
                      已读取 {urlItem.content.length} 字符
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowPreview(showPreview === urlItem.id ? null : urlItem.id)}
                      className="text-muted-foreground hover:text-foreground h-7"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {showPreview === urlItem.id ? '收起' : '预览'}
                    </Button>
                  </div>
                  
                  {showPreview === urlItem.id && (
                    <div className="max-h-[150px] overflow-y-auto bg-secondary/30 border border-border/50 rounded-lg p-2">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                        {urlItem.content.slice(0, 1500)}
                        {urlItem.content.length > 1500 && '\n... (更多内容)'}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          <Button variant="outline" onClick={addUrl} className="w-full border-dashed">
            <Plus className="w-4 h-4 mr-2" /> 添加更多链接
          </Button>

          <div className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 支持的平台：</p>
            <p>飞书会议纪要、腾讯会议纪要、Notion页面、Google Docs（公开链接）等</p>
            <p className="mt-1 text-amber-500/80">⚠️ 注意：需确保链接公开可访问</p>
          </div>
        </div>
      )}

      {/* Text Input Mode */}
      {inputMode === 'text' && (
        <div className="space-y-3">
          {multiInput.texts.map((text, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">文本 {index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeText(index)}
                  className="h-6 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <Textarea
                value={text}
                onChange={(e) => updateText(index, e.target.value)}
                placeholder="请粘贴客户对话的文字记录或会议纪要..."
                className="min-h-[120px] bg-secondary/30 border-border/50 resize-none"
              />
              {text && (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <CheckCircle2 className="w-3 h-3" />
                  {text.length} 字符
                </div>
              )}
            </div>
          ))}
          
          <Button variant="outline" onClick={addText} className="w-full border-dashed">
            <Plus className="w-4 h-4 mr-2" /> 添加更多文本
          </Button>
        </div>
      )}

      {/* File Upload Mode (Audio/Document) */}
      {(inputMode === 'audio' || inputMode === 'document') && (
        <div className="space-y-3">
          {/* Existing files list */}
          {(inputMode === 'audio' ? multiInput.audios : multiInput.documents).map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {inputMode === 'audio' ? (
                    <FileAudio className="w-5 h-5 text-primary" />
                  ) : (
                    <FileText className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(inputMode === 'audio' ? 'audios' : 'documents', index)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {/* Upload zone */}
          <div
            className={cn(
              'upload-zone cursor-pointer relative',
              isDragActive && 'active'
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
              multiple
            />

            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-xl bg-secondary/50 flex items-center justify-center">
                {inputMode === 'audio' ? (
                  <Mic className="w-6 h-6 text-muted-foreground" />
                ) : (
                  <FileText className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium">
                  {inputMode === 'audio' ? '拖拽或点击上传录音' : '拖拽或点击上传文档'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {inputMode === 'audio' ? '支持 MP3, WAV, M4A 等格式，可上传多个' : '支持 TXT, MD, PDF, DOC 格式，可上传多个'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;
