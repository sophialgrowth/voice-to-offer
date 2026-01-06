import { useState } from 'react';
import { Settings2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

interface PromptEditorProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  defaultPrompt: string;
}

const PromptEditor = ({ prompt, onPromptChange, defaultPrompt }: PromptEditorProps) => {
  const [open, setOpen] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(prompt);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setLocalPrompt(prompt);
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    onPromptChange(localPrompt);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalPrompt(defaultPrompt);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          编辑提示词
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            自定义 AI 提示词
          </DialogTitle>
          <DialogDescription>
            调整提示词可以改变 AI 生成报价单的格式和内容风格
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          <Textarea
            value={localPrompt}
            onChange={(e) => setLocalPrompt(e.target.value)}
            className="min-h-[400px] font-mono text-sm bg-secondary/30 border-border/50 resize-none"
            placeholder="输入自定义提示词..."
          />
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-2 text-muted-foreground"
          >
            <RotateCcw className="w-4 h-4" />
            恢复默认
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button variant="glow" onClick={handleSave}>
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PromptEditor;
