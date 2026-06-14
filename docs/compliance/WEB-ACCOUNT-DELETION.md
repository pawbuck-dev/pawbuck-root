# Web account deletion path (Google Play / store parity)

Users can delete their PawBuck account without installing the app:

## Self-service (preferred)

1. Sign in at **https://app.pawbuck.com** (or the current consumer web entry if deployed).
2. Open **Profile** → **Delete account**.
3. Confirm scheduling. Deletion completes after the **7-day grace period** (cancel anytime from Profile while signed in).

## Email request

Email **privacy@pawbuck.com** from the address on the account with subject **Account deletion**. We verify ownership and schedule the same 7-day grace deletion flow.

## What is deleted

See [DATA-INVENTORY.md](./DATA-INVENTORY.md). After grace: Postgres rows via `erase_user_data`, Storage objects, and Auth user record.

## Data export before deletion

Profile → **Download my data** (async email link) or email privacy@pawbuck.com.
