import { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, Zap, MessageSquare, FileText, Settings2, Copy, FileCode, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import DocumentUploader, { InputMode, MultiInput } from './DocumentUploader';
import PriceListInput from './PriceListInput';
import PriceListManager from './PriceListManager';
import MarkdownOutput from './MarkdownOutput';
import PromptManager from './PromptManager';
import ModelSelector, { AI_MODELS } from './ModelSelector';
import Header from './Header';
import ProposalHistory from './ProposalHistory';
import ConversationChat from './ConversationChat';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

const DEFAULT_PROMPT = `根据客户需求推荐2个服务套餐写成《XXX x Nexad: 市场穿透与全球增长护城河构建方案》，尽量用表格形式。分成两部分：一、汇总Customer Context，二、 推荐的解决方案

第一部分：
一、XXX 决策背景与核心需求汇总 (Customer Context)
表 1：战略目标与增长兴趣点 (Goals & Interests)
目标类别
详细描述
投放目标

预算预期

核心兴趣点

反向工程

表 2：业务现状与产品优势 (Status Quo)
维度
详细情况与核心卖点
产品核心卖点

具体产品与产品类型

市场竞争格局

营销现状与痛点

商业模式

战略与节奏

二、 推荐的解决方案
套餐分成A. Nexad Growth Credits 和 B. Nexad Solution Credits 。
A是广告投放金额（较便宜的套餐默认不填广告金额，备注优化师团队调研后决定），表格里写优化团队根据调研结果评估即可。`;

const LANGUAGE_OPTIONS = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'zh-en', label: '中英对照' },
  { value: 'custom', label: '自定义' }
];

// Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Read text file content
const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const CACHE_KEY = 'nexad-proposal-draft';

interface CachedData {
  multiInput: {
    urls: { id: string; url: string; content: string }[];
    texts: string[];
  };
  inputMode: InputMode;
  clientBrand: string;
  productUrls: string[];
  priceList: string;
  priceListVersionName: string | null;
  customPrompt: string;
  promptVersionName: string | null;
  selectedModel: string;
  outputLanguage: string;
  customLanguage: string;
  additionalNotes: string;
  generateTwo: boolean;
  useMarkdown: boolean;
}

const ProposalGenerator = () => {
  // Load cached data on initial render
  const getCachedData = (): Partial<CachedData> => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Failed to load cached data:', e);
    }
    return {};
  };

  const cachedData = getCachedData();

  const [multiInput, setMultiInput] = useState<MultiInput>(() => {
    const cached = cachedData.multiInput;
    return {
      urls: cached?.urls?.length ? cached.urls.map(u => ({ ...u, loading: false })) : [{ id: crypto.randomUUID(), url: '', content: '', loading: false }],
      documents: [], // Files can't be cached
      texts: cached?.texts?.length ? cached.texts : [''],
      audios: [] // Files can't be cached
    };
  });
  const [inputMode, setInputMode] = useState<InputMode>(cachedData.inputMode || 'url');
  const [clientBrand, setClientBrand] = useState(cachedData.clientBrand || '');
  const [productUrls, setProductUrls] = useState<string[]>(cachedData.productUrls?.length ? cachedData.productUrls : ['']);
  const [priceList, setPriceList] = useState(cachedData.priceList || DEFAULT_PRICE_LIST);
  const [priceListVersionName, setPriceListVersionName] = useState<string | null>(cachedData.priceListVersionName || null);
  const [customPrompt, setCustomPrompt] = useState(cachedData.customPrompt || DEFAULT_PROMPT);
  const [promptVersionName, setPromptVersionName] = useState<string | null>(cachedData.promptVersionName || null);
  const [selectedModel, setSelectedModel] = useState(cachedData.selectedModel || 'google/gemini-3-pro-preview');
  const [output, setOutput] = useState('');
  const [output2, setOutput2] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [generateTwo, setGenerateTwo] = useState(cachedData.generateTwo ?? false);
  const [useMarkdown, setUseMarkdown] = useState(cachedData.useMarkdown ?? true);
  
  // New features
  const [outputLanguage, setOutputLanguage] = useState(cachedData.outputLanguage || 'zh');
  const [customLanguage, setCustomLanguage] = useState(cachedData.customLanguage || '');
  const [additionalNotes, setAdditionalNotes] = useState(cachedData.additionalNotes || '');

  // Save to localStorage whenever relevant state changes
  useEffect(() => {
    const dataToCache: CachedData = {
      multiInput: {
        urls: multiInput.urls.map(u => ({ id: u.id, url: u.url, content: u.content })),
        texts: multiInput.texts
      },
      inputMode,
      clientBrand,
      productUrls,
      priceList,
      priceListVersionName,
      customPrompt,
      promptVersionName,
      selectedModel,
      outputLanguage,
      customLanguage,
      additionalNotes,
      generateTwo,
      useMarkdown
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(dataToCache));
  }, [multiInput, inputMode, clientBrand, productUrls, priceList, priceListVersionName, customPrompt, promptVersionName, selectedModel, outputLanguage, customLanguage, additionalNotes, generateTwo, useMarkdown]);

  // Load default versions on mount (only if no cached data)
  useEffect(() => {
    const loadDefaults = async () => {
      // Only load defaults if we don't have cached values
      if (!cachedData.priceList) {
        const { data: priceData } = await supabase
          .from('price_lists')
          .select('content, name')
          .eq('is_default', true)
          .maybeSingle();

        if (priceData) {
          setPriceList(priceData.content);
          setPriceListVersionName(priceData.name);
        }
      }

      if (!cachedData.customPrompt) {
        const { data: promptData } = await supabase
          .from('user_prompts')
          .select('content, name')
          .eq('is_default', true)
          .maybeSingle();

        if (promptData) {
          setCustomPrompt(promptData.content);
          setPromptVersionName(promptData.name);
        }
      }
    };
    loadDefaults();
  }, []);

  const generateProposal = async () => {
    // Validate required fields
    if (!clientBrand.trim()) {
      toast.error('请填写客户品牌名');
      return;
    }
    
    const validProductUrls = productUrls.filter(u => u.trim());
    if (validProductUrls.length === 0) {
      toast.error('请填写至少一个产品页面URL');
      return;
    }

    // Gather all input content
    const allContent: string[] = [];
    
    // URL content
    const urlContents = multiInput.urls.filter(u => u.content.trim()).map(u => u.content);
    allContent.push(...urlContents);
    
    // Text content
    const textContents = multiInput.texts.filter(t => t.trim());
    allContent.push(...textContents);

    // Check if we have documents or audios that need processing
    const hasDocsToProcess = multiInput.documents.length > 0;
    const hasAudiosToProcess = multiInput.audios.length > 0;

    if (allContent.length === 0 && !hasDocsToProcess && !hasAudiosToProcess) {
      toast.error('请至少添加一个会议详情输入（链接、文档、文本或录音）');
      return;
    }

    if (!priceList.trim()) {
      toast.error('请填写公司价目表');
      return;
    }

    setIsLoading(true);
    setOutput('');
    setOutput2('');

    try {
      // Prepare language instruction
      let languageInstruction = '';
      if (outputLanguage === 'zh') {
        languageInstruction = '请使用中文输出。';
      } else if (outputLanguage === 'en') {
        languageInstruction = 'Please output in English.';
      } else if (outputLanguage === 'zh-en') {
        languageInstruction = '请使用中英双语对照输出，每段内容先中文后英文。';
      } else if (outputLanguage === 'custom' && customLanguage.trim()) {
        languageInstruction = `请使用${customLanguage}输出。`;
      }

      // Combine prompt with additional notes
      let finalPrompt = customPrompt;
      if (additionalNotes.trim()) {
        finalPrompt = `${customPrompt}\n\n【用户额外要求】\n${additionalNotes}`;
      }
      if (languageInstruction) {
        finalPrompt = `${finalPrompt}\n\n【输出语言】\n${languageInstruction}`;
      }

      // Process documents
      for (const doc of multiInput.documents) {
        if (doc.type === 'text/plain' || doc.type === 'text/markdown') {
          const textContent = await readTextFile(doc);
          allContent.push(`[文档: ${doc.name}]\n${textContent}`);
        } else {
          // For PDF/DOC, we'll send as base64
          const docBase64 = await fileToBase64(doc);
          // Call API to extract text from document
          const { data: docData, error: docError } = await supabase.functions.invoke('generate-quote', {
            body: {
              documentBase64: docBase64,
              documentType: doc.type,
              priceList,
              customPrompt: '请提取文档中的所有文本内容',
              model: selectedModel,
              generateCount: 0, // Just extract, don't generate
              clientBrand,
              productUrl: validProductUrls.join(' | '),
              useMarkdown: false
            }
          });
          if (docData?.transcription) {
            allContent.push(`[文档: ${doc.name}]\n${docData.transcription}`);
          }
        }
      }

      // Process audios
      for (const audio of multiInput.audios) {
        const audioBase64 = await fileToBase64(audio);
        const { data: audioData, error: audioError } = await supabase.functions.invoke('generate-quote', {
          body: {
            audioBase64,
            mimeType: audio.type,
            priceList,
            customPrompt: '请转录音频内容',
            model: selectedModel,
            generateCount: 0,
            clientBrand,
            productUrl: validProductUrls.join(' | '),
            useMarkdown: false
          }
        });
        if (audioData?.transcription) {
          allContent.push(`[录音: ${audio.name}]\n${audioData.transcription}`);
        }
      }

      // Now generate the proposal with all content
      const combinedTranscript = allContent.join('\n\n---\n\n');

      const requestBody = {
        priceList,
        customPrompt: finalPrompt,
        model: selectedModel,
        generateCount: generateTwo ? 2 : 1,
        clientBrand,
        productUrl: validProductUrls.join(' | '),
        useMarkdown,
        transcript: combinedTranscript
      };
      
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
      if (data.quote2) {
        setOutput2(data.quote2);
      }
      toast.success(generateTwo ? '2个方案生成成功！' : '方案生成成功！');

      // Save to history with client brand name
      try {
        const inputSummary = `${validProductUrls[0]} | ${getInputSummary()}`;
        await supabase.from('generated_proposals').insert({
          user_id: null,
          client_name: clientBrand,
          input_type: 'multi',
          input_summary: inputSummary.slice(0, 200),
          price_list: priceList,
          output_markdown: data.quote
        });
        if (data.quote2) {
          await supabase.from('generated_proposals').insert({
            user_id: null,
            client_name: clientBrand,
            input_type: 'multi',
            input_summary: inputSummary.slice(0, 200),
            price_list: priceList,
            output_markdown: data.quote2
          });
        }
      } catch (saveError) {
        console.error('Error saving to history:', saveError);
      }
    } catch (error) {
      console.error('Error generating proposal:', error);
      
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

  const getInputSummary = () => {
    const counts = [];
    if (multiInput.urls.filter(u => u.content).length > 0) counts.push(`${multiInput.urls.filter(u => u.content).length}链接`);
    if (multiInput.documents.length > 0) counts.push(`${multiInput.documents.length}文档`);
    if (multiInput.texts.filter(t => t.trim()).length > 0) counts.push(`${multiInput.texts.filter(t => t.trim()).length}文本`);
    if (multiInput.audios.length > 0) counts.push(`${multiInput.audios.length}录音`);
    return counts.length > 0 ? counts.join('+') : '无';
  };

  const hasValidInput = () => {
    if (!clientBrand.trim()) return false;
    if (!productUrls.some(u => u.trim())) return false;
    
    const hasUrls = multiInput.urls.some(u => u.content.trim());
    const hasTexts = multiInput.texts.some(t => t.trim());
    const hasDocs = multiInput.documents.length > 0;
    const hasAudios = multiInput.audios.length > 0;
    
    return hasUrls || hasTexts || hasDocs || hasAudios;
  };

  const handleHistorySelect = (markdown: string) => {
    setOutput(markdown);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onHistoryClick={() => setHistoryOpen(true)} />
      
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-glow opacity-40" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-gradient-glow opacity-20" />
      </div>

      <main className="flex-1 relative z-10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <header className="text-center mb-10 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {AI_MODELS.find(m => m.id === selectedModel)?.name || 'AI'} 驱动
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display tracking-tight mb-4">
              BD会议到<span className="text-gradient">专属增长方案</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              输入BD会议纪要，AI 自动分析并生成专业的 Nexad 增长方案
            </p>
          </header>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Input Section */}
            <div className="space-y-5 animate-slide-up delay-100">
              <div className="glass-card p-6">
                <DocumentUploader
                  multiInput={multiInput}
                  onMultiInputChange={setMultiInput}
                  inputMode={inputMode}
                  onInputModeChange={setInputMode}
                  clientBrand={clientBrand}
                  onClientBrandChange={setClientBrand}
                  productUrls={productUrls}
                  onProductUrlsChange={setProductUrls}
                />
              </div>

              <div className="glass-card p-6">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">公司价目表</span>
                      {priceListVersionName && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                          {priceListVersionName}
                        </span>
                      )}
                    </div>
                    <PriceListInput value={priceList} onChange={(v) => {
                      setPriceList(v);
                      setPriceListVersionName(null);
                    }} />
                  </div>
                  <PriceListManager
                    currentPriceList={priceList}
                    onPriceListChange={setPriceList}
                    defaultPriceList={DEFAULT_PRICE_LIST}
                    selectedVersionName={priceListVersionName}
                    onVersionNameChange={setPriceListVersionName}
                  />
                </div>
              </div>

              <div className="glass-card p-6 space-y-4">
                <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                
                {/* Language Selector */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-medium">输出语言</Label>
                  </div>
                  <div className="flex gap-2">
                    <Select value={outputLanguage} onValueChange={setOutputLanguage}>
                      <SelectTrigger className="bg-secondary/30 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {outputLanguage === 'custom' && (
                      <Input
                        value={customLanguage}
                        onChange={(e) => setCustomLanguage(e.target.value)}
                        placeholder="输入语言，如：日语、法语..."
                        className="bg-secondary/30 border-border/50 flex-1"
                      />
                    )}
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-primary" />
                    额外建议（可选）
                  </Label>
                  <Textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="输入额外的生成要求或建议，例如：重点突出ROI、多强调创意服务..."
                    className="min-h-[80px] bg-secondary/30 border-border/50 resize-none text-sm"
                  />
                </div>
                
                {/* Markdown Toggle */}
                <div className={cn(
                  "flex items-center justify-between p-3 rounded-xl border-2 transition-colors",
                  useMarkdown 
                    ? "border-primary/50 bg-primary/10" 
                    : "border-border/50 bg-secondary/30"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      useMarkdown ? "bg-primary/20" : "bg-secondary"
                    )}>
                      <FileCode className={cn(
                        "w-5 h-5",
                        useMarkdown ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <Label htmlFor="use-markdown" className="text-sm font-semibold cursor-pointer">
                        Markdown 格式输出
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {useMarkdown ? "使用表格、标题等富文本格式" : "纯文本格式，方便直接复制"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="use-markdown"
                    checked={useMarkdown}
                    onCheckedChange={setUseMarkdown}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Copy className="w-4 h-4 text-primary" />
                    <Label htmlFor="generate-two" className="text-sm font-medium cursor-pointer">
                      生成2个方案比稿
                    </Label>
                  </div>
                  <Switch
                    id="generate-two"
                    checked={generateTwo}
                    onCheckedChange={setGenerateTwo}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="glow"
                  size="lg"
                  className="flex-1 h-12"
                  onClick={generateProposal}
                  disabled={isLoading || !hasValidInput()}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      生成增长方案
                    </>
                  )}
                </Button>
                
                <div className="flex items-center gap-2">
                  <PromptManager
                    currentPrompt={customPrompt}
                    onPromptChange={setCustomPrompt}
                    defaultPrompt={DEFAULT_PROMPT}
                    selectedVersionName={promptVersionName}
                    onVersionNameChange={setPromptVersionName}
                  />
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">提示词</span>
                  {promptVersionName && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      {promptVersionName}
                    </span>
                  )}
                </div>
              </div>

              {!hasValidInput() && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50">
                  <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground/80">提示</p>
                    <p className="mt-1">
                      请填写客户信息、产品URL，并添加至少一个BD会议详情（链接/文档/文本/录音）
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Output Section */}
            <div className="animate-slide-up delay-200 relative space-y-6">
              {generateTwo && output && output2 ? (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">
                        方案 A
                      </span>
                    </div>
                    <MarkdownOutput content={output} isLoading={isLoading} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                        方案 B
                      </span>
                    </div>
                    <MarkdownOutput content={output2} isLoading={false} />
                  </div>
                </>
              ) : (
                <MarkdownOutput content={output} isLoading={isLoading} />
              )}
              
              {/* Chat button - only show when output exists */}
              {output && !isLoading && (
                <Button
                  variant="glow"
                  size="lg"
                  className="fixed bottom-6 right-6 z-40 shadow-lg"
                  onClick={() => setChatOpen(!chatOpen)}
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  对话修改
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* History Sheet */}
      <ProposalHistory
        isOpen={historyOpen}
        onOpenChange={setHistoryOpen}
        onSelectProposal={handleHistorySelect}
      />

      {/* Conversation Chat */}
      <ConversationChat
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        currentOutput={output}
        onOutputUpdate={setOutput}
        priceList={priceList}
      />
    </div>
  );
};

export default ProposalGenerator;
