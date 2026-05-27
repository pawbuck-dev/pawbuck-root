# Email ops deploy checklist (no app store update)

Use this when rolling out email/OCR pipeline fixes. Owners on existing app builds benefit immediately after Edge + API deploy.

## 1. PawBuck.API (ECS / GitHub Actions)

- [ ] `Milo__InternalServiceKey` set (same value as Supabase Edge `MILO_INTERNAL_SERVICE_KEY`)
- [ ] `Supabase__Url`, `Supabase__ServiceRoleKey`, `Supabase__ConnectionString` set
- [ ] `Gemini__ApiKey` set (analyze-internal vision)
- [ ] Deploy via `.github/workflows/deploy-aws.yml` or your ECS pipeline
- [ ] Verify: `GET https://api.pawbuck.com/api/health` → `miloAnalyzeInternalConfigured: true`
- [ ] Admin: **Email ops → Check pipeline health** → all checks green

## 2. Supabase Edge

```bash
supabase functions deploy mailgun-process-pet-mail --project-ref <YOUR_PROJECT_REF>
```

Edge secrets (Supabase dashboard → Edge Functions → Secrets):

- [ ] `PAWBUCK_API_URL` = `https://api.pawbuck.com` (no trailing slash)
- [ ] `MILO_INTERNAL_SERVICE_KEY` = matches API `Milo__InternalServiceKey`
- [ ] `GOOGLE_GEMINI_API_KEY`
- [ ] `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `MAILGUN_SECRET` / `MAILGUN_API_KEY` (inbound)

## 3. Postgres tuning (instant, no deploy)

- [ ] Admin **Settings → Email verification** — adjust country rules if breed/name false rejects
- [ ] Optional: whitelist trusted senders in `pet_email_list`

## 4. Smoke test

1. Send a test vaccination PDF to a pet inbox address
2. If it fails, owner should see **Messages → Processing errors → Confirm**
3. Admin **Processing** tab: success rate / failure categories update
4. Cofounder backup: **Email ops → Add records to pet profile** on a failed row with `stored` archive

## 5. Reprocess backlog after config fix

1. **Email ops → Check pipeline health** (green)
2. **File all ready** (or filter by owner email)
3. Confirm rows leave consumer Processing errors

See also: [`docs/EMAIL-PROCESSING-UAT.md`](EMAIL-PROCESSING-UAT.md)
