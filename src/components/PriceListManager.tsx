import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FileText, Plus, Star, ThumbsUp, ThumbsDown, Trash2, 
  Check, RotateCcw, Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceList {
  id: string;
  creator_name: string;
  name: string;
  content: string;
  likes: number;
  dislikes: number;
  is_default: boolean;
}

interface PriceListManagerProps {
  currentPriceList: string;
  onPriceListChange: (priceList: string) => void;
  defaultPriceList: string;
  selectedVersionName: string | null;
  onVersionNameChange: (name: string | null) => void;
}

const PriceListManager = ({ currentPriceList, onPriceListChange, defaultPriceList, selectedVersionName, onVersionNameChange }: PriceListManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  const fetchPriceLists = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .order('is_default', { ascending: false })
        .order('likes', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPriceLists(data || []);
    } catch (error) {
      console.error('Error fetching price lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPriceLists();
    }
  }, [isOpen]);

  // Load default price list on mount
  useEffect(() => {
    const loadDefaultPriceList = async () => {
      try {
        const { data, error } = await supabase
          .from('price_lists')
          .select('content, name')
          .eq('is_default', true)
          .maybeSingle();

        if (!error && data) {
          onPriceListChange(data.content);
          onVersionNameChange(data.name);
        }
      } catch (error) {
        console.error('Error loading default price list:', error);
      }
    };
    loadDefaultPriceList();
  }, []);

  const handleSaveNew = async () => {
    if (!newName.trim() || !newContent.trim() || !creatorName.trim()) {
      toast.error('请填写名称、创建者和内容');
      return;
    }

    try {
      const { error } = await supabase
        .from('price_lists')
        .insert({
          name: newName.trim(),
          creator_name: creatorName.trim(),
          content: newContent.trim()
        });

      if (error) throw error;

      toast.success('价目表已保存');
      setNewName('');
      setCreatorName('');
      setNewContent('');
      setShowNewForm(false);
      fetchPriceLists();
    } catch (error) {
      console.error('Error saving price list:', error);
      toast.error('保存失败');
    }
  };

  const handleSelect = (priceList: PriceList) => {
    onPriceListChange(priceList.content);
    onVersionNameChange(priceList.name);
    setIsOpen(false);
    toast.success(`已切换到「${priceList.name}」`);
  };

  const handleSetDefault = async (id: string) => {
    try {
      // First, remove default from all price lists
      const { error: resetError } = await supabase
        .from('price_lists')
        .update({ is_default: false })
        .eq('is_default', true);

      if (resetError) throw resetError;

      // Then set the selected one as default
      const { error } = await supabase
        .from('price_lists')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      toast.success('已设为默认价目表');
      fetchPriceLists();
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('设置失败');
    }
  };

  const handleUpdateLikes = async (id: string, isLike: boolean) => {
    try {
      const item = priceLists.find(p => p.id === id);
      if (!item) return;

      const updateField = isLike ? 'likes' : 'dislikes';
      const newValue = isLike ? item.likes + 1 : item.dislikes + 1;

      const { error } = await supabase
        .from('price_lists')
        .update({ [updateField]: newValue })
        .eq('id', id);

      if (error) throw error;
      
      setPriceLists(priceLists.map(p => 
        p.id === id ? { ...p, [updateField]: newValue } : p
      ));
    } catch (error) {
      console.error('Error updating likes:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('price_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('已删除');
      fetchPriceLists();
    } catch (error) {
      console.error('Error deleting price list:', error);
      toast.error('删除失败');
    }
  };

  const handleSaveCurrentAsNew = () => {
    setNewContent(currentPriceList);
    setShowNewForm(true);
  };

  const handleResetToDefault = () => {
    onPriceListChange(defaultPriceList);
    onVersionNameChange(null);
    toast.success('已恢复默认价目表');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0">
          <FileText className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            价目表版本管理
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Current Price List Preview */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">当前使用的价目表</span>
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
                  保存为版本
                </Button>
              </div>
            </div>
            <Textarea
              value={currentPriceList}
              onChange={(e) => onPriceListChange(e.target.value)}
              className="min-h-[100px] text-sm bg-secondary/30"
            />
          </div>

          {/* New Price List Form */}
          {showNewForm && (
            <div className="glass-card p-4 space-y-3 animate-slide-down">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">新建价目表版本</span>
                <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
                  取消
                </Button>
              </div>
              <Input
                placeholder="版本名称（如：2024Q4版、折扣版）"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-secondary/30"
              />
              <Input
                placeholder="创建者姓名"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                className="bg-secondary/30"
              />
              <Textarea
                placeholder="价目表内容"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="min-h-[80px] text-sm bg-secondary/30"
              />
              <Button onClick={handleSaveNew} className="w-full" variant="glow">
                <Check className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          )}

          {/* Saved Price Lists */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                已保存的版本 {priceLists.length > 0 && `(${priceLists.length})`}
              </span>
              {!showNewForm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNewContent('');
                    setNewName('');
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
            ) : priceLists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>还没有保存的价目表版本</p>
                <p className="text-sm mt-1">点击「保存为版本」来创建</p>
              </div>
            ) : (
              <div className="space-y-2">
                {priceLists.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'glass-card p-4 cursor-pointer hover:border-primary/30 transition-colors',
                      'group',
                      item.is_default && 'border-primary/50 bg-primary/5'
                    )}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">{item.name}</span>
                          {item.is_default && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                              <Crown className="w-3 h-3" />
                              默认
                            </span>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                            {item.creator_name}
                          </span>
                          {item.likes > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-primary">
                              <Star className="w-3 h-3 fill-current" />
                              {item.likes}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.content}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        {!item.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSetDefault(item.id)}
                            title="设为默认"
                          >
                            <Crown className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdateLikes(item.id, true)}
                        >
                          <ThumbsUp className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdateLikes(item.id, false)}
                        >
                          <ThumbsDown className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDelete(item.id)}
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

export default PriceListManager;
