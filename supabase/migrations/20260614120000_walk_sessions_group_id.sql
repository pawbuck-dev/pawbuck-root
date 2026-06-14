-- Multi-pet walks: link duplicate session rows (one per pet) with a shared walk_group_id.
-- Per-pet streaks/goals credit full distance; leaderboard dedupes by group below.

ALTER TABLE public.walk_sessions
  ADD COLUMN IF NOT EXISTS walk_group_id uuid;

CREATE INDEX IF NOT EXISTS walk_sessions_walk_group_id_idx
  ON public.walk_sessions (walk_group_id)
  WHERE walk_group_id IS NOT NULL;

COMMENT ON COLUMN public.walk_sessions.walk_group_id IS
  'Optional shared id when one GPS walk is credited to multiple pets (one row per pet).';

-- Weekly walker rank: sum distance once per walk (group by walk_group_id or session id).
CREATE OR REPLACE FUNCTION public.pawthon_my_weekly_walker_rank()
RETURNS TABLE(rank bigint, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH week_start AS (
  SELECT (date_trunc('week', timezone('utc', now())) AT TIME ZONE 'UTC') AS ws
),
deduped_walks AS (
  SELECT
    ws.user_id,
    COALESCE(ws.walk_group_id, ws.id) AS walk_key,
    MAX(ws.distance_meters)::numeric AS distance_meters
  FROM public.walk_sessions ws
  CROSS JOIN week_start s
  WHERE ws.ended_at >= s.ws
  GROUP BY ws.user_id, COALESCE(ws.walk_group_id, ws.id)
),
totals AS (
  SELECT
    d.user_id,
    SUM(d.distance_meters)::numeric AS meters
  FROM deduped_walks d
  GROUP BY d.user_id
),
ranked AS (
  SELECT
    t.user_id,
    ROW_NUMBER() OVER (ORDER BY t.meters DESC, t.user_id ASC)::bigint AS rk
  FROM totals t
),
counts AS (
  SELECT COUNT(*)::bigint AS tot FROM totals
)
SELECT
  (SELECT r.rk FROM ranked r WHERE r.user_id = auth.uid()) AS rank,
  (SELECT c.tot FROM counts c) AS total;
$$;

COMMENT ON FUNCTION public.pawthon_my_weekly_walker_rank() IS
  'Pawthon: current user weekly rank by walk distance vs distinct walkers this UTC ISO week; dedupes multi-pet walks by walk_group_id.';

-- Country-scoped weekly rank: same dedupe by walk_group_id.
CREATE OR REPLACE FUNCTION public.pawthon_my_weekly_walker_rank_for_country(p_country text)
RETURNS TABLE(rank bigint, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH cohort AS (
  SELECT DISTINCT p.user_id
  FROM public.pets p
  WHERE trim(COALESCE(p_country, '')) <> ''
    AND lower(trim(p.country)) = lower(trim(p_country))
),
week_start AS (
  SELECT (date_trunc('week', timezone('utc', now())) AT TIME ZONE 'UTC') AS ws
),
deduped_walks AS (
  SELECT
    ws.user_id,
    COALESCE(ws.walk_group_id, ws.id) AS walk_key,
    MAX(ws.distance_meters)::numeric AS distance_meters
  FROM public.walk_sessions ws
  INNER JOIN cohort c ON c.user_id = ws.user_id
  CROSS JOIN week_start s
  WHERE ws.ended_at >= s.ws
  GROUP BY ws.user_id, COALESCE(ws.walk_group_id, ws.id)
),
totals AS (
  SELECT
    d.user_id,
    SUM(d.distance_meters)::numeric AS meters
  FROM deduped_walks d
  GROUP BY d.user_id
),
ranked AS (
  SELECT
    t.user_id,
    ROW_NUMBER() OVER (ORDER BY t.meters DESC, t.user_id ASC)::bigint AS rk
  FROM totals t
),
counts AS (
  SELECT COUNT(*)::bigint AS tot FROM totals
)
SELECT
  (SELECT r.rk FROM ranked r WHERE r.user_id = auth.uid()) AS rank,
  (SELECT c.tot FROM counts c) AS total;
$$;

COMMENT ON FUNCTION public.pawthon_my_weekly_walker_rank_for_country(text) IS
  'Pawthon: weekly rank by walk distance among walkers who own a pet in the given country; dedupes multi-pet walks by walk_group_id.';
