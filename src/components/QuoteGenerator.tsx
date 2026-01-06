import { useState } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AudioUploader from './AudioUploader';
import PriceListInput from './PriceListInput';
import MarkdownOutput from './MarkdownOutput';
import { toast } from 'sonner';

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

const QuoteGenerator = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [priceList, setPriceList] = useState(DEFAULT_PRICE_LIST);
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateQuote = async () => {
    if (!audioFile) {
      toast.error('请先上传客户录音文件');
      return;
    }

    if (!priceList.trim()) {
      toast.error('请填写公司价目表');
      return;
    }

    setIsLoading(true);
    setOutput('');

    try {
      // Simulate AI processing with mock output for now
      // In production, this would call an actual AI API
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const mockOutput = `# Wavenote x Nexad: 市场穿透与全球增长护城河构建方案

---

## 一、客户决策背景与核心需求汇总 (Customer Context)

### 表 1：战略目标与增长兴趣点 (Goals & Interests)

| 目标类别 | 详细描述 |
|---------|---------|
| **投放目标** | 快速提升品牌在海外市场的知名度，重点关注北美和欧洲市场 |
| **预算预期** | 初期测试预算 $10,000-20,000/月，效果验证后可扩大至 $50,000/月 |
| **核心兴趣点** | 精准人群定向、跨平台归因分析、创意素材优化 |
| **反向工程** | 竞品 A 在 TikTok 的爆款视频策略、竞品 B 的 Google Ads 关键词布局 |

### 表 2：业务现状与产品优势 (Status Quo)

| 维度 | 详细情况与核心卖点 |
|------|-------------------|
| **产品核心卖点** | 智能语音转写，支持多语言实时翻译，准确率达 98% |
| **具体产品与产品类型** | Wavenote Pro - 企业级会议记录 SaaS 产品 |
| **市场竞争格局** | 主要竞争对手：Otter.ai、Fireflies.ai，差异化优势在于中英双语处理能力 |
| **营销现状与痛点** | 目前以 SEO 为主，缺乏系统化的付费投放经验，素材测试效率低 |
| **商业模式** | 订阅制 SaaS，客单价 $29-199/月，LTV $800+ |
| **战略与节奏** | Q1 完成北美市场测试，Q2 扩展至欧洲，Q3 进入东南亚 |

---

## 二、推荐的解决方案

基于客户的业务背景和增长目标，我们推荐以下两套定制化解决方案：

### 方案 A：快速起步套餐（推荐指数：⭐⭐⭐⭐）

| 套餐组成 | 内容详情 | 价格 |
|---------|---------|------|
| **Nexad Growth Credits** | 专业版：$15,000 广告金额 | $15,000 + $3,500 服务费 |
| **Nexad Solution Credits** | 市场调研包 + 创意制作包 | $2,000 + $3,500 |
| **合计** | — | **$24,000** |

**方案亮点：**
- 包含完整的市场调研，充分了解目标市场竞争态势
- 专业创意团队制作高转化率的广告素材
- 优化师团队全程跟踪，确保广告效果最大化

---

### 方案 B：全面出海套餐（推荐指数：⭐⭐⭐⭐⭐）

| 套餐组成 | 内容详情 | 价格 |
|---------|---------|------|
| **Nexad Growth Credits** | 企业版：$50,000 广告金额 | $50,000 + $8,000 服务费 |
| **Nexad Solution Credits** | 全渠道整合包 + 品牌出海包 | $8,000 + $12,000 |
| **合计** | — | **$78,000** |

**方案亮点：**
- 覆盖 Google、Meta、TikTok 全渠道，最大化触达目标用户
- 专业品牌出海策略，包含本地化和 KOL 合作资源
- 企业级预算规模，可快速验证并规模化成功策略
- 优先级服务响应，专属客户成功经理对接

---

### 投入产出预估

| 指标 | 方案 A 预估 | 方案 B 预估 |
|------|-----------|-----------|
| 预计曝光量 | 500,000+ | 2,000,000+ |
| 预计点击量 | 15,000+ | 60,000+ |
| 预计试用注册 | 300-500 | 1,200-2,000 |
| 预计 ROI | 2.5-3.5x | 3.0-4.5x |

---

*以上方案基于客户录音内容分析生成，具体执行细节可根据需求进一步调整。*

**Nexad 团队联系方式：**  
📧 growth@nexad.com | 📞 +1-888-NEXAD-GO
`;

      setOutput(mockOutput);
      toast.success('报价单生成成功！');
    } catch (error) {
      toast.error('生成失败，请重试');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

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
            上传客户录音，AI 自动分析需求并生成专业报价方案
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="glass-card p-6">
              <AudioUploader
                selectedFile={audioFile}
                onFileSelect={setAudioFile}
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

            {!audioFile && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground/80">提示</p>
                  <p className="mt-1">
                    录音文件将由 AI 进行语音识别和内容分析，请确保音质清晰
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
