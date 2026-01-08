# Quick Fix: Edge Function Error

If you're seeing the error **"Edge Function returned a non-2xx status code"** when sending messages, it's most likely because **AWS SES credentials are not configured**.

## Quick Fix (5 minutes)

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
   - Go to **Settings** → **Edge Functions** → **Secrets**

2. **Add the required secrets:**
   - `AWS_SES_ACCESS_KEY_ID` - Your AWS access key
   - `AWS_SES_SECRET_ACCESS_KEY` - Your AWS secret key
   - `AWS_SES_REGION` - e.g., `us-east-1`
   - `SES_FROM_EMAIL` - Your verified email (e.g., `noreply@yourdomain.com`)
   - `SES_FROM_NAME` - Display name (e.g., `PawBuck`)
   - `EMAIL_DOMAIN` - Your domain (e.g., `yourdomain.com`)
   - `APP_URL` - Your app URL (e.g., `https://app.yourdomain.com`)

3. **Redeploy the function:**
   ```bash
   supabase functions deploy send-message
   ```

### Option 2: Using CLI

```bash
# Set all secrets at once
supabase secrets set \
  AWS_SES_ACCESS_KEY_ID=your_access_key \
  AWS_SES_SECRET_ACCESS_KEY=your_secret_key \
  AWS_SES_REGION=us-east-1 \
  SES_FROM_EMAIL=noreply@yourdomain.com \
  SES_FROM_NAME=PawBuck \
  EMAIL_DOMAIN=yourdomain.com \
  APP_URL=https://app.yourdomain.com

# Redeploy
supabase functions deploy send-message
```

## Don't Have AWS SES Set Up Yet?

1. **Set up AWS SES** (see `AWS_SES_SETUP.md` for detailed instructions)
2. **Verify your email** in AWS SES Console
3. **Create an IAM user** with SES permissions
4. **Get access keys** from IAM
5. **Add secrets** to Supabase (steps above)

## Testing

After configuring, test the function:

```bash
npx tsx scripts/test-send-message.ts
```

Or test in the app by sending a message.

## Common Issues

- **"AWS SES credentials not configured"** → Secrets not set in Supabase
- **"MessageRejected"** → Email not verified in AWS SES (sandbox mode)
- **"AccessDenied"** → IAM user doesn't have SES permissions
- **"Throttling"** → Rate limit reached (sandbox: 200 emails/day)

See `AWS_SES_SETUP.md` for detailed troubleshooting.

