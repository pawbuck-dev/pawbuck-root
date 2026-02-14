# Email Reply Cleaning Recommendations

## Problem Statement

The biggest technical hurdle in bidirectional messaging is cleaning email replies. Vets often reply with the entire previous email thread quoted below their new message. If you don't strip this quoted content, your app's chat UI will become unreadable.

## Solution Overview

We've implemented an email cleaner utility (`emailCleaner.ts`) that automatically strips quoted/replied text from email bodies. This cleaner is integrated into the email parsing pipeline, so all inbound emails are automatically cleaned before being stored.

## Implementation

### 1. Email Cleaner Utility (`emailCleaner.ts`)

The cleaner handles:

- **Plain Text Quotes**: Removes lines starting with `>`, `|`, email headers (From:, To:, Subject:, etc.)
- **HTML Blockquotes**: Removes `<blockquote>` tags and quote-styled divs
- **Reply Separators**: Detects and removes common separators like "-----Original Message-----"
- **Multi-language Patterns**: Handles English, French, German, Spanish reply patterns
- **Smart Detection**: Uses heuristics to identify where the new message ends and quoted content begins

### 2. Integration Point

The cleaner is integrated into `emailParser.ts`, so it runs automatically for all parsed emails:

```typescript
const { cleanedText, cleanedHtml } = cleanEmailReply(
  email.text || null,
  email.html || null
);
```

This ensures that:
- All inbound emails are cleaned before storage
- The cleaning happens at parse time, not at display time
- We preserve both text and HTML versions (cleaned)

## Best Practices & Recommendations

### 1. **Always Clean at Parse Time**

✅ **Do**: Clean emails when parsing (as we do now)
❌ **Don't**: Clean emails in the UI or at display time

**Reasoning**: Cleaning at parse time ensures consistency and performance. The cleaned content is what's stored in the database, so the UI always displays clean messages.

### 2. **Prefer Text Body for Cleaning**

✅ **Do**: Use plain text body for quote detection (more reliable)
❌ **Don't**: Rely solely on HTML for cleaning

**Reasoning**: Plain text quote markers (`>`, `|`, headers) are more consistent across email clients than HTML styling. HTML cleaning is supplementary.

### 3. **Preserve Original Content When Possible**

✅ **Do**: Store both cleaned and original (if needed for debugging)
❌ **Don't**: Lose original content permanently

**Current Implementation**: We only store cleaned content. If you need to debug quote cleaning issues, consider:
- Logging original vs cleaned lengths (we do this)
- Storing original in a separate field for debugging
- Adding a flag to disable cleaning for specific emails

### 4. **Handle Edge Cases Gracefully**

The cleaner includes fallbacks:

- If cleaning removes all content, fallback to first 500 chars of original
- If HTML cleaning fails, fallback to HTML tag stripping
- Multiple cleaning passes to catch nested quotes

### 5. **Monitor Cleaning Effectiveness**

**Metrics to Track**:
- Before/after length ratios (we log this)
- User reports of incorrectly cleaned messages
- Cases where too much or too little content was removed

**Improvement Strategies**:
- Collect sample emails that are poorly cleaned
- Refine regex patterns based on real-world data
- Consider ML-based cleaning for complex cases

### 6. **Test with Real Vet Replies**

**Test Cases to Consider**:
- Simple reply with minimal quoting
- Reply with entire thread quoted
- Reply with nested quotes (multiple levels)
- HTML-only emails
- Plain text-only emails
- Multi-language replies
- Emails with signatures that look like quotes
- Emails with code blocks or formatted content

### 7. **Subject Line Cleaning (Future Enhancement)**

Consider cleaning subject lines too:
- Remove "Re:", "Fwd:", "RE:", "FW:" prefixes for cleaner display
- Normalize spacing and capitalization
- Handle multi-language prefixes

### 8. **User Controls (Optional)**

For edge cases, consider:
- "Show original message" toggle in UI
- Admin override to disable cleaning for specific threads
- User feedback mechanism to report cleaning issues

## Current Status

✅ **Implemented**:
- Email cleaner utility with comprehensive quote stripping
- Integration into email parser
- Logging of cleaning effectiveness

⏳ **Future Enhancements** (if needed):
- Store original content for debugging
- ML-based cleaning for complex cases
- Subject line cleaning
- User controls for edge cases

## Testing Recommendations

1. **Unit Tests**: Test cleaner with various quote patterns
2. **Integration Tests**: Test with real email samples from vets
3. **Monitoring**: Track cleaning metrics in production
4. **User Feedback**: Collect feedback on message readability

## Example: Before vs After Cleaning

**Before Cleaning**:
```
Thanks for the update. The results look good.

On Mon, Jan 15, 2024 at 2:30 PM, user@example.com wrote:
> Here are the test results you requested.
>
> -----Original Message-----
> From: vet@clinic.com
> To: user@example.com
> Subject: Test Results
> Date: Mon, Jan 14, 2024 at 10:00 AM
>
> Please send the test results when available.
>
> Dr. Smith
```

**After Cleaning**:
```
Thanks for the update. The results look good.
```

## Conclusion

The email cleaner is critical for maintaining a clean, readable chat UI. The current implementation handles the most common cases automatically. Monitor its effectiveness in production and refine as needed based on real-world usage patterns.

