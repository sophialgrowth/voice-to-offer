import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Loader2, MessageSquare, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentOutput: string;
  onOutputUpdate: (newOutput: string) => void;
  priceList: string;
}

const ConversationChat = ({ 
  isOpen, 
  onClose, 
  currentOutput, 
  onOutputUpdate,
  priceList 
}: ConversationChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-quote', {
        body: {
          priceList,
          transcript: `当前方案内容：
${currentOutput}

用户修改要求：
${userMessage}

请根据用户的修改要求，对当前方案进行调整和优化。`,
          customPrompt: `你是一个专业的方案修改助手。用户已有一份增长方案，现在需要根据用户的具体要求进行修改。
请：
1. 理解用户的修改意图
2. 保持方案的整体结构和专业性
3. 只修改用户要求的部分
4. 输出完整的修改后方案（Markdown格式）`
        }
      });

      if (error) throw error;

      if (data.success && data.quote) {
        setMessages([...newMessages, { role: 'assistant', content: '方案已更新，请查看右侧输出区域。' }]);
        onOutputUpdate(data.quote);
        toast.success('方案已更新');
      } else {
        throw new Error(data.error || '修改失败');
      }
    } catch (error) {
      console.error('Error in conversation:', error);
      toast.error('修改失败，请重试');
      setMessages([...newMessages, { role: 'assistant', content: '抱歉，修改失败了，请重试。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 z-50 animate-slide-up">
      <div className="glass-card overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span className="font-medium">对话修改</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="h-64 p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <Sparkles className="w-8 h-8 mb-3 text-primary/50" />
              <p className="text-sm">输入修改要求，AI 将帮你调整方案</p>
              <p className="text-xs mt-1">例如："把预算改成 $10,000"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-secondary text-foreground rounded-bl-md'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入修改要求..."
              className="flex-1 bg-secondary/30"
              disabled={isLoading}
            />
            <Button 
              size="icon" 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading}
              variant="glow"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationChat;
