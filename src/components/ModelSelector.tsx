import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cpu } from 'lucide-react';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3.0 Pro',
    provider: 'Google',
    description: '最新一代 Pro 模型，推理能力最强'
  },
  {
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3.0 Flash',
    provider: 'Google',
    description: '最新一代 Flash 模型，速度与能力平衡'
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    description: '顶级多模态模型，复杂推理能力强'
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    description: '快速响应，性价比高'
  },
  {
    id: 'openai/gpt-5.2',
    name: 'GPT-5.2',
    provider: 'OpenAI',
    description: '最新旗舰模型，推理能力最强'
  },
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI',
    description: '强大通用模型，准确性和细腻度佳'
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'OpenAI',
    description: '高性价比版本，保持强推理能力'
  }
];

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const ModelSelector = ({ value, onChange }: ModelSelectorProps) => {
  const selectedModel = AI_MODELS.find(m => m.id === value);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        <Cpu className="w-4 h-4 text-primary" />
        生成模型
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-secondary/30 border-border/50">
          <SelectValue>
            {selectedModel && (
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                  {selectedModel.provider}
                </span>
                <span>{selectedModel.name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {AI_MODELS.map((model) => (
            <SelectItem key={model.id} value={model.id} className="py-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                    {model.provider}
                  </span>
                  <span className="font-medium">{model.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{model.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelSelector;
