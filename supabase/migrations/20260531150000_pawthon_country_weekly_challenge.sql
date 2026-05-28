-- Country-scoped weekly challenge gate and leaderboard (pets.country cohort).

CREATE OR REPLACE FUNCTION public.app_registered_user_count_for_country(p_country text)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT p.user_id)::bigint
  FROM public.pets p
  WHERE trim(COALESCE(p_country, '')) <> ''
    AND lower(trim(p.country)) = lower(trim(p_country));
$$;

REVOKE ALL ON FUNCTION public.app_registered_user_count_for_country(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_registered_user_count_for_country(text) TO authenticated;

COMMENT ON FUNCTION public.app_registered_user_count_for_country(text) IS
  'Distinct pet owners with at least one pet in the given country (pets.country display name).';

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
totals AS (
  SELECT
    ws.user_id,
    SUM(ws.distance_meters)::numeric AS meters
  FROM public.walk_sessions ws
  INNER JOIN cohort c ON c.user_id = ws.user_id
  CROSS JOIN week_start s
  WHERE ws.ended_at >= s.ws
  GROUP BY ws.user_id
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

REVOKE ALL ON FUNCTION public.pawthon_my_weekly_walker_rank_for_country(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pawthon_my_weekly_walker_rank_for_country(text) TO authenticated;

COMMENT ON FUNCTION public.pawthon_my_weekly_walker_rank_for_country(text) IS
  'Pawthon: weekly rank by walk distance among walkers who own a pet in the given country this UTC ISO week.';
