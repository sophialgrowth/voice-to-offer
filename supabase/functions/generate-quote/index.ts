import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64, priceList, mimeType, transcript, customPrompt, documentBase64, documentType, model, generateCount = 1, clientBrand, productUrl, useMarkdown = true } = await req.json();

    console.log("Request received, generateCount:", generateCount);

    if (!audioBase64 && !transcript && !documentBase64) {
      throw new Error("No audio, document, or transcript provided");
    }

    if (!priceList) {
      throw new Error("No price list provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use provided model or default to Gemini 3.0 Pro
    const selectedModel = model || "google/gemini-3-pro-preview";

    let transcription = "";

    // If transcript is provided directly, use it
    if (transcript) {
      console.log("Using provided transcript...");
      transcription = transcript;
      console.log("Transcript length:", transcription.length);
    } 
    // If document is provided, extract text
    else if (documentBase64) {
      console.log("Processing document...");
      console.log("Document type:", documentType);

      const docDataUrl = `data:${documentType};base64,${documentBase64}`;

      // Use Gemini to extract text from document
      const docResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-preview",
          messages: [
            {
              role: "system",
              content: "你是一个专业的文档解析助手。请准确提取文档中的所有文本内容，保持原有的结构和格式。"
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "请提取以下文档中的所有文本内容："
                },
                {
                  type: "image_url",
                  image_url: {
                    url: docDataUrl
                  }
                }
              ]
            }
          ],
        }),
      });

      if (!docResponse.ok) {
        const errorText = await docResponse.text();
        console.error("Document parsing API error:", docResponse.status, errorText);
        throw new Error(`Document parsing error: ${errorText}`);
      }

      const docData = await docResponse.json();
      transcription = docData.choices?.[0]?.message?.content || "";
      console.log("Document extraction complete, length:", transcription.length);
    }
    // If audio is provided, transcribe it
    else if (audioBase64) {
      console.log("Processing audio transcription...");
      console.log("Audio MIME type:", mimeType);
      console.log("Audio base64 length:", audioBase64.length);

      const audioDataUrl = `data:${mimeType || 'audio/webm'};base64,${audioBase64}`;

      const transcriptionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-preview",
          messages: [
            {
              role: "system",
              content: "你是一个专业的语音转文字助手。请准确地将音频内容转录成文字，保持原意。如果音频中有多人对话，请标注不同的说话者。"
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "请将以下音频内容转录成文字："
                },
                {
                  type: "image_url",
                  image_url: {
                    url: audioDataUrl
                  }
                }
              ]
            }
          ],
        }),
      });

      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text();
        console.error("Transcription API error:", transcriptionResponse.status, errorText);
        throw new Error(`Transcription API error: ${errorText}`);
      }

      const transcriptionData = await transcriptionResponse.json();
      transcription = transcriptionData.choices?.[0]?.message?.content || "";
      
      console.log("Transcription complete:", transcription.substring(0, 200) + "...");
    }

    // Generate proposal(s) based on transcription and price list
    const basePrompt = customPrompt || `根据客户需求推荐2个服务套餐写成《XXX x Nexad: 市场穿透与全球增长护城河构建方案》，尽量用表格形式。分成两部分：一、汇总Customer Context，二、 推荐的解决方案`;

    const generateQuote = async (variation: number = 0) => {
      const variationHint = variation === 0 
        ? "" 
        : "\n\n注意：请提供一个不同的方案版本，可以调整套餐组合、预算分配或策略侧重点，以便客户比较选择。";

      // Build client info section
      const clientInfo = clientBrand || productUrl 
        ? `\n\n【客户信息】\n- 客户品牌/公司名：${clientBrand || '未提供'}\n- 产品页面URL：${productUrl || '未提供'}`
        : '';

      // Format instruction based on useMarkdown setting
      const formatInstruction = useMarkdown 
        ? "使用Markdown格式输出，包括表格、标题、列表等富文本格式。"
        : "使用纯文本格式输出，不使用Markdown语法（如#、**、|表格等），保持简洁易读的纯文本格式，方便直接复制粘贴。";

      const quotePrompt = `${basePrompt}${variationHint}
${clientInfo}

以下是客户需求内容（来自录音/文档）：
${transcription}

以下是公司价目表：
${priceList}

请根据以上信息生成专业的增长方案。${formatInstruction}

确保：
1. 使用客户品牌名「${clientBrand || 'XXX'}」替换方案标题中的XXX
2. 准确理解客户的需求和业务背景
3. 根据客户情况推荐最合适的套餐组合
${useMarkdown ? '4. 使用表格清晰展示信息' : '4. 使用清晰的层级结构展示信息'}
5. 包含投入产出预估
6. 语言专业且有说服力`;

      console.log("Generating proposal with model:", selectedModel, "variation:", variation);

      const quoteResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: "system",
              content: "你是 Nexad 的专业销售顾问，擅长根据客户需求制定精准的营销解决方案。你的输出应该专业、有条理、使用Markdown格式，并且重点突出客户价值。"
            },
            {
              role: "user",
              content: quotePrompt
            }
          ],
        }),
      });

      if (!quoteResponse.ok) {
        const errorText = await quoteResponse.text();
        console.error("Quote generation API error:", quoteResponse.status, errorText);
        
        if (quoteResponse.status === 429) {
          throw new Error("请求过于频繁，请稍后再试");
        }
        if (quoteResponse.status === 402) {
          throw new Error("AI 服务额度已用尽，请联系管理员");
        }
        
        throw new Error(`Quote generation API error: ${errorText}`);
      }

      // Read response text first to handle empty/incomplete responses
      const responseText = await quoteResponse.text();
      console.log("Quote response length:", responseText.length);
      
      if (!responseText || responseText.trim() === "") {
        console.error("Empty response from AI gateway");
        throw new Error("AI 返回空响应，请重试");
      }

      let quoteData;
      try {
        quoteData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse quote response:", responseText.substring(0, 500));
        throw new Error("AI 响应解析失败，请重试");
      }
      
      return quoteData.choices?.[0]?.message?.content || "";
    };

    // If generateCount is 0, just return the transcription (for document/audio extraction only)
    if (generateCount === 0) {
      console.log("Extraction only mode, returning transcription");
      return new Response(
        JSON.stringify({ 
          transcription,
          success: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate quotes based on count
    const count = Math.min(Math.max(1, generateCount), 2); // Limit to 1 or 2
    
    let quote = "";
    let quote2 = "";

    if (count === 2) {
      // Generate both quotes in parallel
      console.log("Generating 2 proposals in parallel...");
      const [result1, result2] = await Promise.all([
        generateQuote(0),
        generateQuote(1)
      ]);
      quote = result1;
      quote2 = result2;
    } else {
      quote = await generateQuote(0);
    }

    console.log("Proposal generation complete, count:", count);

    return new Response(
      JSON.stringify({ 
        transcription,
        quote,
        quote2: count === 2 ? quote2 : undefined,
        success: true 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-quote function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});