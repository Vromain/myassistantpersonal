# Feature Specification: Intelligent Message Analysis and Homepage Redesign

**Feature ID**: 002-intelligent-message-analysis
**Created**: 2025-11-19
**Status**: Draft
**Priority**: High

## Overview

Transform the homepage user experience by reorganizing system information into a dedicated Services page and introducing AI-powered intelligent message analysis. Users will benefit from automatic spam detection, response necessity detection, and AI-generated reply suggestions, with configurable automation options for spam deletion and automatic replies.

## Business Value

### Problem Statement

Users currently face several inefficiencies:
- System service information (Backend API, Ollama AI) clutters the homepage
- Manual review of all messages is time-consuming
- Spam messages require manual identification and deletion
- Determining which messages need responses requires reading each one
- Crafting appropriate responses takes significant time and effort

### Value Proposition

This feature delivers:
- **Cleaner homepage**: Focused dashboard with relevant message analytics
- **Time savings**: Automatic spam filtering and response triage reduces manual review by an estimated 60-70%
- **Improved productivity**: AI-suggested responses accelerate reply workflows
- **Reduced cognitive load**: Clear visual indicators for spam and action-required messages
- **Configurable automation**: Users control the level of automatic actions

### Target Users

- Primary: Individual users managing multiple email accounts
- Secondary: Small business owners handling customer communications
- Tertiary: Professionals managing high-volume inboxes

## User Scenarios & Testing

### Scenario 1: Accessing System Services

**Actor**: Authenticated user
**Goal**: Check Backend API and Ollama AI service status

**Steps**:
1. User clicks the user menu in top-right corner
2. User selects "Services" option from the dropdown
3. System displays Services page showing:
   - Backend API status (online/offline, endpoint, response time)
   - Ollama AI status (available/unavailable, model name, last check time)
4. User views real-time health metrics

**Acceptance Criteria**:
- Services menu item appears in user dropdown menu
- Services page loads in under 2 seconds
- Status indicators update automatically every 30 seconds
- Offline services display clear error messages

### Scenario 2: Reviewing Intelligent Message Analysis

**Actor**: Authenticated user
**Goal**: View analyzed messages on dashboard with AI insights

**Steps**:
1. User logs into application
2. Dashboard displays message list with analysis indicators:
   - Red spam icon for detected spam messages
   - Orange notification icon for messages requiring response
   - Green checkmark for messages not requiring action
3. User clicks on a message requiring response
4. System displays message details with AI-generated reply suggestion
5. User reviews, edits if needed, and sends the suggested reply

**Acceptance Criteria**:
- All synchronized messages are analyzed within 5 seconds of retrieval
- Analysis accuracy: spam detection >90%, response necessity >85%
- AI reply suggestions are contextually relevant and grammatically correct
- Users can edit suggested replies before sending

### Scenario 3: Configuring Auto-Spam Deletion

**Actor**: Authenticated user
**Goal**: Enable automatic deletion of spam messages

**Steps**:
1. User navigates to Settings page
2. User locates "Message Management" section
3. User enables "Auto-delete spam" toggle
4. System displays confirmation: "Spam messages will be automatically deleted"
5. User saves settings
6. Going forward, detected spam messages are automatically moved to trash

**Acceptance Criteria**:
- Toggle setting persists across sessions
- Auto-deleted spam appears in Trash folder for 30 days before permanent deletion
- Users receive daily summary of auto-deleted spam count
- Users can disable auto-deletion at any time

### Scenario 4: Configuring Auto-Reply

**Actor**: Authenticated user
**Goal**: Enable automatic sending of AI-suggested replies

**Steps**:
1. User navigates to Settings page
2. User locates "Message Management" section
3. User enables "Auto-send replies" toggle
4. System warns: "Automatic replies will be sent for messages requiring response"
5. User confirms understanding
6. User saves settings
7. Messages requiring response receive auto-generated and auto-sent replies

**Acceptance Criteria**:
- Requires explicit user confirmation before activation
- Toggle setting persists across sessions
- Users receive daily summary of auto-sent replies with links to sent messages
- Auto-replies include disclaimer: "This is an automated response"
- Users can disable auto-reply at any time
- Users can set conditions for auto-reply (e.g., only for certain senders, only during business hours)

## Functional Requirements

### FR-001: Homepage Reorganization
**Priority**: High
**Description**: Remove service status cards from homepage

- Homepage must not display Backend API service information
- Homepage must not display Ollama AI service information
- Homepage must display message analytics dashboard as primary content
- Navigation must provide clear path to Services page

### FR-002: Services Menu Integration
**Priority**: High
**Description**: Add Services option to user dropdown menu

- "Services" menu item must appear in top-right user dropdown
- Services menu item must be positioned below "Intégrations"
- Services menu item must be positioned above "Déconnexion"
- Services menu item must navigate to `/services` route

### FR-003: Services Page
**Priority**: High
**Description**: Create dedicated Services page displaying system health

- Services page must display Backend API status:
  - Connection status (online/offline)
  - API endpoint URL
  - Average response time
  - Last health check timestamp
- Services page must display Ollama AI status:
  - Availability status
  - Active model name
  - Available models list
  - Last check timestamp
  - Failure count (if any)
- Services page must auto-refresh status every 30 seconds
- Services page must display error details for offline services

### FR-004: Message Intelligence Analysis
**Priority**: High
**Description**: Analyze all messages for spam, response necessity, and generate reply suggestions

- System must trigger analysis within 5 seconds of synchronization (asynchronous, non-blocking)
- Analysis executes in background without delaying message sync
- Analysis must detect:
  - Spam probability (0-100%)
  - Response necessity (yes/no with confidence level)
  - Message sentiment (positive/neutral/negative)
  - Priority level (high/medium/low)
- For messages requiring response:
  - Generate contextually appropriate reply suggestion
  - Reply must match original message language
  - Reply must maintain professional tone
  - Reply must be 50-200 words in length

### FR-005: Dashboard Message Analytics
**Priority**: High
**Description**: Display analyzed messages with visual indicators and statistics summary

- Dashboard must show statistics summary card at top displaying:
  - Total number of messages received (all-time count)
  - Number of spam messages detected (with percentage)
  - Number of messages requiring response
  - Number of messages auto-replied to (if auto-reply enabled)
  - Statistics must update in real-time as messages sync
- Dashboard must show message list with analysis badges:
  - Spam messages: Red "SPAM" badge (when spamProbability > 70%)
  - Response required: Orange "Needs Reply" badge (when needsResponse = true)
  - Sentiment indicator: Icon showing positive/neutral/negative sentiment
- Badges must be displayed on message cards
- Messages must be sortable by:
  - Priority level (high/medium/low)
  - Analysis timestamp (newest/oldest)
  - Spam probability (highest/lowest)
- Messages must be filterable by:
  - Spam status (spam only / non-spam only / all)
  - Response necessity (needs reply / no reply needed / all)
  - Sentiment (positive / neutral / negative / all)
- Clicking message must display full analysis details

### FR-006: Settings Page Structure
**Priority**: High
**Description**: Create dedicated Settings page for message management configuration

- Settings page must be accessible from user dropdown menu
- Settings page must include "Message Management" section containing:
  - Auto-delete spam toggle (see FR-008 for behavior)
  - Auto-send replies toggle (see FR-009 for behavior)
  - Auto-reply conditions configuration (see FR-009 for details):
    - Sender whitelist text area (optional)
    - Sender blacklist text area (required)
    - Business hours only checkbox
    - Max replies per day slider (1-100, default: 10)
  - Daily summary email preferences (enabled by default)
- All settings must persist across sessions
- Changes must save automatically or via explicit "Save" button
- Settings page must display last updated timestamp

### FR-007: AI Reply Suggestion Interface
**Priority**: High
**Description**: Present AI-generated reply with editing capabilities

- Message detail view must display "Suggested Reply" section for messages needing response
- Suggested reply must appear in editable text area
- Users must be able to:
  - Edit reply text directly
  - Regenerate new suggestion
  - Accept and send reply
  - Dismiss suggestion
- "Send Reply" button must be prominently displayed
- Sent replies must be tracked in message history

### FR-008: Auto-Delete Spam Setting
**Priority**: Medium
**Description**: Configurable automatic spam deletion

- Settings page must include "Auto-delete spam" toggle in Message Management section (see FR-006)
- When enabled:
  - Messages with spam probability >80% are automatically moved to platform-native Trash folder
  - For Gmail: messages labeled with [Gmail]/Trash
  - For other platforms: equivalent trash/deleted items folder
  - Action occurs within 10 seconds of spam detection
  - User receives daily summary email with deleted spam count
- Deleted spam must remain in Trash for 30 days before permanent deletion
- 30-day retention enforced via scheduled cleanup job (runs daily)
- Setting must persist across user sessions

### FR-009: Auto-Send Reply Setting
**Priority**: Medium
**Description**: Configurable automatic reply sending

- Settings page must include "Auto-send replies" toggle in Message Management section (see FR-006)
- Enabling requires explicit confirmation dialog
- When enabled:
  - Messages with response necessity >85% confidence receive auto-generated reply
  - Reply is sent within 60 seconds of message analysis
  - Reply includes disclaimer: "This is an automated response generated by AI"
  - User receives daily summary email with sent reply count and links
- Users must be able to configure auto-reply conditions via Settings page (see FR-006 and Security section for full safety requirements):
  - Sender whitelist (optional): Only auto-reply to these addresses
  - Sender blacklist (required): Never auto-reply to these addresses
  - Business hours only: Restrict auto-replies to Monday-Friday 9 AM-5 PM in user's timezone
  - Max replies per day: Limit 1-100 auto-replies per 24-hour period (default: 10)
- User timezone determined from browser settings with UTC fallback
- Setting must persist across user sessions

## Success Criteria

### Measurable Outcomes

1. **User Productivity**:
   - Time spent on message triage reduced by 60%
   - Average time to respond to messages reduced by 40%
   - User satisfaction score improves to >4.2/5.0

2. **Analysis Accuracy**:
   - Spam detection accuracy >90%
   - Response necessity detection accuracy >85%
   - False positive rate for spam <5%
   - AI reply acceptance rate >70%

3. **System Performance**:
   - Message analysis completes in <5 seconds
   - Services page loads in <2 seconds
   - Dashboard with 100 messages loads in <3 seconds
   - Auto-actions execute within specified timeframes

4. **User Adoption**:
   - 70% of users enable auto-delete spam within first month
   - 40% of users enable auto-send replies within first month
   - 85% of users access Services page at least once

## Key Entities

### Message Analysis Result
- Message ID (reference to original message)
- Analysis timestamp
- Spam probability (0-100%)
- Is spam (boolean)
- Needs response (boolean)
- Response confidence (0-100%)
- Sentiment (positive/neutral/negative)
- Priority level (high/medium/low)
- Generated reply text (if needs response)
- Analysis version (for tracking model changes)

### User Settings
- User ID
- Auto-delete spam enabled (boolean)
- Auto-send replies enabled (boolean)
- Auto-reply conditions:
  - Sender whitelist (array)
  - Sender blacklist (array)
  - Business hours only (boolean)
  - Max replies per day (integer)
- Last updated timestamp

### Service Health Status
- Service name (Backend API / Ollama AI)
- Status (online/offline/degraded)
- Endpoint URL
- Response time (milliseconds)
- Last check timestamp
- Error message (if offline)
- Metadata (model name, available models, etc.)

## Assumptions

1. **AI Model Availability**: Ollama AI service is available and configured with a model capable of:
   - Spam classification
   - Sentiment analysis
   - Natural language generation for replies
   - Multi-language support

2. **Message Volume**: System can handle analysis of up to 1,000 messages per user per day

3. **User Preferences**: Default settings are:
   - Auto-delete spam: disabled
   - Auto-send replies: disabled
   - Spam threshold: 80%
   - Response confidence threshold: 85%

4. **Data Retention**: Analyzed message data is retained for 90 days for quality improvement

5. **Language Support**: AI reply generation supports English, French, Spanish, and German initially

6. **Business Hours**: Default business hours are Monday-Friday, 9 AM - 5 PM in user's timezone

## Dependencies

- Existing message synchronization system must provide message content to analysis engine
- Ollama AI service must be operational and accessible
- Backend API must expose health check endpoints
- User authentication system must provide user preferences storage
- Email sending capability must be available for auto-replies

## Out of Scope

- Training or fine-tuning of AI models (uses pre-configured Ollama models)
- Multi-language translation of messages
- Advanced spam filter customization (uses standard 80% threshold)
- Integration with external AI services (Google AI, OpenAI)
- Bulk message actions (mark all as spam, delete all)
- Conversation threading analysis
- Attachment analysis for spam/malware detection
- Calendar event extraction from messages
- Contact management integration

## Edge Cases

1. **AI Service Offline**: If Ollama AI is unavailable:
   - Messages are not analyzed automatically
   - Dashboard shows "Analysis unavailable" badge
   - Users can manually mark messages as spam
   - Auto-delete and auto-reply features are disabled

2. **Analysis Error**: If analysis fails for a specific message:
   - Message displays "Analysis failed" warning
   - Message remains in inbox without badge
   - Error is logged for debugging
   - Retry occurs on next sync cycle

3. **False Positive Spam**: User-reported false positives:
   - User can mark spam message as "Not spam"
   - Message is moved back to inbox
   - Feedback is logged to improve future accuracy
   - Auto-delete threshold may be adjusted

4. **Reply Generation Failure**: If AI cannot generate appropriate reply:
   - Message displays "Reply suggestion unavailable"
   - User must compose reply manually
   - Error is logged for debugging

5. **Auto-Reply Conflict**: If message requires response but auto-reply is disabled:
   - Message badge shows "Needs Reply"
   - No automatic action is taken
   - User notification is queued

6. **Rate Limiting**: If auto-reply exceeds daily limit:
   - Remaining messages show "Auto-reply limit reached"
   - Manual replies are still available
   - Limit resets at midnight user's timezone

7. **Spam in Important Conversations**: Messages in reply threads:
   - Spam detection threshold increased to 95% for replies
   - Auto-delete is disabled for conversation threads
   - User receives warning notification

## Security & Privacy Considerations

1. **Data Privacy**: Message content analyzed by AI:
   - Analysis occurs on user's configured Ollama instance (local or controlled)
   - No message content sent to external third-party services
   - Analysis results stored encrypted
   - User can delete analysis data at any time

2. **Auto-Reply Safety**: See FR-008 for complete auto-reply conditions. Key safeguards:
   - Include clear AI-generated disclaimer
   - Do not include sensitive information from original message
   - Sender blacklist validation (required)
   - Optional sender whitelist restriction
   - Business hours enforcement (optional)
   - Daily rate limiting (1-100 replies/day, default 10)
   - Require re-confirmation if setting has been enabled >30 days

3. **Spam False Positives**: To prevent legitimate message loss:
   - Auto-deleted spam retained in Trash for 30 days
   - Daily summary includes spam count for user review
   - Users can restore false positives from Trash
   - Multiple "not spam" reports adjust threshold

## Non-Functional Requirements

### Performance
- Message analysis: <5 seconds per message
- Dashboard load with 100 messages: <3 seconds
- Services page load: <2 seconds
- Auto-action execution: within specified timeframes

### Scalability
- Support up to 10,000 messages per user
- Handle 1,000 message analyses per hour
- Support 100 concurrent users

### Availability
- Services page accessible 99.5% of time
- Analysis feature degrades gracefully if AI unavailable
- Dashboard always displays messages even without analysis

### Usability
- Analysis badges clearly visible and color-coded
- Settings toggles clearly labeled with descriptions
- Confirmation dialogs for potentially disruptive actions
- Mobile-responsive design for all new pages

### Maintainability
- Analysis accuracy metrics logged for monitoring
- AI model version tracked with each analysis
- User feedback mechanism for false positives/negatives
- Admin dashboard for system-wide accuracy metrics

---

**Notes**:
- This specification focuses on WHAT the feature does and WHY it provides value
- Implementation details (HOW) are intentionally omitted
- All requirements are testable and verifiable
- Success criteria are measurable and achievable
