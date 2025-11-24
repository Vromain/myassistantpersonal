# Quickstart: Intelligent Message Analysis

**Feature**: 002-intelligent-message-analysis
**Version**: 1.0.0
**Last Updated**: 2025-11-19

## Overview

The Intelligent Message Analysis feature uses AI to automatically analyze your messages for spam, determine which ones need responses, and even generate reply suggestions. This guide will help you get started with the feature.

## Table of Contents

1. [Accessing Service Health](#accessing-service-health)
2. [Viewing Message Analysis](#viewing-message-analysis)
3. [Using AI Reply Suggestions](#using-ai-reply-suggestions)
4. [Enabling Auto-Delete Spam](#enabling-auto-delete-spam)
5. [Enabling Auto-Reply](#enabling-auto-reply)
6. [Troubleshooting](#troubleshooting)

## Accessing Service Health

### Step 1: Open Services Page

1. Click on your user profile icon in the top-right corner
2. Select **Services** from the dropdown menu
3. The Services page displays:
   - **Backend API**: Connection status, endpoint, and response time
   - **Ollama AI**: Availability status, active model, and available models

### Step 2: Understanding Service Status

**Status Indicators**:
- ✅ **En ligne** (Online): Service is operational
- ❌ **Hors ligne** (Offline): Service is not available
- ⚠️ **Dégradé** (Degraded): Service is experiencing issues

**Auto-Refresh**: The Services page automatically refreshes every 30 seconds. You can also pull down to manually refresh.

---

## Viewing Message Analysis

### Step 1: Access Your Dashboard

1. Navigate to the homepage/dashboard
2. Your messages are displayed with analysis badges:
   - **Red "SPAM" badge**: Message detected as spam
   - **Orange "Needs Reply" badge**: Message requires your response
   - **Green "Reviewed" badge**: Message needs no action

### Step 2: View Analysis Details

1. Click on any message to view full details
2. The message detail view shows:
   - **Spam Probability**: Percentage (0-100%) indicating likelihood of spam
   - **Sentiment**: Positive, neutral, or negative tone
   - **Priority Level**: High, medium, or low importance
   - **Response Confidence**: How certain the AI is that a reply is needed

### Step 3: Filter and Sort

- **Filter by Status**: Use filter dropdown to show only spam, needs-reply, or reviewed messages
- **Sort by Priority**: Click column header to sort by priority level

---

## Using AI Reply Suggestions

### Step 1: Open a Message Requiring Response

1. Look for messages with the **orange "Needs Reply" badge**
2. Click the message to open details

### Step 2: Review Suggested Reply

1. Scroll to the **Suggested Reply** section
2. The AI-generated reply appears in an editable text box
3. The reply is tailored to:
   - Match the original message language
   - Maintain a professional tone
   - Be concise (50-200 words)

### Step 3: Edit or Send Reply

You have four options:

1. **Edit and Send**: Modify the suggested text and click **Send Reply**
2. **Send As-Is**: If the suggestion is perfect, click **Send Reply** directly
3. **Regenerate**: Click **Regenerate** to get a different reply suggestion
4. **Dismiss**: Click **Dismiss** if you don't want to use the suggestion

---

## Enabling Auto-Delete Spam

### Step 1: Navigate to Settings

1. Click on your user profile icon in the top-right corner
2. Select **Settings** from the dropdown menu
3. Scroll to the **Message Management** section

### Step 2: Configure Auto-Delete

1. Find the **Auto-delete spam** toggle
2. Click to enable the toggle
3. A confirmation message appears: "Spam messages will be automatically deleted"
4. (Optional) Adjust the **Spam Threshold** slider:
   - Default: 80% probability
   - Higher threshold = fewer false positives, but may miss some spam
   - Lower threshold = catches more spam, but higher risk of false positives

### Step 3: Save Settings

1. Click **Save** at the bottom of the settings page
2. Your preferences are saved and applied immediately

### How Auto-Delete Works

- Messages with spam probability **≥ 80%** (or your custom threshold) are automatically moved to **Trash**
- Deleted spam remains in Trash for **30 days** before permanent deletion
- You receive a **daily summary email** showing how many spam messages were auto-deleted
- You can restore false positives from the Trash folder anytime

### Disabling Auto-Delete

1. Return to Settings > Message Management
2. Toggle **Auto-delete spam** to OFF
3. Click **Save**

---

## Enabling Auto-Reply

⚠️ **Important**: Auto-reply automatically sends AI-generated responses on your behalf. Use with caution.

### Step 1: Navigate to Settings

1. Click on your user profile icon in the top-right corner
2. Select **Settings** from the dropdown menu
3. Scroll to the **Message Management** section

### Step 2: Configure Auto-Reply

1. Find the **Auto-send replies** toggle
2. Click to enable the toggle
3. **Confirmation Dialog Appears**:
   - Read the warning: "Automatic replies will be sent for messages requiring response"
   - Click **I Understand** to proceed

### Step 3: Configure Auto-Reply Conditions

Fine-tune when auto-replies are sent:

**Sender Whitelist** (Optional):
- Add email addresses that should always receive auto-replies
- If whitelist is empty, all senders are eligible
- Example: `important@client.com`

**Sender Blacklist** (Required):
- Add email addresses that should NEVER receive auto-replies
- Prevents accidental replies to spam or unwanted senders
- Example: `noreply@newsletter.com`

**Business Hours Only**:
- Enable to send auto-replies only Monday-Friday, 9 AM - 5 PM (your timezone)
- Disabled: Auto-replies sent 24/7

**Max Replies Per Day**:
- Set daily limit to prevent spam-like behavior
- Default: 10 replies per day
- Range: 1-100

**Response Confidence Threshold**:
- Only send auto-reply if AI confidence ≥ this threshold
- Default: 85%
- Higher threshold = fewer but more certain replies

### Step 4: Save Settings

1. Review all conditions
2. Click **Save** at the bottom of the settings page
3. Auto-reply is now active

### How Auto-Reply Works

When a message arrives:
1. AI analyzes the message
2. If `needsResponse = true` AND `responseConfidence ≥ 85%`:
   3. Check sender against whitelist/blacklist
   4. Check business hours if enabled
   5. Check daily reply limit
   6. If all conditions pass, send AI-generated reply within 60 seconds

All auto-sent replies include the disclaimer:
> "This is an automated response generated by AI."

### Monitoring Auto-Replies

- **Daily Summary Email**: Receive list of auto-sent replies with links to view them
- **Sent Messages**: All auto-replies appear in your Sent folder
- **Reply Count**: View today's auto-reply count in Settings

### Disabling Auto-Reply

1. Return to Settings > Message Management
2. Toggle **Auto-send replies** to OFF
3. Click **Save**

---

## Troubleshooting

### Problem: Services Page Shows "Ollama AI is Offline"

**Cause**: Ollama AI service is not running or unreachable

**Solution**:
1. Verify Ollama is installed and running on your system
2. Check that Ollama is accessible at the configured endpoint
3. Contact your system administrator if the issue persists

**Impact**:
- Message analysis will not work
- Auto-delete and auto-reply features will be disabled
- Manual message management remains available

---

### Problem: "Analysis Unavailable" Badge on Messages

**Cause**: Ollama AI was offline when message arrived, or analysis failed

**Solution**:
1. Wait for Ollama to come back online
2. Messages will be re-analyzed on the next sync cycle (every 5 minutes)
3. Or manually trigger re-sync from the dashboard

**Workaround**:
- Mark messages as spam manually using the context menu
- Compose replies manually without AI suggestion

---

### Problem: False Positive Spam Detection

**Cause**: AI incorrectly classified a legitimate message as spam

**Solution**:
1. Open the **Trash** folder
2. Find the incorrectly deleted message
3. Right-click and select **Not Spam**
4. Message is moved back to inbox
5. Your feedback helps improve future accuracy

**Adjust Threshold**:
- Go to Settings > Message Management
- Increase **Spam Threshold** to 90% or higher
- This reduces false positives but may miss some spam

---

### Problem: Auto-Reply Sent to Wrong Person

**Cause**: Sender was not in blacklist, or conditions were too permissive

**Solution**:
1. Immediately go to Settings > Message Management
2. Add the sender's email to **Sender Blacklist**
3. (Optional) Disable auto-reply temporarily
4. Send a manual follow-up message if needed

**Prevention**:
- Carefully configure sender blacklist before enabling auto-reply
- Start with a higher response confidence threshold (e.g., 90%)
- Review daily summary emails to catch issues early

---

### Problem: Not Receiving Daily Summary Emails

**Cause**: Email notifications not configured, or email delivery issue

**Solution**:
1. Check your email spam folder
2. Verify your email address in account settings
3. Check notification preferences to ensure summaries are enabled
4. Contact support if emails still not arriving

---

### Problem: Services Page Not Auto-Refreshing

**Cause**: Browser tab is inactive or page navigation interrupted

**Solution**:
1. Manually pull down to refresh
2. Close and reopen the Services page
3. Ensure browser allows background timers

---

## Best Practices

### For Auto-Delete Spam
- Start with the default 80% threshold
- Review daily summary emails for the first week
- Adjust threshold based on false positive rate
- Check Trash folder periodically for legitimate messages

### For Auto-Reply
- **Start conservatively**: Begin with a high confidence threshold (90%)
- **Use whitelist**: If you have a small set of important contacts, use whitelist mode
- **Populate blacklist**: Add known no-reply addresses immediately
- **Monitor daily**: Review daily summary emails to catch errors
- **Business hours**: Consider enabling business hours only to avoid late-night replies
- **Set limits**: Use a reasonable daily limit (10-20) to prevent spam-like behavior

### General Tips
- Check Services page weekly to ensure Ollama AI is healthy
- Review analysis accuracy on the dashboard regularly
- Provide feedback on false positives/negatives when you encounter them
- Keep auto-delete and auto-reply disabled if you're unsure

---

## Getting Help

- **In-App Support**: Click the help icon in the top-right corner
- **Documentation**: Visit the full documentation at [link]
- **Report Issue**: Use the "Report Problem" feature in settings
- **Community**: Join the community forum at [link]

---

## What's Next?

Explore these advanced features:
- **Custom Analysis Rules**: Create custom spam detection rules (Coming soon)
- **Reply Templates**: Save frequently used reply templates (Coming soon)
- **Analytics Dashboard**: View spam statistics and reply performance (Coming soon)

---

**Version History**:
- v1.0.0 (2025-11-19): Initial release with Services page, message analysis, auto-delete, and auto-reply
