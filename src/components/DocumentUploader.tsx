import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, FileAudio, File, CheckCircle2, Mic, Building2, Link } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type InputMode = 'audio' | 'text' | 'document';

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
  onProductUrlChange
}: DocumentUploaderProps) => {
  const [isDragActive, setIsDragActive] = useState(false);
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

      {/* Mode Tabs */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">客户需求详情</label>
        <Tabs value={inputMode} onValueChange={handleModeChange}>
          <TabsList className="grid grid-cols-3 bg-secondary/50">
            <TabsTrigger value="audio" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Mic className="w-4 h-4 mr-2" />
              音频录音
            </TabsTrigger>
            <TabsTrigger value="document" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <FileText className="w-4 h-4 mr-2" />
              文档上传
            </TabsTrigger>
            <TabsTrigger value="text" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <File className="w-4 h-4 mr-2" />
              文本输入
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {inputMode !== 'text' ? (
        /* File Upload Mode */
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
      ) : (
        /* Text Input Mode */
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
    </div>
  );
};

export default DocumentUploader;
