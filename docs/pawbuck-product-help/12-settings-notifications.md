# Settings and notifications

## Where everything lives

There is **no standalone Settings screen** in current builds: the **`/settings` route** redirects to **Profile**. Use **Profile** for account hero (edit phone/address), **My Pets**, **Reminders**, **Settings** rows, **Help & Support**, **Log out**, and **Delete account**.

## Notifications (system)

Under **Profile** → **Settings** list, tap **Notifications** → **Manage alerts** to open the **iOS / Android system Settings** page for PawBuck so you can allow or deny push and banners. If the OS cannot open settings, the app shows a short message telling you to open Settings manually.

Push may be limited or absent on simulators.

## Reminders (in Profile)

The **Reminders** section (between **My Pets** and the **Settings** list) controls:

- **Daily journal prompt** — local notification on this device (default **8 PM**); you can pick an evening hour or turn the prompt off.
- **Insurance & travel expiry alerts** — server push when a saved policy or certificate is nearing expiry (staged reminders such as 30, 7, and 1 days, plus day-of, depending on product configuration).
- **Vet appointment alerts** — push about **24 hours** and about **1 hour** before a **confirmed** in-app booking, when enabled.

Toggling these updates your saved preferences and refreshes scheduled notifications where applicable.

## Appearance

Under **Profile** → **Settings**, **Appearance** toggles **light** and **dark** each time you tap (the row subtitle may mention system default in some builds; behavior is a light/dark flip in the current theme provider).

## Privacy row

**Privacy & Security** opens a short in-app summary; for deeper questions, use **Contact Us** under Help & Support.
