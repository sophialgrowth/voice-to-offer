import { useState, useRef, useCallback } from 'react';
import { Upload, Mic, X, FileAudio, CheckCircle2, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

interface AudioUploaderProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  transcript: string;
  onTranscriptChange: (text: string) => void;
  inputMode: 'audio' | 'text';
  onInputModeChange: (mode: 'audio' | 'text') => void;
}

const AudioUploader = ({ 
  onFileSelect, 
  selectedFile, 
  transcript, 
  onTranscriptChange,
  inputMode,
  onInputModeChange
}: AudioUploaderProps) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (files?.[0] && files[0].type.startsWith('audio/')) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

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

  const toggleMode = () => {
    onInputModeChange(inputMode === 'audio' ? 'text' : 'audio');
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          {inputMode === 'audio' ? (
            <Mic className="w-4 h-4 text-primary" />
          ) : (
            <FileText className="w-4 h-4 text-primary" />
          )}
          {inputMode === 'audio' ? '客户录音文件' : '客户对话文本'}
        </label>
        
        <button
          onClick={toggleMode}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors text-sm text-muted-foreground hover:text-foreground"
        >
          {inputMode === 'audio' ? (
            <>
              <FileText className="w-4 h-4" />
              切换为文本输入
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              切换为音频上传
            </>
          )}
        </button>
      </div>

      {inputMode === 'audio' ? (
        /* Audio Upload Mode */
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
            accept="audio/*"
            onChange={handleChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileAudio className="w-6 h-6 text-primary" />
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
                <Upload className="w-7 h-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium">
                  拖拽音频文件到此处
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  或点击选择文件 • 支持 MP3, WAV, M4A 等格式
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
            className="min-h-[200px] bg-secondary/30 border-border/50 resize-none focus:border-primary/50 focus:ring-primary/20 placeholder:text-muted-foreground/60"
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

export default AudioUploader;
