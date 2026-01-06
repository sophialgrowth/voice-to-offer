-- Remove foreign key constraint and make user_id nullable
ALTER TABLE public.user_prompts 
DROP CONSTRAINT user_prompts_user_id_fkey;

ALTER TABLE public.user_prompts 
ALTER COLUMN user_id DROP NOT NULL;