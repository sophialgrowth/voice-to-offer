import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Settings2, Plus, Star, ThumbsUp, ThumbsDown, Trash2, 
  Check, Sparkles, RotateCcw, Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Prompt {
  id: string;
  creator_name: string;
  name: string;
  content: string;
  likes: number;
  dislikes: number;
  is_default: boolean;
}

interface PromptManagerProps {
  currentPrompt: string;
  onPromptChange: (prompt: string) => void;
  defaultPrompt: string;
  selectedVersionName: string | null;
  onVersionNameChange: (name: string | null) => void;
}

const PromptManager = ({ currentPrompt, onPromptChange, defaultPrompt, selectedVersionName, onVersionNameChange }: PromptManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_prompts')
        .select('*')
        .order('is_default', { ascending: false })
        .order('likes', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPrompts();
    }
  }, [isOpen]);

  // Load default prompt on mount
  useEffect(() => {
    const loadDefaultPrompt = async () => {
      try {
        const { data, error } = await supabase
          .from('user_prompts')
          .select('content, name')
          .eq('is_default', true)
          .maybeSingle();

        if (!error && data) {
          onPromptChange(data.content);
          onVersionNameChange(data.name);
        }
      } catch (error) {
        console.error('Error loading default prompt:', error);
      }
    };
    loadDefaultPrompt();
  }, []);

  const handleSaveNewPrompt = async () => {
    if (!newPromptName.trim() || !newPromptContent.trim() || !creatorName.trim()) {
      toast.error('请填写名称、创建者和内容');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_prompts')
        .insert({
          name: newPromptName.trim(),
          creator_name: creatorName.trim(),
          content: newPromptContent.trim()
        });

      if (error) throw error;

      toast.success('提示词已保存');
      setNewPromptName('');
      setCreatorName('');
      setNewPromptContent('');
      setShowNewForm(false);
      fetchPrompts();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast.error('保存失败');
    }
  };

  const handleSelectPrompt = (prompt: Prompt) => {
    onPromptChange(prompt.content);
    onVersionNameChange(prompt.name);
    setIsOpen(false);
    toast.success(`已切换到「${prompt.name}」`);
  };

  const handleSetDefault = async (id: string) => {
    try {
      // First, remove default from all prompts
      const { error: resetError } = await supabase
        .from('user_prompts')
        .update({ is_default: false })
        .eq('is_default', true);

      if (resetError) throw resetError;

      // Then set the selected one as default
      const { error } = await supabase
        .from('user_prompts')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      toast.success('已设为默认提示词');
      fetchPrompts();
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('设置失败');
    }
  };

  const handleUpdateLikes = async (promptId: string, isLike: boolean) => {
    try {
      const prompt = prompts.find(p => p.id === promptId);
      if (!prompt) return;

      const updateField = isLike ? 'likes' : 'dislikes';
      const newValue = isLike ? prompt.likes + 1 : prompt.dislikes + 1;

      const { error } = await supabase
        .from('user_prompts')
        .update({ [updateField]: newValue })
        .eq('id', promptId);

      if (error) throw error;
      
      setPrompts(prompts.map(p => 
        p.id === promptId ? { ...p, [updateField]: newValue } : p
      ));
    } catch (error) {
      console.error('Error updating likes:', error);
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    try {
      const { error } = await supabase
        .from('user_prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;
      
      toast.success('已删除');
      fetchPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('删除失败');
    }
  };

  const handleSaveCurrentAsNew = () => {
    setNewPromptContent(currentPrompt);
    setShowNewForm(true);
  };

  const handleResetToDefault = () => {
    onPromptChange(defaultPrompt);
    onVersionNameChange(null);
    toast.success('已恢复默认提示词');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0">
          <Settings2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            提示词管理
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Current Prompt Preview */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">当前使用的提示词</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetToDefault}
                  className="text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  恢复默认
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveCurrentAsNew}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  保存为快捷方式
                </Button>
              </div>
            </div>
            <Textarea
              value={currentPrompt}
              onChange={(e) => onPromptChange(e.target.value)}
              className="min-h-[100px] text-sm bg-secondary/30"
            />
          </div>

          {/* New Prompt Form */}
          {showNewForm && (
            <div className="glass-card p-4 space-y-3 animate-slide-down">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">新建快捷方式</span>
                <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
                  取消
                </Button>
              </div>
              <Input
                placeholder="快捷方式名称（如：简洁版、详细版）"
                value={newPromptName}
                onChange={(e) => setNewPromptName(e.target.value)}
                className="bg-secondary/30"
              />
              <Input
                placeholder="创建者姓名"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                className="bg-secondary/30"
              />
              <Textarea
                placeholder="提示词内容"
                value={newPromptContent}
                onChange={(e) => setNewPromptContent(e.target.value)}
                className="min-h-[80px] text-sm bg-secondary/30"
              />
              <Button onClick={handleSaveNewPrompt} className="w-full" variant="glow">
                <Check className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          )}

          {/* Saved Prompts List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                所有快捷方式 {prompts.length > 0 && `(${prompts.length})`}
              </span>
              {!showNewForm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNewPromptContent('');
                    setNewPromptName('');
                    setCreatorName('');
                    setShowNewForm(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  新建
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : prompts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>还没有保存的快捷方式</p>
                <p className="text-sm mt-1">点击「保存为快捷方式」来创建</p>
              </div>
            ) : (
              <div className="space-y-2">
                {prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className={cn(
                      'glass-card p-4 cursor-pointer hover:border-primary/30 transition-colors',
                      'group',
                      prompt.is_default && 'border-primary/50 bg-primary/5'
                    )}
                    onClick={() => handleSelectPrompt(prompt)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">{prompt.name}</span>
                          {prompt.is_default && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                              <Crown className="w-3 h-3" />
                              默认
                            </span>
                          )}
                          {prompt.creator_name && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                              {prompt.creator_name}
                            </span>
                          )}
                          {prompt.likes > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-primary">
                              <Star className="w-3 h-3 fill-current" />
                              {prompt.likes}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {prompt.content}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        {!prompt.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSetDefault(prompt.id)}
                            title="设为默认"
                          >
                            <Crown className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdateLikes(prompt.id, true)}
                        >
                          <ThumbsUp className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdateLikes(prompt.id, false)}
                        >
                          <ThumbsDown className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeletePrompt(prompt.id)}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromptManager;
