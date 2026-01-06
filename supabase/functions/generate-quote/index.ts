import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768): Uint8Array {
  const chunks: Uint8Array[] = [];
  let position = 0;

  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);

    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }

    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64, priceList, mimeType, transcript } = await req.json();

    if (!audioBase64 && !transcript) {
      throw new Error("No audio data or transcript provided");
    }

    if (!priceList) {
      throw new Error("No price list provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let transcription = "";

    // If transcript is provided directly, use it; otherwise transcribe audio
    if (transcript) {
      console.log("Using provided transcript...");
      transcription = transcript;
      console.log("Transcript length:", transcription.length);
    } else if (audioBase64) {
      console.log("Processing audio transcription...");
      console.log("Audio MIME type:", mimeType);
      console.log("Audio base64 length:", audioBase64.length);

      // Step 1: Transcribe audio using Gemini (which supports audio)
      const audioDataUrl = `data:${mimeType || 'audio/webm'};base64,${audioBase64}`;

      // Use Gemini for transcription since it supports audio natively
      const transcriptionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
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

    // Step 2: Generate quote based on transcription and price list
    const quotePrompt = `根据客户录音推荐2个服务套餐写成《Wavenote x Nexad: 市场穿透与全球增长护城河构建方案》，尽量用表格形式。分成两部分：一、汇总Customer Context，二、 推荐的解决方案

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
A是广告投放金额（较便宜的套餐默认不填广告金额，备注优化师团队调研后决定），表格里写优化团队根据调研结果评估即可。

以下是客户录音的转录内容：
${transcription}

以下是公司价目表：
${priceList}

请根据以上信息生成专业的报价方案，使用Markdown格式输出。确保：
1. 准确理解客户的需求和业务背景
2. 根据客户情况推荐最合适的套餐组合
3. 使用表格清晰展示信息
4. 包含投入产出预估
5. 语言专业且有说服力`;

    console.log("Generating quote...");

    const quoteResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
        return new Response(
          JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (quoteResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI 服务额度已用尽，请联系管理员" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Quote generation API error: ${errorText}`);
    }

    const quoteData = await quoteResponse.json();
    const quote = quoteData.choices?.[0]?.message?.content || "";

    console.log("Quote generation complete");

    return new Response(
      JSON.stringify({ 
        transcription,
        quote,
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
