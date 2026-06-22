-- Run in Supabase SQL Editor
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS pro_started_at timestamp with time zone;
