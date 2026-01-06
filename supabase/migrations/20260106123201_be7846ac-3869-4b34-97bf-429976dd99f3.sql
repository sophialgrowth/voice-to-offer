-- 用户表（简单名字标识）
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 用户的Prompt模板
CREATE TABLE public.user_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  dislikes INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 生成的方案历史
CREATE TABLE public.generated_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES public.user_prompts(id) ON DELETE SET NULL,
  client_name TEXT,
  input_type TEXT NOT NULL CHECK (input_type IN ('audio', 'text', 'document')),
  input_summary TEXT,
  price_list TEXT NOT NULL,
  output_markdown TEXT NOT NULL,
  is_liked BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 文档存储桶
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_proposals ENABLE ROW LEVEL SECURITY;

-- Users: anyone can create/read (simple name-based system)
CREATE POLICY "Anyone can create users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read users" ON public.users FOR SELECT USING (true);

-- User prompts: anyone can read, owner can modify
CREATE POLICY "Anyone can read prompts" ON public.user_prompts FOR SELECT USING (true);
CREATE POLICY "Users can create their prompts" ON public.user_prompts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their prompts" ON public.user_prompts FOR UPDATE USING (true);
CREATE POLICY "Users can delete their prompts" ON public.user_prompts FOR DELETE USING (true);

-- Generated proposals: anyone can CRUD (simple name-based system)
CREATE POLICY "Anyone can read proposals" ON public.generated_proposals FOR SELECT USING (true);
CREATE POLICY "Anyone can create proposals" ON public.generated_proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposals" ON public.generated_proposals FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete proposals" ON public.generated_proposals FOR DELETE USING (true);

-- Storage policies for documents bucket
CREATE POLICY "Anyone can upload documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Anyone can read documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Anyone can delete documents" ON storage.objects FOR DELETE USING (bucket_id = 'documents');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_prompts_updated_at
  BEFORE UPDATE ON public.user_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();