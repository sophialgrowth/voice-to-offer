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
    const { audioBase64, priceList, mimeType, transcript, customPrompt, documentBase64, documentType, model } = await req.json();

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

    // Generate proposal based on transcription and price list
    const basePrompt = customPrompt || `根据客户需求推荐2个服务套餐写成《XXX x Nexad: 市场穿透与全球增长护城河构建方案》，尽量用表格形式。分成两部分：一、汇总Customer Context，二、 推荐的解决方案`;

    const quotePrompt = `${basePrompt}

以下是客户需求内容：
${transcription}

以下是公司价目表：
${priceList}

请根据以上信息生成专业的增长方案，使用Markdown格式输出。确保：
1. 准确理解客户的需求和业务背景
2. 根据客户情况推荐最合适的套餐组合
3. 使用表格清晰展示信息
4. 包含投入产出预估
5. 语言专业且有说服力`;

    console.log("Generating proposal with model:", selectedModel);

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

    console.log("Proposal generation complete");

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
