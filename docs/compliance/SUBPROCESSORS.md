# PawBuck subprocessors (engineering reference)

**Not legal advice.** Maintain with counsel; link from privacy policy.

| Processor | Purpose | Data categories | Region (v1) | DPA |
|-----------|---------|-----------------|-------------|-----|
| Supabase | Postgres, Auth, Storage, Edge Functions | Account, health, location, AI, comms | us-east-1 | Supabase DPA |
| Google (Gemini) | Milo chat, OCR/classification, embeddings | Health text, AI queries, document images | US (API) | Google Cloud DPA — confirm no training on customer data |
| Mailgun | Inbound pet email, export delivery | Email content, attachments | US/EU per account | Mailgun DPA |
| RevenueCat | Subscription entitlements | Account, purchase metadata | US | RevenueCat DPA |
| Expo | Push notifications | Device push tokens | US | Expo terms |
| Amazon Web Services | PawBuck.API hosting (ECS), admin static (S3/CloudFront) | API traffic, logs | us-east-1 | AWS DPA |

Update this table when adding vendors or changing regions.
