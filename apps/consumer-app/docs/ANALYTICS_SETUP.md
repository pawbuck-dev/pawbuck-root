# Analytics Setup Guide

This guide explains how to set up and use the Supabase-based analytics system for tracking onboarding events.

## Setup

### 1. Run the Migration

Run the SQL migration to create the `analytics_events` table:

```bash
# Using Supabase CLI
supabase migration up

# Or manually run the SQL file in Supabase Dashboard
# File: supabase/migrations/create_analytics_events_table.sql
```

### 2. Verify Table Creation

In Supabase Dashboard:
1. Go to Table Editor
2. Verify `analytics_events` table exists with columns:
   - `id` (UUID, primary key)
   - `event_type` (TEXT)
   - `user_id` (UUID, nullable, references auth.users)
   - `metadata` (JSONB, nullable)
   - `created_at` (TIMESTAMPTZ)

### 3. Check RLS Policies

The migration creates Row Level Security policies:
- Users can insert their own events (or null user_id for anonymous)
- Users can read their own events
- Service role can read all events (if uncommented)

## Usage

### Tracking Events

Events are automatically tracked when:
- Email onboarding modal is shown/completed
- Health records tooltip is shown/completed
- Onboarding is reset from settings

### Querying Analytics

#### Get Overall Completion Rates

```typescript
import { getOnboardingAnalytics } from "@/utils/analyticsQueries";

const analytics = await getOnboardingAnalytics();
console.log(analytics);
// {
//   emailOnboarding: {
//     shown: 150,
//     completed: 120,
//     completionRate: 0.8,
//     lastShown: "2024-01-15T10:30:00Z",
//     lastCompleted: "2024-01-15T10:31:00Z"
//   },
//   healthRecordsTooltip: { ... },
//   totalUsers: 100,
//   totalEvents: 300
// }
```

#### Get Events by Type

```typescript
import { getEventsByType } from "@/utils/analyticsQueries";

// Get all email onboarding completions
const completions = await getEventsByType("email_onboarding_completed");

// Get events in date range
const recentEvents = await getEventsByType(
  "email_onboarding_shown",
  "2024-01-01",
  "2024-01-31"
);
```

#### Get Daily Completion Rates

```typescript
import { getDailyCompletionRates } from "@/utils/analyticsQueries";

// Get last 30 days
const dailyRates = await getDailyCompletionRates(30);
// [
//   {
//     date: "2024-01-15",
//     emailShown: 10,
//     emailCompleted: 8,
//     emailCompletionRate: 0.8,
//     tooltipShown: 5,
//     tooltipCompleted: 4,
//     tooltipCompletionRate: 0.8
//   },
//   ...
// ]
```

## Viewing Analytics in Supabase

### Option 1: Supabase Dashboard

1. Go to Table Editor → `analytics_events`
2. Use filters to view specific event types
3. Export data for analysis

### Option 2: SQL Queries

Run queries in Supabase SQL Editor:

```sql
-- Get completion rate for email onboarding
SELECT 
  COUNT(CASE WHEN event_type = 'email_onboarding_shown' THEN 1 END) as shown,
  COUNT(CASE WHEN event_type = 'email_onboarding_completed' THEN 1 END) as completed,
  ROUND(
    COUNT(CASE WHEN event_type = 'email_onboarding_completed' THEN 1 END)::numeric /
    NULLIF(COUNT(CASE WHEN event_type = 'email_onboarding_shown' THEN 1 END), 0),
    2
  ) as completion_rate
FROM analytics_events;

-- Get events by user
SELECT 
  user_id,
  event_type,
  COUNT(*) as count,
  MAX(created_at) as last_event
FROM analytics_events
WHERE user_id IS NOT NULL
GROUP BY user_id, event_type
ORDER BY last_event DESC;

-- Get daily completion rates
SELECT 
  DATE(created_at) as date,
  event_type,
  COUNT(*) as count
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), event_type
ORDER BY date DESC, event_type;
```

## Event Types

- `email_onboarding_shown` - Email onboarding modal displayed
- `email_onboarding_completed` - User dismissed email onboarding
- `health_records_tooltip_shown` - Health records tooltip displayed
- `health_records_tooltip_completed` - User dismissed health records tooltip
- `onboarding_reset` - User reset onboarding from settings

## Metadata

Events can include metadata for additional context:

```typescript
// Example: Email onboarding includes pet email
{
  event_type: "email_onboarding_shown",
  metadata: {
    pet_email: "milo@pawbuck.app"
  }
}
```

## Troubleshooting

### Events Not Storing

1. **Check RLS Policies**: Ensure policies allow inserts
2. **Check Table Exists**: Verify `analytics_events` table exists
3. **Check Console Logs**: Look for error messages in console
4. **Check User Authentication**: Some events require authenticated user

### Permission Errors

If you see permission errors:
1. Check RLS policies in Supabase Dashboard
2. Verify user is authenticated (for user-specific events)
3. For admin queries, use service role key or adjust policies

## Next Steps

- Create Supabase dashboard views for common queries
- Set up scheduled reports
- Integrate with visualization tools (Grafana, Metabase, etc.)
- Add more event types as needed
