import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { History, FileText, Mic, File, ThumbsUp, ThumbsDown, Trash2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Proposal {
  id: string;
  client_name: string | null;
  input_type: string;
  input_summary: string | null;
  output_markdown: string;
  is_liked: boolean | null;
  created_at: string;
}

interface ProposalHistoryProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProposal: (markdown: string) => void;
}

const ProposalHistory = ({ isOpen, onOpenChange, onSelectProposal }: ProposalHistoryProps) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProposals = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('generated_proposals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setProposals(data || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchProposals();
  }, [isOpen]);

  const handleLike = async (proposalId: string, isLike: boolean) => {
    try {
      const { error } = await supabase.from('generated_proposals').update({ is_liked: isLike }).eq('id', proposalId);
      if (error) throw error;
      setProposals(proposals.map(p => p.id === proposalId ? { ...p, is_liked: isLike } : p));
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handleDelete = async (proposalId: string) => {
    try {
      const { error } = await supabase.from('generated_proposals').delete().eq('id', proposalId);
      if (error) throw error;
      toast.success('已删除');
      setProposals(proposals.filter(p => p.id !== proposalId));
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('删除失败');
    }
  };

  const handleSelect = (proposal: Proposal) => {
    onSelectProposal(proposal.output_markdown);
    onOpenChange(false);
    toast.success('已加载历史方案');
  };

  const getInputIcon = (type: string) => {
    switch (type) {
      case 'audio': return <Mic className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      default: return <File className="w-4 h-4" />;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            生成历史
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>还没有生成记录</p>
            </div>
          ) : (
            proposals.map((proposal) => (
              <div key={proposal.id} className="glass-card p-4 cursor-pointer hover:border-primary/30 transition-all group" onClick={() => handleSelect(proposal)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-foreground">{proposal.client_name || '未命名客户'}</span>
                      {proposal.is_liked === true && <ThumbsUp className="w-3 h-3 text-primary fill-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{proposal.output_markdown.slice(0, 150)}...</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(proposal.created_at), 'MM月dd日 HH:mm', { locale: zhCN })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleLike(proposal.id, true)}>
                      <ThumbsUp className={cn("w-4 h-4", proposal.is_liked === true ? "text-primary fill-primary" : "text-muted-foreground")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(proposal.id)}>
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProposalHistory;
