import { useState } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AudioUploader from './AudioUploader';
import PriceListInput from './PriceListInput';
import MarkdownOutput from './MarkdownOutput';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_PRICE_LIST = `以下是nexad managed service价单：

【A. Nexad Growth Credits - 广告投放套餐】
- 入门版：优化团队根据调研结果评估
- 成长版：$5,000 广告金额 + $1,500 服务费
- 专业版：$15,000 广告金额 + $3,500 服务费  
- 企业版：$50,000 广告金额 + $8,000 服务费

【B. Nexad Solution Credits - 解决方案套餐】
- 市场调研包：$2,000 - 竞品分析、受众洞察、趋势报告
- 创意制作包：$3,500 - 视频广告、图片素材、文案策划
- 数据分析包：$2,500 - 归因分析、ROI追踪、优化建议
- 全渠道整合包：$8,000 - Google+Meta+TikTok全平台管理
- 品牌出海包：$12,000 - 品牌定位、本地化策略、KOL合作`;

// Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 content
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

const QuoteGenerator = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState('');
  const [inputMode, setInputMode] = useState<'audio' | 'text'>('audio');
  const [priceList, setPriceList] = useState(DEFAULT_PRICE_LIST);
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateQuote = async () => {
    // Validate input based on mode
    if (inputMode === 'audio' && !audioFile) {
      toast.error('请先上传客户录音文件');
      return;
    }
    
    if (inputMode === 'text' && !transcript.trim()) {
      toast.error('请先输入客户对话文本');
      return;
    }

    if (!priceList.trim()) {
      toast.error('请填写公司价目表');
      return;
    }

    setIsLoading(true);
    setOutput('');

    try {
      let requestBody: {
        priceList: string;
        audioBase64?: string;
        mimeType?: string;
        transcript?: string;
      } = { priceList };

      if (inputMode === 'audio' && audioFile) {
        // Convert audio file to base64
        const audioBase64 = await fileToBase64(audioFile);
        requestBody.audioBase64 = audioBase64;
        requestBody.mimeType = audioFile.type;
      } else {
        // Use text transcript directly
        requestBody.transcript = transcript;
      }
      
      // Call the edge function
      const { data, error } = await supabase.functions.invoke('generate-quote', {
        body: requestBody
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || '生成失败');
      }

      if (!data.success) {
        throw new Error(data.error || '生成失败');
      }

      setOutput(data.quote);
      toast.success('报价单生成成功！');
    } catch (error) {
      console.error('Error generating quote:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('频繁')) {
          toast.error('请求过于频繁，请稍后再试');
        } else if (error.message.includes('402') || error.message.includes('额度')) {
          toast.error('AI 服务额度已用尽');
        } else {
          toast.error(error.message || '生成失败，请重试');
        }
      } else {
        toast.error('生成失败，请重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hasValidInput = inputMode === 'audio' ? !!audioFile : !!transcript.trim();

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI 驱动的智能报价</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="text-gradient">Wavenote × Nexad</span>
          </h1>
          <p className="text-xl text-muted-foreground mt-4 max-w-2xl mx-auto">
            上传客户录音或输入对话文本，AI 自动分析需求并生成专业报价方案
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="glass-card p-6">
              <AudioUploader
                selectedFile={audioFile}
                onFileSelect={setAudioFile}
                transcript={transcript}
                onTranscriptChange={setTranscript}
                inputMode={inputMode}
                onInputModeChange={setInputMode}
              />
            </div>

            <div className="glass-card p-6">
              <PriceListInput value={priceList} onChange={setPriceList} />
            </div>

            <Button
              variant="glow"
              size="lg"
              className="w-full"
              onClick={generateQuote}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  生成报价单
                </>
              )}
            </Button>

            {!hasValidInput && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground/80">提示</p>
                  <p className="mt-1">
                    {inputMode === 'audio' 
                      ? '录音文件将由 AI 进行语音识别和内容分析，请确保音质清晰'
                      : '请输入完整的客户对话内容，越详细生成的报价单越准确'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Output Section */}
          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <MarkdownOutput content={output} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteGenerator;
