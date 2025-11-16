-- Fix RLS Security Issues
-- Enable RLS on all public tables that are missing it

-- 1. Enable RLS on bookmarks (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookmarks' AND table_schema = 'public') THEN
    ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.bookmarks;
    CREATE POLICY "Users can view their own bookmarks"
      ON public.bookmarks FOR SELECT
      USING (auth.uid() = COALESCE(user_id, author_id));

    DROP POLICY IF EXISTS "Users can create their own bookmarks" ON public.bookmarks;
    CREATE POLICY "Users can create their own bookmarks"
      ON public.bookmarks FOR INSERT
      WITH CHECK (auth.uid() = COALESCE(user_id, author_id));

    DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.bookmarks;
    CREATE POLICY "Users can delete their own bookmarks"
      ON public.bookmarks FOR DELETE
      USING (auth.uid() = COALESCE(user_id, author_id));
  END IF;
END $$;

-- 2. Enable RLS on reports (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports' AND table_schema = 'public') THEN
    ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view reports (admins see all)" ON public.reports;
    CREATE POLICY "Users can view reports (admins see all)"
      ON public.reports FOR SELECT
      USING (true);

    DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
    CREATE POLICY "Users can create reports"
      ON public.reports FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- 3. Enable RLS on presence (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'presence' AND table_schema = 'public') THEN
    ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their own presence" ON public.presence;
    CREATE POLICY "Users can view their own presence"
      ON public.presence FOR SELECT
      USING (auth.uid() = COALESCE(user_id, author_id));

    DROP POLICY IF EXISTS "Users can update their own presence" ON public.presence;
    CREATE POLICY "Users can update their own presence"
      ON public.presence FOR UPDATE
      USING (auth.uid() = COALESCE(user_id, author_id));

    DROP POLICY IF EXISTS "Users can insert their own presence" ON public.presence;
    CREATE POLICY "Users can insert their own presence"
      ON public.presence FOR INSERT
      WITH CHECK (auth.uid() = COALESCE(user_id, author_id));
  END IF;
END $$;

-- 4. Enable RLS on retweets (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'retweets' AND table_schema = 'public') THEN
    ALTER TABLE public.retweets ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view retweets" ON public.retweets;
    CREATE POLICY "Users can view retweets"
      ON public.retweets FOR SELECT
      USING (true);

    DROP POLICY IF EXISTS "Users can create their own retweets" ON public.retweets;
    CREATE POLICY "Users can create their own retweets"
      ON public.retweets FOR INSERT
      WITH CHECK (auth.uid() = COALESCE(user_id, author_id));

    DROP POLICY IF EXISTS "Users can delete their own retweets" ON public.retweets;
    CREATE POLICY "Users can delete their own retweets"
      ON public.retweets FOR DELETE
      USING (auth.uid() = COALESCE(user_id, author_id));
  END IF;
END $$;

-- 5. Enable RLS on media (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media' AND table_schema = 'public') THEN
    ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view media" ON public.media;
    CREATE POLICY "Users can view media"
      ON public.media FOR SELECT
      USING (true);

    DROP POLICY IF EXISTS "Users can upload media" ON public.media;
    CREATE POLICY "Users can upload media"
      ON public.media FOR INSERT
      WITH CHECK (auth.uid() = COALESCE(user_id, author_id));

    DROP POLICY IF EXISTS "Users can delete their own media" ON public.media;
    CREATE POLICY "Users can delete their own media"
      ON public.media FOR DELETE
      USING (auth.uid() = COALESCE(user_id, author_id));
  END IF;
END $$;

-- 6. Enable RLS on polls (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'polls' AND table_schema = 'public') THEN
    ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view polls" ON public.polls;
    CREATE POLICY "Users can view polls"
      ON public.polls FOR SELECT
      USING (true);

    DROP POLICY IF EXISTS "Users can create their own polls" ON public.polls;
    CREATE POLICY "Users can create their own polls"
      ON public.polls FOR INSERT
      WITH CHECK (auth.uid() = COALESCE(user_id, author_id));

    DROP POLICY IF EXISTS "Users can update their own polls" ON public.polls;
    CREATE POLICY "Users can update their own polls"
      ON public.polls FOR UPDATE
      USING (auth.uid() = COALESCE(user_id, author_id));

    DROP POLICY IF EXISTS "Users can delete their own polls" ON public.polls;
    CREATE POLICY "Users can delete their own polls"
      ON public.polls FOR DELETE
      USING (auth.uid() = COALESCE(user_id, author_id));
  END IF;
END $$;

-- 7. Enable RLS on poll_options (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'poll_options' AND table_schema = 'public') THEN
    ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view poll options" ON public.poll_options;
    CREATE POLICY "Users can view poll options"
      ON public.poll_options FOR SELECT
      USING (true);

    DROP POLICY IF EXISTS "Users can manage poll options" ON public.poll_options;
    CREATE POLICY "Users can manage poll options"
      ON public.poll_options FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- 8. Enable RLS on poll_votes (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'poll_votes' AND table_schema = 'public') THEN
    ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view poll votes" ON public.poll_votes;
    CREATE POLICY "Users can view poll votes"
      ON public.poll_votes FOR SELECT
      USING (true);

    DROP POLICY IF EXISTS "Users can vote in polls" ON public.poll_votes;
    CREATE POLICY "Users can vote in polls"
      ON public.poll_votes FOR INSERT
      WITH CHECK (auth.uid() = COALESCE(user_id, author_id));
  END IF;
END $$;

-- 9. Enable RLS on user_2fa (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_2fa' AND table_schema = 'public') THEN
    ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their own 2FA" ON public.user_2fa;
    CREATE POLICY "Users can view their own 2FA"
      ON public.user_2fa FOR SELECT
      USING (auth.uid() = COALESCE(user_id, id));

    DROP POLICY IF EXISTS "Users can manage their own 2FA" ON public.user_2fa;
    CREATE POLICY "Users can manage their own 2FA"
      ON public.user_2fa FOR INSERT
      WITH CHECK (auth.uid() = COALESCE(user_id, id));

    DROP POLICY IF EXISTS "Users can update their own 2FA" ON public.user_2fa;
    CREATE POLICY "Users can update their own 2FA"
      ON public.user_2fa FOR UPDATE
      USING (auth.uid() = COALESCE(user_id, id));
  END IF;
END $$;
