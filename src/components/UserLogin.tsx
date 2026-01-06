import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import { Sparkles, ArrowRight, Zap } from 'lucide-react';

const UserLogin = () => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('请输入你的名字');
      return;
    }

    setIsLoading(true);
    try {
      await login(name);
      toast.success(`欢迎回来，${name}！`);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-glow opacity-60" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Branding */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-6 shadow-lg animate-glow-pulse">
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold font-display tracking-tight mb-3">
            <span className="text-gradient">Nexad</span>
            <span className="text-foreground"> ProposalAI</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            智能生成专属增长方案
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card-elevated p-8 animate-slide-up delay-100">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">快速开始</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                输入你的名字
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：小明"
                className="h-12 bg-secondary/50 border-border/50 focus:border-primary/50 text-lg"
                autoFocus
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-2">
                你的名字将用于保存个人设置和历史记录
              </p>
            </div>

            <Button
              type="submit"
              variant="glow"
              size="lg"
              className="w-full h-12 text-lg font-medium"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  进入工作台
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8 animate-fade-in delay-200">
          Powered by <span className="text-gradient font-medium">Nexad</span> AI Engine
        </p>
      </div>
    </div>
  );
};

export default UserLogin;
