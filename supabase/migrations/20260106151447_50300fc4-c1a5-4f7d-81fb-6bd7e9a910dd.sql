-- Add price_lists table for version management
CREATE TABLE public.price_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_name TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  dislikes INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;

-- Everyone can read all price lists
CREATE POLICY "Anyone can read price lists"
ON public.price_lists
FOR SELECT
USING (true);

-- Everyone can create price lists
CREATE POLICY "Anyone can create price lists"
ON public.price_lists
FOR INSERT
WITH CHECK (true);

-- Everyone can update price lists
CREATE POLICY "Anyone can update price lists"
ON public.price_lists
FOR UPDATE
USING (true);

-- Everyone can delete price lists
CREATE POLICY "Anyone can delete price lists"
ON public.price_lists
FOR DELETE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_price_lists_updated_at
BEFORE UPDATE ON public.price_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Modify user_prompts to use creator_name instead of user_id reference
ALTER TABLE public.user_prompts 
ADD COLUMN creator_name TEXT;

-- Update generated_proposals to not require user_id
ALTER TABLE public.generated_proposals 
ALTER COLUMN user_id DROP NOT NULL;

-- Add conversation_history column for context
ALTER TABLE public.generated_proposals
ADD COLUMN conversation_history JSONB DEFAULT '[]'::jsonb;