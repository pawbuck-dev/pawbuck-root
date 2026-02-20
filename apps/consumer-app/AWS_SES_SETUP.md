# AWS SES Setup Guide

The `send-message` Edge Function requires AWS SES (Simple Email Service) credentials to send emails. If you're getting the error "Edge Function returned a non-2xx status code", it's likely because AWS SES credentials are not configured.

## Required Environment Variables

You need to set these environment variables in your Supabase project:

1. **AWS_SES_ACCESS_KEY_ID** - Your AWS access key ID
2. **AWS_SES_SECRET_ACCESS_KEY** - Your AWS secret access key
3. **AWS_SES_REGION** - AWS region (e.g., `us-east-1`, `us-west-2`)
4. **SES_FROM_EMAIL** - Verified sender email address (e.g., `noreply@yourdomain.com`)
5. **SES_FROM_NAME** - Display name for emails (e.g., `PawBuck`)
6. **EMAIL_DOMAIN** - Domain for reply-to addresses (e.g., `yourdomain.com`)
7. **APP_URL** - Your app URL (e.g., `https://app.yourdomain.com`)

## Step-by-Step Setup

### 1. Set Up AWS SES

1. **Go to AWS SES Console**
   - Navigate to https://console.aws.amazon.com/ses/
   - Select your region (e.g., `us-east-1`)

2. **Verify Your Email Address (Sandbox Mode)**
   - In sandbox mode, you can only send to verified email addresses
   - Go to "Verified identities" → "Create identity"
   - Choose "Email address"
   - Enter your email and verify it
   - **For testing**: Verify the recipient email addresses you want to test with

3. **Request Production Access (Optional but Recommended)**
   - In sandbox mode, you can only send to verified emails
   - Go to "Account dashboard" → "Request production access"
   - Fill out the form explaining your use case
   - Wait for approval (usually 24-48 hours)

4. **Verify Your Domain (Recommended for Production)**
   - Go to "Verified identities" → "Create identity"
   - Choose "Domain"
   - Enter your domain name
   - Add the DNS records to your domain's DNS settings
   - Wait for verification

### 2. Create an IAM User for SES

1. **Go to IAM Console**
   - Navigate to https://console.aws.amazon.com/iam/

2. **Create a New User**
   - Click "Users" → "Add users"
   - Enter a username (e.g., `ses-email-sender`)
   - Select "Provide user access to the AWS Management Console" (optional) or "Access key - Programmatic access"
   - Click "Next"

3. **Attach Policies**
   - Select "Attach policies directly"
   - Search for and select `AmazonSESFullAccess` (or create a custom policy with only the permissions you need)
   - Click "Next" → "Create user"

4. **Save Credentials**
   - Click "Create access key"
   - Choose "Application running outside AWS"
   - Copy the **Access key ID** and **Secret access key**
   - ⚠️ **Important**: Save these securely - you won't be able to see the secret key again!

### 3. Configure Supabase Edge Function Secrets

1. **Go to Supabase Dashboard**
   - Navigate to your project: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Set Edge Function Secrets**
   - Go to "Settings" → "Edge Functions" → "Secrets"
   - Or use the CLI:
     ```bash
     supabase secrets set AWS_SES_ACCESS_KEY_ID=your_access_key_id
     supabase secrets set AWS_SES_SECRET_ACCESS_KEY=your_secret_access_key
     supabase secrets set AWS_SES_REGION=us-east-1
     supabase secrets set SES_FROM_EMAIL=noreply@yourdomain.com
     supabase secrets set SES_FROM_NAME=PawBuck
     supabase secrets set EMAIL_DOMAIN=yourdomain.com
     supabase secrets set APP_URL=https://app.yourdomain.com
     ```

3. **Redeploy the Function** (if already deployed)
   ```bash
   supabase functions deploy send-message
   ```

### 4. Test the Configuration

Run the test script:
```bash
npx tsx scripts/test-send-message.ts
```

Or test manually in your app by sending a message.

## Troubleshooting

### Error: "AWS SES credentials not configured"
- **Solution**: Make sure all required environment variables are set in Supabase Edge Function secrets
- Verify secrets are set: Check Supabase Dashboard → Settings → Edge Functions → Secrets

### Error: "MessageRejected" or "InvalidParameterValue"
- **Solution**: 
  - If in sandbox mode, make sure the recipient email is verified in AWS SES
  - Check that the sender email (`SES_FROM_EMAIL`) is verified
  - Verify the email format is correct

### Error: "AccessDenied" or "UnauthorizedOperation"
- **Solution**: 
  - Check that the IAM user has `AmazonSESFullAccess` policy (or appropriate SES permissions)
  - Verify the AWS credentials are correct
  - Check that the region matches your SES setup

### Error: "Throttling" or "ServiceUnavailable"
- **Solution**: 
  - AWS SES has rate limits (especially in sandbox mode: 200 emails/day, 1 email/second)
  - Wait a few minutes and try again
  - Request production access for higher limits

### Emails Not Being Received
- **Check spam folder**
- **Verify sender email** is verified in AWS SES
- **Verify recipient email** (if in sandbox mode)
- **Check AWS SES sending statistics** in the AWS console
- **Check AWS CloudWatch logs** for SES errors

## AWS SES Limits (Sandbox Mode)

- **Sending quota**: 200 emails per day
- **Sending rate**: 1 email per second
- **Recipients**: Only verified email addresses or domains
- **Production access**: Removes these limits

## Security Best Practices

1. **Use IAM roles** instead of access keys when possible (if running on AWS infrastructure)
2. **Limit permissions**: Create a custom IAM policy with only the permissions needed:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "ses:SendEmail",
           "ses:SendRawEmail"
         ],
         "Resource": "*"
       }
     ]
   }
   ```
3. **Rotate access keys** regularly
4. **Never commit secrets** to version control
5. **Use environment-specific configurations** (dev/staging/production)

## Quick Checklist

- [ ] AWS SES account set up
- [ ] Email address verified in SES
- [ ] IAM user created with SES permissions
- [ ] Access key ID and secret access key saved
- [ ] All environment variables set in Supabase
- [ ] Edge function redeployed (if needed)
- [ ] Test email sent successfully

## Need Help?

1. Check AWS SES console for error details
2. Review Supabase function logs:
   - Go to Supabase Dashboard → Edge Functions → send-message → Logs
3. Test with the script: `npx tsx scripts/test-send-message.ts`
4. Check AWS CloudWatch logs for SES errors

