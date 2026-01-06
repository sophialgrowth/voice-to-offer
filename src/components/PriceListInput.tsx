import { Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface PriceListInputProps {
  value: string;
  onChange: (value: string) => void;
}

const PriceListInput = ({ value, onChange }: PriceListInputProps) => {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="请粘贴公司价目表内容，包含套餐名称、价格、服务内容等信息..."
          className="min-h-[200px] bg-secondary/30 border-border/50 resize-none focus:border-primary/50 focus:ring-primary/20 placeholder:text-muted-foreground/60"
        />
      </div>
      
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          请输入完整的价目表信息，AI 将根据客户录音内容匹配最合适的套餐方案
        </p>
      </div>
    </div>
  );
};

export default PriceListInput;
