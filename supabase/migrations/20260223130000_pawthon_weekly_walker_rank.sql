-- Weekly walker board: distinct users with ≥1 walk this ISO week (UTC Monday), ranked by total meters.

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
totals AS (
  SELECT
    ws.user_id,
    SUM(ws.distance_meters)::numeric AS meters
  FROM public.walk_sessions ws
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

REVOKE ALL ON FUNCTION public.pawthon_my_weekly_walker_rank() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pawthon_my_weekly_walker_rank() TO authenticated;

COMMENT ON FUNCTION public.pawthon_my_weekly_walker_rank() IS 'Pawthon: current user weekly rank by walk distance vs distinct walkers this UTC ISO week; rank NULL if user has no walks.';
