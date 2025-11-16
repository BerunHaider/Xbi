-- Direct fix: Update ONLY the 9 remaining functions with SET search_path = public
-- These are the exact functions that still show errors in the linter

-- 1. toggle_like - Update directly without CASCADE
ALTER FUNCTION public.toggle_like(BIGINT, UUID) SET search_path = public;

-- 2. get_timeline_feed
ALTER FUNCTION public.get_timeline_feed(UUID, INT) SET search_path = public;

-- 3. toggle_retweet
ALTER FUNCTION public.toggle_retweet(BIGINT, UUID) SET search_path = public;

-- 4. update_presence
ALTER FUNCTION public.update_presence(UUID, VARCHAR) SET search_path = public;

-- 5. create_poll
ALTER FUNCTION public.create_poll(UUID, TEXT, TEXT[], INT) SET search_path = public;

-- 6. vote_poll
ALTER FUNCTION public.vote_poll(BIGINT, BIGINT, UUID) SET search_path = public;

-- 7. create_media_entry
ALTER FUNCTION public.create_media_entry(UUID, TEXT, VARCHAR) SET search_path = public;

-- 8. enable_2fa
ALTER FUNCTION public.enable_2fa(UUID, TEXT) SET search_path = public;

-- 9. disable_2fa
ALTER FUNCTION public.disable_2fa(UUID) SET search_path = public;
