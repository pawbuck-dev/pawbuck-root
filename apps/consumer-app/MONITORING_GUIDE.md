# Email Processing Monitoring Guide

## Overview

Comprehensive monitoring has been added to the `process-pet-mail` function to track email processing status, identify stuck emails, and measure performance.

## Monitoring Features

### 1. Timestamped Logging
All log messages are prefixed with `[MONITORING]` for easy filtering.

### 2. Processing Stages Tracking
Each major stage logs:
- Start time
- Duration
- Success/failure status
- Key metrics

### 3. Timing Metrics
- **Total processing time**: From request start to completion
- **S3 fetch time**: Time to download email from S3
- **Email parsing time**: Time to parse and clean email
- **Message storage time**: Time to store inbound message
- **Attachment processing time**: Time to process all attachments

### 4. Stuck Email Detection
The system detects emails that have been in "processing" status for more than 5 minutes and logs a warning.

### 5. Error Handling
- All errors are logged with stack traces
- Emails are marked as "completed" (with `success: false`) even on errors
- Prevents emails from staying in "processing" status indefinitely

## Log Messages

### Lock Acquisition
```
[MONITORING] 🔒 Acquired processing lock for: {s3Key}
```
or
```
[MONITORING] ⚠️ Lock already exists for: {s3Key}, checking status...
[MONITORING] Existing lock status: {status} (age: {minutes}m)
```

### Processing Stages
```
[MONITORING] Fetching email from S3: {bucket}/{fileKey}
[MONITORING] ✅ Email fetched from S3 ({duration}ms, size: {bytes} bytes)
[MONITORING] Parsing email...
[MONITORING] ✅ Email parsed ({duration}ms)
[MONITORING] Starting message storage (text body length: {length})
[MONITORING] ✅ Stored inbound message for thread {threadId} ({duration}ms)
[MONITORING] Starting attachment processing ({count} attachments)
[MONITORING] ✅ Attachment processing completed ({duration}ms, {count} processed)
```

### Completion
```
[MONITORING] Marking email as completed (total duration: {duration}ms, attachments: {count}, message stored: {true/false})
[MONITORING] ✅ Email processing completed successfully in {duration}ms
```

### Errors
```
[MONITORING] ❌ Error processing email (duration: {duration}ms): {errorMessage}
[MONITORING] Marking email as completed with failure status
```

### Stuck Email Warning
```
[MONITORING] ⚠️ Email has been in 'processing' status for {minutes} minutes (s3Key: {s3Key}) - may be stuck
```

## Monitoring Queries

### Check Processing Status
```sql
-- View all emails currently being processed
SELECT 
  s3_key,
  status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as age_minutes
FROM processed_emails
WHERE status = 'processing'
ORDER BY created_at DESC;
```

### Find Stuck Emails (> 5 minutes)
```sql
-- Find emails stuck in processing for more than 5 minutes
SELECT 
  s3_key,
  status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as age_minutes
FROM processed_emails
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '5 minutes'
ORDER BY created_at ASC;
```

### Processing Statistics
```sql
-- View processing statistics
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM processed_emails
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### Failed Processing
```sql
-- View failed email processing
SELECT 
  s3_key,
  pet_id,
  attachment_count,
  success,
  created_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - created_at)) / 60 as duration_minutes
FROM processed_emails
WHERE success = false
ORDER BY completed_at DESC
LIMIT 50;
```

## Troubleshooting

### Email Stuck in "processing" Status

**Possible Causes:**
1. Function crashed/errored before marking as completed
2. Function timeout
3. Long-running operation (large attachments, slow API calls)

**Solutions:**
1. Check function logs for errors around the time the email was processed
2. Check for timeout errors (Edge Functions have execution limits)
3. Manually update status if needed (for testing/debugging):
   ```sql
   UPDATE processed_emails
   SET status = 'completed', success = false, completed_at = NOW()
   WHERE s3_key = '{s3Key}';
   ```

### High Processing Times

**Check:**
- S3 fetch time (network latency)
- Attachment processing time (number/size of attachments)
- Message storage time (database performance)
- Email parsing time (email size/complexity)

**Optimize:**
- Check for large attachments
- Review database query performance
- Consider parallel processing for multiple attachments

### Missing Logs

**Check:**
- Function logs in Supabase dashboard
- CloudWatch logs (if configured)
- Edge Function execution logs

## Best Practices

1. **Regular Monitoring**: Check for stuck emails daily
2. **Alert Setup**: Set up alerts for emails stuck > 10 minutes
3. **Performance Baseline**: Track average processing times to identify degradation
4. **Error Review**: Regularly review failed processing to identify patterns
5. **Log Retention**: Keep logs for at least 7 days for troubleshooting

## Metrics to Track

- **Processing Time**: Average, median, p95, p99
- **Success Rate**: Percentage of successfully processed emails
- **Stuck Email Rate**: Percentage of emails stuck > 5 minutes
- **Error Rate**: Percentage of emails that fail processing
- **Attachment Processing Time**: Time per attachment
- **Message Storage Time**: Time to store messages

## Alert Thresholds (Recommended)

- ⚠️ **Warning**: Email in "processing" > 5 minutes
- 🔴 **Critical**: Email in "processing" > 15 minutes
- ⚠️ **Warning**: Processing time > 30 seconds (p95)
- 🔴 **Critical**: Error rate > 5%
- ⚠️ **Warning**: Stuck email rate > 1%

