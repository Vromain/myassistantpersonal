# Data Model: AI-Powered Communication Hub

**Feature**: 001-ai-communication-hub
**Date**: 2025-11-16
**Status**: Phase 1 - Data Model Design

## Overview

This document defines the complete data model for the AI-Powered Communication Hub, including entity definitions, PostgreSQL schema (Supabase conventions), Flutter/Dart models, and state management considerations with Riverpod.

---

## Table of Contents

1. [Entity Definitions](#entity-definitions)
2. [Entity Relationships Diagram](#entity-relationships-diagram)
3. [Database Schema (PostgreSQL/Supabase)](#database-schema-postgresqlsupabase)
4. [Flutter/Dart Models](#flutterdart-models)
5. [State Management with Riverpod](#state-management-with-riverpod)
6. [Caching Strategy](#caching-strategy)
7. [Data Migration & Versioning](#data-migration--versioning)

---

## Entity Definitions

### 1. User

**Description**: Represents an application user with authentication credentials, preferences, connected platform accounts, and subscription tier. The user is the central entity that owns all other data in the system.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL | Unique user identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User's email address for authentication |
| `auth_provider` | VARCHAR(50) | NOT NULL | Authentication provider (e.g., 'email', 'google', 'apple') |
| `external_id` | VARCHAR(255) | NULLABLE | External ID from auth provider |
| `display_name` | VARCHAR(255) | NULLABLE | User's display name |
| `avatar_url` | TEXT | NULLABLE | URL to user's profile picture |
| `subscription_tier` | VARCHAR(50) | NOT NULL, DEFAULT 'free' | Subscription level ('free', 'premium') |
| `max_connected_accounts` | INTEGER | NOT NULL, DEFAULT 5 | Maximum allowed connected accounts (5 for free, 10 for premium) |
| `preferences` | JSONB | NOT NULL, DEFAULT '{}' | User preferences (notification settings, quiet hours, UI settings) |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |
| `last_login_at` | TIMESTAMP WITH TIME ZONE | NULLABLE | Last login timestamp |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Account active status |
| `data_retention_days` | INTEGER | NOT NULL, DEFAULT 90 | Message retention period (30, 90, 180, 365) |

**Preferences JSONB Structure**:
```json
{
  "notifications": {
    "enabled": true,
    "quiet_hours": {
      "enabled": true,
      "start": "22:00",
      "end": "07:00"
    },
    "priority_threshold": "medium",
    "batch_notifications": true,
    "batch_interval_minutes": 10
  },
  "ui": {
    "theme": "light",
    "default_view": "priority",
    "messages_per_page": 50
  },
  "language": "en"
}
```

**Relationships**:
- One-to-Many with `ConnectedAccount` (user owns multiple connected accounts)
- One-to-Many with `Category` (user creates custom categories)
- One-to-Many with `Notification` (user receives notifications)

**Validation Rules** (from FR requirements):
- `email` must be valid email format
- `subscription_tier` must be one of: 'free', 'premium'
- `max_connected_accounts` = 5 for free, 10 for premium (FR-030)
- `data_retention_days` must be one of: 30, 90, 180, 365 (FR-029)

**Indexes**:
- PRIMARY KEY on `id` (automatic)
- UNIQUE INDEX on `email`
- INDEX on `auth_provider, external_id` for external auth lookups
- INDEX on `created_at` for analytics queries

---

### 2. ConnectedAccount

**Description**: Represents a linked external account (email, social network, or messaging platform) with OAuth tokens, sync status, last sync timestamp, and connection health. Manages the connection lifecycle and credentials for third-party platforms.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL | Unique account identifier |
| `user_id` | UUID | FOREIGN KEY, NOT NULL | Reference to User |
| `platform` | VARCHAR(50) | NOT NULL | Platform type (e.g., 'gmail', 'outlook', 'facebook', 'instagram') |
| `account_identifier` | VARCHAR(255) | NOT NULL | Platform-specific account ID or email |
| `display_name` | VARCHAR(255) | NULLABLE | Friendly name for the account |
| `oauth_access_token` | TEXT | NULLABLE | Encrypted OAuth access token |
| `oauth_refresh_token` | TEXT | NULLABLE | Encrypted OAuth refresh token |
| `oauth_token_expires_at` | TIMESTAMP WITH TIME ZONE | NULLABLE | Token expiration time |
| `connection_status` | VARCHAR(50) | NOT NULL, DEFAULT 'active' | Status ('active', 'expired', 'error', 'disconnected') |
| `last_sync_at` | TIMESTAMP WITH TIME ZONE | NULLABLE | Last successful synchronization timestamp |
| `last_sync_status` | VARCHAR(50) | DEFAULT 'pending' | Last sync result ('success', 'error', 'pending') |
| `sync_error_message` | TEXT | NULLABLE | Error message from last failed sync |
| `sync_cursor` | TEXT | NULLABLE | Platform-specific cursor/token for incremental sync |
| `metadata` | JSONB | NOT NULL, DEFAULT '{}' | Platform-specific metadata |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Connection creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Whether account is active for syncing |

**Metadata JSONB Structure** (varies by platform):
```json
{
  "platform_user_id": "user@gmail.com",
  "scopes": ["https://www.googleapis.com/auth/gmail.readonly"],
  "api_version": "v1",
  "rate_limit": {
    "requests_per_minute": 60,
    "last_reset": "2025-11-16T10:00:00Z"
  }
}
```

**Relationships**:
- Many-to-One with `User` (multiple accounts belong to one user)
- One-to-Many with `Message` (account has many messages)

**Validation Rules**:
- User can have max 5 connected accounts (free tier) or 10 (premium tier) - enforced at application level (FR-030)
- `platform` must be one of: 'gmail', 'outlook', 'exchange', 'imap', 'facebook', 'instagram', 'whatsapp', 'slack', 'discord', 'telegram', 'signal'
- `connection_status` must be one of: 'active', 'expired', 'error', 'disconnected'
- OAuth tokens must be encrypted before storage (AES-256) - application-level encryption (FR-020)

**Indexes**:
- PRIMARY KEY on `id`
- INDEX on `user_id` for fast user account lookups
- INDEX on `user_id, platform` for checking duplicate platform connections
- INDEX on `connection_status` for health monitoring
- INDEX on `last_sync_at` for sync scheduling
- UNIQUE INDEX on `user_id, platform, account_identifier` to prevent duplicate connections

**State Transitions**:
```
[Created] -> active (successful OAuth)
active -> expired (token expiration detected)
expired -> active (token refreshed)
active -> error (sync failure)
error -> active (reconnection successful)
active/error/expired -> disconnected (user revokes access)
```

---

### 3. Message

**Description**: Represents a communication item from any platform, with content, sender, recipient, timestamp, platform origin, read/unread status, priority score, assigned category, and attachments. This is the core entity for unified inbox functionality.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL | Unique message identifier |
| `connected_account_id` | UUID | FOREIGN KEY, NOT NULL | Reference to ConnectedAccount |
| `external_id` | VARCHAR(500) | NOT NULL | Platform-specific message ID |
| `thread_id` | VARCHAR(500) | NULLABLE | Platform-specific thread/conversation ID |
| `sender_name` | VARCHAR(255) | NOT NULL | Sender's display name |
| `sender_identifier` | VARCHAR(255) | NOT NULL | Sender's email/username/phone |
| `recipient_names` | TEXT[] | DEFAULT '{}' | Array of recipient names |
| `recipient_identifiers` | TEXT[] | DEFAULT '{}' | Array of recipient email/username/phone |
| `subject` | TEXT | NULLABLE | Message subject (email) or conversation title |
| `content_text` | TEXT | NOT NULL | Plain text message content |
| `content_html` | TEXT | NULLABLE | HTML message content (if available) |
| `preview` | VARCHAR(500) | NOT NULL | Short preview text for UI display |
| `message_timestamp` | TIMESTAMP WITH TIME ZONE | NOT NULL | When message was sent (platform timestamp) |
| `received_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | When message was received by our system |
| `platform` | VARCHAR(50) | NOT NULL | Platform origin (redundant with account, for easier queries) |
| `read_status` | BOOLEAN | NOT NULL, DEFAULT false | Whether user has read the message |
| `priority_score` | INTEGER | CHECK (priority_score >= 0 AND priority_score <= 100), DEFAULT 50 | AI-assigned priority (0-100) |
| `priority_level` | VARCHAR(20) | NOT NULL, DEFAULT 'medium' | Priority category ('low', 'medium', 'high') |
| `category_id` | UUID | FOREIGN KEY, NULLABLE | Reference to Category (if categorized) |
| `is_urgent` | BOOLEAN | NOT NULL, DEFAULT false | Flagged as urgent by keywords or sender (FR-028) |
| `attachments` | JSONB | DEFAULT '[]' | Array of attachment metadata |
| `metadata` | JSONB | NOT NULL, DEFAULT '{}' | Platform-specific metadata |
| `search_vector` | TSVECTOR | NULLABLE | Full-text search vector (PostgreSQL) |
| `archived_at` | TIMESTAMP WITH TIME ZONE | NULLABLE | When message was archived |
| `deleted_at` | TIMESTAMP WITH TIME ZONE | NULLABLE | Soft delete timestamp |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Attachments JSONB Structure**:
```json
[
  {
    "id": "att_123",
    "filename": "document.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 1048576,
    "url": "https://storage.example.com/attachments/...",
    "thumbnail_url": "https://storage.example.com/thumbnails/..."
  }
]
```

**Metadata JSONB Structure**:
```json
{
  "labels": ["INBOX", "IMPORTANT"],
  "flags": ["\\Seen", "\\Flagged"],
  "message_id_header": "<abc@mail.gmail.com>",
  "in_reply_to": "<xyz@mail.gmail.com>",
  "importance": "high"
}
```

**Relationships**:
- Many-to-One with `ConnectedAccount` (messages belong to an account)
- Many-to-One with `Category` (messages can be categorized)
- One-to-Many with `Notification` (message can trigger multiple notifications)
- Indirect relation to `User` through `ConnectedAccount`

**Validation Rules**:
- `priority_score` must be between 0 and 100 (FR-006)
- `priority_level` must be one of: 'low', 'medium', 'high'
- `platform` must match connected_account.platform
- `external_id` must be unique per `connected_account_id`
- Messages older than user's `data_retention_days` should be purged (FR-029)
- Urgent keywords: "urgent", "ASAP", "important", "critical", "emergency" (FR-028)

**Indexes**:
- PRIMARY KEY on `id`
- INDEX on `connected_account_id` for account message listings
- INDEX on `message_timestamp DESC` for chronological sorting
- INDEX on `priority_score DESC` for priority inbox view
- INDEX on `read_status` for unread filtering
- INDEX on `category_id` for category filtering
- INDEX on `is_urgent` for urgent message filtering
- UNIQUE INDEX on `connected_account_id, external_id` to prevent duplicates
- GIN INDEX on `search_vector` for full-text search (FR-025)
- INDEX on `created_at` for data retention queries
- INDEX on `platform` for platform-specific queries

**State Transitions**:
```
[Created] -> unread (read_status = false)
unread -> read (user opens message)
read -> unread (user marks as unread)
* -> archived (archived_at set)
* -> deleted (deleted_at set, soft delete)
```

---

### 4. Category

**Description**: Represents a message classification (predefined or custom) with name, color, auto-assignment rules, and user-defined criteria. Categories help organize messages and support AI-powered auto-categorization.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL | Unique category identifier |
| `user_id` | UUID | FOREIGN KEY, NULLABLE | Reference to User (NULL for predefined categories) |
| `name` | VARCHAR(100) | NOT NULL | Category name (e.g., "Work", "Personal", "Shopping") |
| `slug` | VARCHAR(100) | NOT NULL | URL-friendly identifier (e.g., "work", "personal") |
| `color` | VARCHAR(7) | NOT NULL, DEFAULT '#6B7280' | Hex color code for UI display |
| `icon` | VARCHAR(50) | NULLABLE | Icon identifier (e.g., "briefcase", "home", "shopping-cart") |
| `is_predefined` | BOOLEAN | NOT NULL, DEFAULT false | System predefined category (cannot be deleted) |
| `auto_assignment_enabled` | BOOLEAN | NOT NULL, DEFAULT false | Whether AI should auto-assign this category |
| `auto_assignment_rules` | JSONB | DEFAULT '{}' | Rules for automatic categorization |
| `description` | TEXT | NULLABLE | User-facing category description |
| `sort_order` | INTEGER | NOT NULL, DEFAULT 0 | Display order in UI |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active status |

**Auto-Assignment Rules JSONB Structure**:
```json
{
  "keywords": ["invoice", "receipt", "order", "shipping"],
  "sender_patterns": ["*@amazon.com", "*@ebay.com", "noreply@*"],
  "subject_patterns": ["Order #*", "Your receipt*"],
  "min_confidence": 0.7,
  "learned_patterns": [
    {
      "pattern_type": "sender",
      "value": "support@shopify.com",
      "confidence": 0.95,
      "examples": 3
    }
  ]
}
```

**Relationships**:
- Many-to-One with `User` (user creates custom categories; NULL for predefined)
- One-to-Many with `Message` (category assigned to many messages)

**Validation Rules**:
- Predefined categories (FR-012): Work, Personal, Shopping, Social, Promotions, Updates
- `name` must be unique per user (case-insensitive)
- `slug` must be unique per user and URL-safe
- `color` must be valid hex color format (#RRGGBB)
- Predefined categories cannot be deleted (`is_predefined = true`)
- User can create unlimited custom categories (FR-013)

**Indexes**:
- PRIMARY KEY on `id`
- INDEX on `user_id` for user category lookups
- UNIQUE INDEX on `user_id, slug` for slug uniqueness
- INDEX on `is_predefined` for system category queries
- INDEX on `sort_order` for ordered display

**Predefined Categories** (seeded at installation):

| Name | Slug | Color | Icon | Description |
|------|------|-------|------|-------------|
| Work | work | #3B82F6 | briefcase | Professional communications and work-related messages |
| Personal | personal | #10B981 | user | Personal messages from friends and family |
| Shopping | shopping | #F59E0B | shopping-cart | Online orders, receipts, and shopping-related messages |
| Social | social | #8B5CF6 | users | Social media notifications and updates |
| Promotions | promotions | #EF4444 | tag | Marketing emails, newsletters, and promotional content |
| Updates | updates | #6B7280 | bell | Service updates, account notifications, and system messages |

---

### 5. AIModel

**Description**: Represents the AI service configuration for priority scoring, reply generation, categorization, and learning from user feedback. This entity tracks AI model performance and user corrections for continuous improvement.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL | Unique AI model configuration identifier |
| `name` | VARCHAR(100) | NOT NULL | Model name (e.g., "llama2:7b", "mistral:7b") |
| `model_type` | VARCHAR(50) | NOT NULL | Model purpose ('priority', 'reply', 'categorization', 'spam') |
| `provider` | VARCHAR(50) | NOT NULL, DEFAULT 'ollama' | AI provider (e.g., 'ollama', 'openai', 'anthropic') |
| `model_version` | VARCHAR(50) | NOT NULL | Model version identifier |
| `endpoint_url` | TEXT | NOT NULL | API endpoint for the model |
| `configuration` | JSONB | NOT NULL, DEFAULT '{}' | Model-specific configuration parameters |
| `performance_metrics` | JSONB | DEFAULT '{}' | Performance tracking metrics |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Whether this model is currently in use |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Configuration JSONB Structure**:
```json
{
  "temperature": 0.7,
  "max_tokens": 500,
  "timeout_seconds": 3,
  "system_prompt": "You are an AI assistant that helps prioritize messages...",
  "response_format": "json"
}
```

**Performance Metrics JSONB Structure**:
```json
{
  "priority_scoring": {
    "total_predictions": 15420,
    "accuracy": 0.83,
    "user_corrections": 2180,
    "avg_response_time_ms": 1250,
    "last_evaluated_at": "2025-11-16T10:00:00Z"
  },
  "categorization": {
    "total_predictions": 12500,
    "accuracy": 0.78,
    "user_corrections": 1500,
    "accuracy_improvement": 0.12,
    "avg_response_time_ms": 980
  },
  "reply_generation": {
    "total_generated": 8900,
    "acceptance_rate": 0.42,
    "avg_response_time_ms": 2100
  }
}
```

**Relationships**:
- No direct foreign key relationships (used by application logic)
- Indirectly referenced by Message priority scores and categories
- Referenced in UserFeedback for learning

**Validation Rules**:
- `model_type` must be one of: 'priority', 'reply', 'categorization', 'spam'
- Only one active model per `model_type` at a time
- `endpoint_url` must be valid HTTP/HTTPS URL
- AI response time must be <3 seconds (FR-006, FR-010)
- Categorization accuracy target: 80% (SC-003)
- Reply acceptance rate target: 40% (SC-002)

**Indexes**:
- PRIMARY KEY on `id`
- UNIQUE INDEX on `model_type, is_active` WHERE `is_active = true` (one active model per type)
- INDEX on `provider` for provider-based queries

---

### 6. Notification

**Description**: Represents a user notification with associated message, delivery time, priority level, and delivery status. Manages the notification lifecycle and respects user preferences like quiet hours.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL | Unique notification identifier |
| `user_id` | UUID | FOREIGN KEY, NOT NULL | Reference to User |
| `message_id` | UUID | FOREIGN KEY, NULLABLE | Reference to Message (if notification is message-related) |
| `notification_type` | VARCHAR(50) | NOT NULL | Type ('new_message', 'urgent', 'system', 'batch') |
| `title` | VARCHAR(255) | NOT NULL | Notification title |
| `body` | TEXT | NOT NULL | Notification body text |
| `priority_level` | VARCHAR(20) | NOT NULL, DEFAULT 'medium' | Priority ('low', 'medium', 'high', 'urgent') |
| `delivery_status` | VARCHAR(50) | NOT NULL, DEFAULT 'pending' | Status ('pending', 'sent', 'delivered', 'failed', 'suppressed') |
| `scheduled_at` | TIMESTAMP WITH TIME ZONE | NOT NULL | When notification should be delivered |
| `sent_at` | TIMESTAMP WITH TIME ZONE | NULLABLE | When notification was actually sent |
| `delivered_at` | TIMESTAMP WITH TIME ZONE | NULLABLE | When notification was delivered to device |
| `read_at` | TIMESTAMP WITH TIME ZONE | NULLABLE | When user opened/read the notification |
| `suppression_reason` | VARCHAR(100) | NULLABLE | Why notification was suppressed (e.g., 'quiet_hours', 'low_priority') |
| `delivery_channel` | VARCHAR(50) | NOT NULL, DEFAULT 'push' | Channel ('push', 'email', 'in_app') |
| `fcm_token` | TEXT | NULLABLE | Firebase Cloud Messaging device token |
| `fcm_message_id` | VARCHAR(255) | NULLABLE | FCM message ID for tracking |
| `metadata` | JSONB | DEFAULT '{}' | Additional notification metadata |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Metadata JSONB Structure**:
```json
{
  "deep_link": "/messages/abc-123",
  "action_buttons": [
    {"id": "reply", "label": "Reply"},
    {"id": "archive", "label": "Archive"}
  ],
  "batched_with": ["notif_456", "notif_789"],
  "batch_count": 3,
  "platform_icon": "gmail"
}
```

**Relationships**:
- Many-to-One with `User` (user receives many notifications)
- Many-to-One with `Message` (notifications reference messages)

**Validation Rules**:
- `notification_type` must be one of: 'new_message', 'urgent', 'system', 'batch'
- `priority_level` must be one of: 'low', 'medium', 'high', 'urgent'
- `delivery_status` must be one of: 'pending', 'sent', 'delivered', 'failed', 'suppressed'
- `delivery_channel` must be one of: 'push', 'email', 'in_app'
- Urgent notifications bypass quiet hours (FR-017)
- Low-priority notifications suppressed during quiet hours (FR-016)
- Batch similar notifications (5 within 10 minutes) (FR-018)

**Indexes**:
- PRIMARY KEY on `id`
- INDEX on `user_id, delivery_status` for pending notifications
- INDEX on `message_id` for message-notification lookups
- INDEX on `scheduled_at` for delivery scheduling
- INDEX on `created_at` for cleanup of old notifications
- INDEX on `delivery_status, scheduled_at` for batch processing

**State Transitions**:
```
[Created] -> pending (scheduled_at in future)
pending -> suppressed (quiet hours + low priority)
pending -> sent (notification dispatched to FCM)
sent -> delivered (FCM confirms delivery)
sent -> failed (FCM delivery error)
delivered -> read (user opens notification)
```

**Business Logic**:
- Quiet hours check: If user preferences.notifications.quiet_hours.enabled and current time in range, suppress low/medium priority
- Batch notifications: Group messages from same sender within 10 minutes
- Urgent bypass: Notifications with priority_level = 'urgent' always send immediately (FR-017)

---

### 7. AnalyticsData

**Description**: Represents aggregated communication statistics with time periods, message counts by platform/category, response time metrics, and contact frequency data. Supports the analytics dashboard feature.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL | Unique analytics record identifier |
| `user_id` | UUID | FOREIGN KEY, NOT NULL | Reference to User |
| `period_type` | VARCHAR(20) | NOT NULL | Period granularity ('daily', 'weekly', 'monthly', 'yearly') |
| `period_start` | DATE | NOT NULL | Period start date |
| `period_end` | DATE | NOT NULL | Period end date |
| `total_messages_received` | INTEGER | NOT NULL, DEFAULT 0 | Total messages received in period |
| `total_messages_sent` | INTEGER | NOT NULL, DEFAULT 0 | Total messages sent/replied in period |
| `unread_count` | INTEGER | NOT NULL, DEFAULT 0 | Unread messages at period end |
| `urgent_count` | INTEGER | NOT NULL, DEFAULT 0 | Urgent messages in period |
| `messages_by_platform` | JSONB | DEFAULT '{}' | Message count breakdown by platform |
| `messages_by_category` | JSONB | DEFAULT '{}' | Message count breakdown by category |
| `messages_by_priority` | JSONB | DEFAULT '{}' | Message count breakdown by priority level |
| `top_contacts` | JSONB | DEFAULT '[]' | Most frequent contacts with message counts |
| `response_time_metrics` | JSONB | DEFAULT '{}' | Response time statistics |
| `time_saved_minutes` | INTEGER | DEFAULT 0 | Estimated time saved using app (calculated) |
| `ai_suggestions_accepted` | INTEGER | DEFAULT 0 | Count of accepted AI reply suggestions |
| `ai_suggestions_total` | INTEGER | DEFAULT 0 | Total AI reply suggestions generated |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Messages by Platform JSONB Structure**:
```json
{
  "gmail": 450,
  "outlook": 230,
  "facebook": 120,
  "whatsapp": 85
}
```

**Messages by Category JSONB Structure**:
```json
{
  "work": 380,
  "personal": 250,
  "shopping": 95,
  "social": 70,
  "promotions": 40,
  "updates": 50
}
```

**Messages by Priority JSONB Structure**:
```json
{
  "high": 120,
  "medium": 485,
  "low": 280
}
```

**Top Contacts JSONB Structure**:
```json
[
  {
    "name": "John Doe",
    "identifier": "john@example.com",
    "message_count": 85,
    "platform": "gmail"
  },
  {
    "name": "Jane Smith",
    "identifier": "+1234567890",
    "message_count": 62,
    "platform": "whatsapp"
  }
]
```

**Response Time Metrics JSONB Structure**:
```json
{
  "average_response_time_hours": 4.5,
  "median_response_time_hours": 2.3,
  "response_rate": 0.78,
  "avg_by_platform": {
    "gmail": 5.2,
    "whatsapp": 0.5,
    "facebook": 3.1
  }
}
```

**Relationships**:
- Many-to-One with `User` (user has multiple analytics records for different periods)

**Validation Rules**:
- `period_type` must be one of: 'daily', 'weekly', 'monthly', 'yearly'
- `period_end` must be >= `period_start`
- `period_start` and `period_end` must align with `period_type` (e.g., weekly = Monday-Sunday)
- Unique constraint on `user_id, period_type, period_start` (one record per period)

**Indexes**:
- PRIMARY KEY on `id`
- UNIQUE INDEX on `user_id, period_type, period_start`
- INDEX on `user_id, period_start DESC` for chronological queries
- INDEX on `period_type` for aggregation queries

**Aggregation Logic**:
- Daily: Computed at midnight UTC
- Weekly: Monday 00:00 to Sunday 23:59
- Monthly: First day to last day of month
- Yearly: January 1 to December 31

**Success Criteria Mapping** (from spec.md):
- Average response time tracked for SC-004 (50% time reduction)
- AI suggestion acceptance rate for SC-002 (40% acceptance)
- Response time metrics for dashboard display

---

## Entity Relationships Diagram

```
                 
      User       
  (Central)      
        ,        
         
          1:N
         
        4                        ,                  ,                 
                                                                    
    ¼                             ¼                  ¼                 ¼
                                                                            
 ConnectedAccount          Category        Notification     AnalyticsData   
                                                                            
        ,                      ,                ,                           
                                                   
          1:N                     1:N               N:1
                                                   
         ¼                                          
                                                  
    Message      Ä                                
                 Ä                                 
                 

                 
    AIModel        (No FK relationships, used by app logic)
  (Standalone)   
                 
```

**Relationship Details**:

1. **User ’ ConnectedAccount** (1:N)
   - One user can have multiple connected accounts
   - Constraint: Max 5 (free) or 10 (premium) per user

2. **User ’ Category** (1:N)
   - One user can create multiple custom categories
   - Predefined categories have `user_id = NULL`

3. **User ’ Notification** (1:N)
   - One user receives many notifications

4. **User ’ AnalyticsData** (1:N)
   - One user has multiple analytics records (by time period)

5. **ConnectedAccount ’ Message** (1:N)
   - One account has many messages
   - Messages belong to exactly one account

6. **Category ’ Message** (1:N)
   - One category can be assigned to many messages
   - Message can have zero or one category

7. **Message ’ Notification** (1:N)
   - One message can trigger multiple notifications (e.g., initial + reminder)

8. **AIModel** (Standalone)
   - No foreign key relationships
   - Referenced by application logic for AI operations

---

## Database Schema (PostgreSQL/Supabase)

### Schema Creation SQL

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search extension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ======================
-- TABLE: users
-- ======================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    auth_provider VARCHAR(50) NOT NULL,
    external_id VARCHAR(255),
    display_name VARCHAR(255),
    avatar_url TEXT,
    subscription_tier VARCHAR(50) NOT NULL DEFAULT 'free'
        CHECK (subscription_tier IN ('free', 'premium')),
    max_connected_accounts INTEGER NOT NULL DEFAULT 5
        CHECK (max_connected_accounts IN (5, 10)),
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    data_retention_days INTEGER NOT NULL DEFAULT 90
        CHECK (data_retention_days IN (30, 90, 180, 365))
);

-- Users indexes
CREATE INDEX idx_users_auth_provider_external_id ON users(auth_provider, external_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Users Row Level Security (Supabase)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- ======================
-- TABLE: connected_accounts
-- ======================
CREATE TABLE connected_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL
        CHECK (platform IN ('gmail', 'outlook', 'exchange', 'imap',
                           'facebook', 'instagram', 'whatsapp',
                           'slack', 'discord', 'telegram', 'signal')),
    account_identifier VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    oauth_access_token TEXT,
    oauth_refresh_token TEXT,
    oauth_token_expires_at TIMESTAMP WITH TIME ZONE,
    connection_status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (connection_status IN ('active', 'expired', 'error', 'disconnected')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_status VARCHAR(50) DEFAULT 'pending'
        CHECK (last_sync_status IN ('success', 'error', 'pending')),
    sync_error_message TEXT,
    sync_cursor TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT unique_user_platform_account
        UNIQUE (user_id, platform, account_identifier)
);

-- Connected accounts indexes
CREATE INDEX idx_connected_accounts_user_id ON connected_accounts(user_id);
CREATE INDEX idx_connected_accounts_user_platform ON connected_accounts(user_id, platform);
CREATE INDEX idx_connected_accounts_status ON connected_accounts(connection_status);
CREATE INDEX idx_connected_accounts_last_sync ON connected_accounts(last_sync_at);

-- Connected accounts RLS
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own connected accounts"
    ON connected_accounts FOR ALL
    USING (auth.uid() = user_id);

-- ======================
-- TABLE: categories
-- ======================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    icon VARCHAR(50),
    is_predefined BOOLEAN NOT NULL DEFAULT false,
    auto_assignment_enabled BOOLEAN NOT NULL DEFAULT false,
    auto_assignment_rules JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT valid_hex_color CHECK (color ~* '^#[0-9A-F]{6}$')
);

-- Categories indexes
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE UNIQUE INDEX idx_categories_user_slug ON categories(user_id, slug);
CREATE INDEX idx_categories_predefined ON categories(is_predefined);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

-- Categories RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view predefined and their own categories"
    ON categories FOR SELECT
    USING (is_predefined = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own categories"
    ON categories FOR ALL
    USING (auth.uid() = user_id);

-- Seed predefined categories
INSERT INTO categories (user_id, name, slug, color, icon, is_predefined, sort_order) VALUES
    (NULL, 'Work', 'work', '#3B82F6', 'briefcase', true, 1),
    (NULL, 'Personal', 'personal', '#10B981', 'user', true, 2),
    (NULL, 'Shopping', 'shopping', '#F59E0B', 'shopping-cart', true, 3),
    (NULL, 'Social', 'social', '#8B5CF6', 'users', true, 4),
    (NULL, 'Promotions', 'promotions', '#EF4444', 'tag', true, 5),
    (NULL, 'Updates', 'updates', '#6B7280', 'bell', true, 6);

-- ======================
-- TABLE: messages
-- ======================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connected_account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
    external_id VARCHAR(500) NOT NULL,
    thread_id VARCHAR(500),
    sender_name VARCHAR(255) NOT NULL,
    sender_identifier VARCHAR(255) NOT NULL,
    recipient_names TEXT[] DEFAULT '{}',
    recipient_identifiers TEXT[] DEFAULT '{}',
    subject TEXT,
    content_text TEXT NOT NULL,
    content_html TEXT,
    preview VARCHAR(500) NOT NULL,
    message_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    platform VARCHAR(50) NOT NULL,
    read_status BOOLEAN NOT NULL DEFAULT false,
    priority_score INTEGER DEFAULT 50
        CHECK (priority_score >= 0 AND priority_score <= 100),
    priority_level VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (priority_level IN ('low', 'medium', 'high')),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_urgent BOOLEAN NOT NULL DEFAULT false,
    attachments JSONB DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    search_vector TSVECTOR,
    archived_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_account_external_id
        UNIQUE (connected_account_id, external_id)
);

-- Messages indexes
CREATE INDEX idx_messages_account_id ON messages(connected_account_id);
CREATE INDEX idx_messages_timestamp_desc ON messages(message_timestamp DESC);
CREATE INDEX idx_messages_priority_score_desc ON messages(priority_score DESC);
CREATE INDEX idx_messages_read_status ON messages(read_status);
CREATE INDEX idx_messages_category_id ON messages(category_id);
CREATE INDEX idx_messages_urgent ON messages(is_urgent);
CREATE INDEX idx_messages_platform ON messages(platform);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_search_vector ON messages USING GIN(search_vector);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION messages_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.subject, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content_text, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.sender_name, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_search_vector_trigger
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION messages_search_vector_update();

-- Messages RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
    ON messages FOR SELECT
    USING (
        connected_account_id IN (
            SELECT id FROM connected_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own messages"
    ON messages FOR ALL
    USING (
        connected_account_id IN (
            SELECT id FROM connected_accounts WHERE user_id = auth.uid()
        )
    );

-- ======================
-- TABLE: ai_models
-- ======================
CREATE TABLE ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL
        CHECK (model_type IN ('priority', 'reply', 'categorization', 'spam')),
    provider VARCHAR(50) NOT NULL DEFAULT 'ollama',
    model_version VARCHAR(50) NOT NULL,
    endpoint_url TEXT NOT NULL,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- AI models indexes
CREATE UNIQUE INDEX idx_ai_models_active_type
    ON ai_models(model_type)
    WHERE is_active = true;
CREATE INDEX idx_ai_models_provider ON ai_models(provider);

-- ======================
-- TABLE: notifications
-- ======================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL
        CHECK (notification_type IN ('new_message', 'urgent', 'system', 'batch')),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    priority_level VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'suppressed')),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    suppression_reason VARCHAR(100),
    delivery_channel VARCHAR(50) NOT NULL DEFAULT 'push'
        CHECK (delivery_channel IN ('push', 'email', 'in_app')),
    fcm_token TEXT,
    fcm_message_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Notifications indexes
CREATE INDEX idx_notifications_user_status ON notifications(user_id, delivery_status);
CREATE INDEX idx_notifications_message_id ON notifications(message_id);
CREATE INDEX idx_notifications_scheduled_at ON notifications(scheduled_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_delivery_queue ON notifications(delivery_status, scheduled_at);

-- Notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- ======================
-- TABLE: analytics_data
-- ======================
CREATE TABLE analytics_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_type VARCHAR(20) NOT NULL
        CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_messages_received INTEGER NOT NULL DEFAULT 0,
    total_messages_sent INTEGER NOT NULL DEFAULT 0,
    unread_count INTEGER NOT NULL DEFAULT 0,
    urgent_count INTEGER NOT NULL DEFAULT 0,
    messages_by_platform JSONB DEFAULT '{}'::jsonb,
    messages_by_category JSONB DEFAULT '{}'::jsonb,
    messages_by_priority JSONB DEFAULT '{}'::jsonb,
    top_contacts JSONB DEFAULT '[]'::jsonb,
    response_time_metrics JSONB DEFAULT '{}'::jsonb,
    time_saved_minutes INTEGER DEFAULT 0,
    ai_suggestions_accepted INTEGER DEFAULT 0,
    ai_suggestions_total INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_period_range CHECK (period_end >= period_start),
    CONSTRAINT unique_user_period UNIQUE (user_id, period_type, period_start)
);

-- Analytics indexes
CREATE INDEX idx_analytics_user_period ON analytics_data(user_id, period_start DESC);
CREATE INDEX idx_analytics_period_type ON analytics_data(period_type);

-- Analytics RLS
ALTER TABLE analytics_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analytics"
    ON analytics_data FOR SELECT
    USING (auth.uid() = user_id);

-- ======================
-- TRIGGERS: Updated timestamps
-- ======================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connected_accounts_updated_at BEFORE UPDATE ON connected_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_models_updated_at BEFORE UPDATE ON ai_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_data_updated_at BEFORE UPDATE ON analytics_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Flutter/Dart Models

### User Model

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

@freezed
class User with _$User {
  const factory User({
    required String id,
    required String email,
    required String authProvider,
    String? externalId,
    String? displayName,
    String? avatarUrl,
    @Default('free') String subscriptionTier,
    @Default(5) int maxConnectedAccounts,
    @Default(UserPreferences()) UserPreferences preferences,
    required DateTime createdAt,
    required DateTime updatedAt,
    DateTime? lastLoginAt,
    @Default(true) bool isActive,
    @Default(90) int dataRetentionDays,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}

@freezed
class UserPreferences with _$UserPreferences {
  const factory UserPreferences({
    @Default(NotificationPreferences()) NotificationPreferences notifications,
    @Default(UIPreferences()) UIPreferences ui,
    @Default('en') String language,
  }) = _UserPreferences;

  factory UserPreferences.fromJson(Map<String, dynamic> json) =>
      _$UserPreferencesFromJson(json);
}

@freezed
class NotificationPreferences with _$NotificationPreferences {
  const factory NotificationPreferences({
    @Default(true) bool enabled,
    @Default(QuietHours()) QuietHours quietHours,
    @Default('medium') String priorityThreshold,
    @Default(true) bool batchNotifications,
    @Default(10) int batchIntervalMinutes,
  }) = _NotificationPreferences;

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) =>
      _$NotificationPreferencesFromJson(json);
}

@freezed
class QuietHours with _$QuietHours {
  const factory QuietHours({
    @Default(true) bool enabled,
    @Default('22:00') String start,
    @Default('07:00') String end,
  }) = _QuietHours;

  factory QuietHours.fromJson(Map<String, dynamic> json) =>
      _$QuietHoursFromJson(json);
}

@freezed
class UIPreferences with _$UIPreferences {
  const factory UIPreferences({
    @Default('light') String theme,
    @Default('priority') String defaultView,
    @Default(50) int messagesPerPage,
  }) = _UIPreferences;

  factory UIPreferences.fromJson(Map<String, dynamic> json) =>
      _$UIPreferencesFromJson(json);
}
```

### ConnectedAccount Model

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'connected_account.freezed.dart';
part 'connected_account.g.dart';

@freezed
class ConnectedAccount with _$ConnectedAccount {
  const factory ConnectedAccount({
    required String id,
    required String userId,
    required String platform,
    required String accountIdentifier,
    String? displayName,
    String? oauthAccessToken,
    String? oauthRefreshToken,
    DateTime? oauthTokenExpiresAt,
    @Default('active') String connectionStatus,
    DateTime? lastSyncAt,
    @Default('pending') String lastSyncStatus,
    String? syncErrorMessage,
    String? syncCursor,
    @Default({}) Map<String, dynamic> metadata,
    required DateTime createdAt,
    required DateTime updatedAt,
    @Default(true) bool isActive,
  }) = _ConnectedAccount;

  factory ConnectedAccount.fromJson(Map<String, dynamic> json) =>
      _$ConnectedAccountFromJson(json);
}

enum Platform {
  gmail,
  outlook,
  exchange,
  imap,
  facebook,
  instagram,
  whatsapp,
  slack,
  discord,
  telegram,
  signal;

  String get displayName {
    switch (this) {
      case Platform.gmail:
        return 'Gmail';
      case Platform.outlook:
        return 'Outlook';
      case Platform.exchange:
        return 'Exchange';
      case Platform.imap:
        return 'Email (IMAP)';
      case Platform.facebook:
        return 'Facebook Messenger';
      case Platform.instagram:
        return 'Instagram';
      case Platform.whatsapp:
        return 'WhatsApp';
      case Platform.slack:
        return 'Slack';
      case Platform.discord:
        return 'Discord';
      case Platform.telegram:
        return 'Telegram';
      case Platform.signal:
        return 'Signal';
    }
  }
}

enum ConnectionStatus {
  active,
  expired,
  error,
  disconnected;
}
```

### Message Model

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'message.freezed.dart';
part 'message.g.dart';

@freezed
class Message with _$Message {
  const factory Message({
    required String id,
    required String connectedAccountId,
    required String externalId,
    String? threadId,
    required String senderName,
    required String senderIdentifier,
    @Default([]) List<String> recipientNames,
    @Default([]) List<String> recipientIdentifiers,
    String? subject,
    required String contentText,
    String? contentHtml,
    required String preview,
    required DateTime messageTimestamp,
    required DateTime receivedAt,
    required String platform,
    @Default(false) bool readStatus,
    @Default(50) int priorityScore,
    @Default(PriorityLevel.medium) PriorityLevel priorityLevel,
    String? categoryId,
    @Default(false) bool isUrgent,
    @Default([]) List<MessageAttachment> attachments,
    @Default({}) Map<String, dynamic> metadata,
    DateTime? archivedAt,
    DateTime? deletedAt,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _Message;

  factory Message.fromJson(Map<String, dynamic> json) =>
      _$MessageFromJson(json);

  // Computed properties (not stored in DB)
  const Message._();

  bool get isRead => readStatus;
  bool get isArchived => archivedAt != null;
  bool get isDeleted => deletedAt != null;
  bool get hasAttachments => attachments.isNotEmpty;
}

enum PriorityLevel {
  low,
  medium,
  high;

  String get displayName {
    switch (this) {
      case PriorityLevel.low:
        return 'Low';
      case PriorityLevel.medium:
        return 'Medium';
      case PriorityLevel.high:
        return 'High';
    }
  }
}

@freezed
class MessageAttachment with _$MessageAttachment {
  const factory MessageAttachment({
    required String id,
    required String filename,
    required String mimeType,
    required int sizeBytes,
    String? url,
    String? thumbnailUrl,
  }) = _MessageAttachment;

  factory MessageAttachment.fromJson(Map<String, dynamic> json) =>
      _$MessageAttachmentFromJson(json);

  const MessageAttachment._();

  String get sizeFormatted {
    if (sizeBytes < 1024) return '$sizeBytes B';
    if (sizeBytes < 1024 * 1024) return '${(sizeBytes / 1024).toStringAsFixed(1)} KB';
    return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
```

### Category Model

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'category.freezed.dart';
part 'category.g.dart';

@freezed
class Category with _$Category {
  const factory Category({
    required String id,
    String? userId,
    required String name,
    required String slug,
    @Default('#6B7280') String color,
    String? icon,
    @Default(false) bool isPredefined,
    @Default(false) bool autoAssignmentEnabled,
    @Default(AutoAssignmentRules()) AutoAssignmentRules autoAssignmentRules,
    String? description,
    @Default(0) int sortOrder,
    required DateTime createdAt,
    required DateTime updatedAt,
    @Default(true) bool isActive,
  }) = _Category;

  factory Category.fromJson(Map<String, dynamic> json) =>
      _$CategoryFromJson(json);
}

@freezed
class AutoAssignmentRules with _$AutoAssignmentRules {
  const factory AutoAssignmentRules({
    @Default([]) List<String> keywords,
    @Default([]) List<String> senderPatterns,
    @Default([]) List<String> subjectPatterns,
    @Default(0.7) double minConfidence,
    @Default([]) List<LearnedPattern> learnedPatterns,
  }) = _AutoAssignmentRules;

  factory AutoAssignmentRules.fromJson(Map<String, dynamic> json) =>
      _$AutoAssignmentRulesFromJson(json);
}

@freezed
class LearnedPattern with _$LearnedPattern {
  const factory LearnedPattern({
    required String patternType,
    required String value,
    required double confidence,
    required int examples,
  }) = _LearnedPattern;

  factory LearnedPattern.fromJson(Map<String, dynamic> json) =>
      _$LearnedPatternFromJson(json);
}
```

### AIModel Model

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'ai_model.freezed.dart';
part 'ai_model.g.dart';

@freezed
class AIModel with _$AIModel {
  const factory AIModel({
    required String id,
    required String name,
    required AIModelType modelType,
    @Default('ollama') String provider,
    required String modelVersion,
    required String endpointUrl,
    @Default(AIModelConfiguration()) AIModelConfiguration configuration,
    @Default(PerformanceMetrics()) PerformanceMetrics performanceMetrics,
    @Default(true) bool isActive,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _AIModel;

  factory AIModel.fromJson(Map<String, dynamic> json) =>
      _$AIModelFromJson(json);
}

enum AIModelType {
  priority,
  reply,
  categorization,
  spam;
}

@freezed
class AIModelConfiguration with _$AIModelConfiguration {
  const factory AIModelConfiguration({
    @Default(0.7) double temperature,
    @Default(500) int maxTokens,
    @Default(3) int timeoutSeconds,
    String? systemPrompt,
    @Default('json') String responseFormat,
  }) = _AIModelConfiguration;

  factory AIModelConfiguration.fromJson(Map<String, dynamic> json) =>
      _$AIModelConfigurationFromJson(json);
}

@freezed
class PerformanceMetrics with _$PerformanceMetrics {
  const factory PerformanceMetrics({
    PriorityMetrics? priorityScoring,
    CategorizationMetrics? categorization,
    ReplyMetrics? replyGeneration,
  }) = _PerformanceMetrics;

  factory PerformanceMetrics.fromJson(Map<String, dynamic> json) =>
      _$PerformanceMetricsFromJson(json);
}

@freezed
class PriorityMetrics with _$PriorityMetrics {
  const factory PriorityMetrics({
    required int totalPredictions,
    required double accuracy,
    required int userCorrections,
    required int avgResponseTimeMs,
    DateTime? lastEvaluatedAt,
  }) = _PriorityMetrics;

  factory PriorityMetrics.fromJson(Map<String, dynamic> json) =>
      _$PriorityMetricsFromJson(json);
}

@freezed
class CategorizationMetrics with _$CategorizationMetrics {
  const factory CategorizationMetrics({
    required int totalPredictions,
    required double accuracy,
    required int userCorrections,
    required double accuracyImprovement,
    required int avgResponseTimeMs,
  }) = _CategorizationMetrics;

  factory CategorizationMetrics.fromJson(Map<String, dynamic> json) =>
      _$CategorizationMetricsFromJson(json);
}

@freezed
class ReplyMetrics with _$ReplyMetrics {
  const factory ReplyMetrics({
    required int totalGenerated,
    required double acceptanceRate,
    required int avgResponseTimeMs,
  }) = _ReplyMetrics;

  factory ReplyMetrics.fromJson(Map<String, dynamic> json) =>
      _$ReplyMetricsFromJson(json);
}
```

### Notification Model

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'notification.freezed.dart';
part 'notification.g.dart';

@freezed
class Notification with _$Notification {
  const factory Notification({
    required String id,
    required String userId,
    String? messageId,
    required NotificationType notificationType,
    required String title,
    required String body,
    @Default(NotificationPriority.medium) NotificationPriority priorityLevel,
    @Default(DeliveryStatus.pending) DeliveryStatus deliveryStatus,
    required DateTime scheduledAt,
    DateTime? sentAt,
    DateTime? deliveredAt,
    DateTime? readAt,
    String? suppressionReason,
    @Default(DeliveryChannel.push) DeliveryChannel deliveryChannel,
    String? fcmToken,
    String? fcmMessageId,
    @Default({}) Map<String, dynamic> metadata,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _Notification;

  factory Notification.fromJson(Map<String, dynamic> json) =>
      _$NotificationFromJson(json);

  const Notification._();

  bool get isRead => readAt != null;
  bool get isDelivered => deliveredAt != null;
  bool get isSent => sentAt != null;
}

enum NotificationType {
  newMessage,
  urgent,
  system,
  batch;
}

enum NotificationPriority {
  low,
  medium,
  high,
  urgent;
}

enum DeliveryStatus {
  pending,
  sent,
  delivered,
  failed,
  suppressed;
}

enum DeliveryChannel {
  push,
  email,
  inApp;
}
```

### AnalyticsData Model

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'analytics_data.freezed.dart';
part 'analytics_data.g.dart';

@freezed
class AnalyticsData with _$AnalyticsData {
  const factory AnalyticsData({
    required String id,
    required String userId,
    required PeriodType periodType,
    required DateTime periodStart,
    required DateTime periodEnd,
    @Default(0) int totalMessagesReceived,
    @Default(0) int totalMessagesSent,
    @Default(0) int unreadCount,
    @Default(0) int urgentCount,
    @Default({}) Map<String, int> messagesByPlatform,
    @Default({}) Map<String, int> messagesByCategory,
    @Default({}) Map<String, int> messagesByPriority,
    @Default([]) List<TopContact> topContacts,
    @Default(ResponseTimeMetrics()) ResponseTimeMetrics responseTimeMetrics,
    @Default(0) int timeSavedMinutes,
    @Default(0) int aiSuggestionsAccepted,
    @Default(0) int aiSuggestionsTotal,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _AnalyticsData;

  factory AnalyticsData.fromJson(Map<String, dynamic> json) =>
      _$AnalyticsDataFromJson(json);

  const AnalyticsData._();

  double get aiAcceptanceRate =>
      aiSuggestionsTotal > 0 ? aiSuggestionsAccepted / aiSuggestionsTotal : 0.0;
}

enum PeriodType {
  daily,
  weekly,
  monthly,
  yearly;
}

@freezed
class TopContact with _$TopContact {
  const factory TopContact({
    required String name,
    required String identifier,
    required int messageCount,
    required String platform,
  }) = _TopContact;

  factory TopContact.fromJson(Map<String, dynamic> json) =>
      _$TopContactFromJson(json);
}

@freezed
class ResponseTimeMetrics with _$ResponseTimeMetrics {
  const factory ResponseTimeMetrics({
    @Default(0.0) double averageResponseTimeHours,
    @Default(0.0) double medianResponseTimeHours,
    @Default(0.0) double responseRate,
    @Default({}) Map<String, double> avgByPlatform,
  }) = _ResponseTimeMetrics;

  factory ResponseTimeMetrics.fromJson(Map<String, dynamic> json) =>
      _$ResponseTimeMetricsFromJson(json);
}
```

---

## State Management with Riverpod

### Repository Providers

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'repositories.g.dart';

// Supabase client provider
@riverpod
SupabaseClient supabase(SupabaseRef ref) {
  return Supabase.instance.client;
}

// User repository
@riverpod
UserRepository userRepository(UserRepositoryRef ref) {
  return UserRepository(ref.watch(supabaseProvider));
}

// Message repository
@riverpod
MessageRepository messageRepository(MessageRepositoryRef ref) {
  return MessageRepository(ref.watch(supabaseProvider));
}

// Connected account repository
@riverpod
ConnectedAccountRepository connectedAccountRepository(
    ConnectedAccountRepositoryRef ref) {
  return ConnectedAccountRepository(ref.watch(supabaseProvider));
}

// Category repository
@riverpod
CategoryRepository categoryRepository(CategoryRepositoryRef ref) {
  return CategoryRepository(ref.watch(supabaseProvider));
}

// Notification repository
@riverpod
NotificationRepository notificationRepository(NotificationRepositoryRef ref) {
  return NotificationRepository(ref.watch(supabaseProvider));
}

// Analytics repository
@riverpod
AnalyticsRepository analyticsRepository(AnalyticsRepositoryRef ref) {
  return AnalyticsRepository(ref.watch(supabaseProvider));
}
```

### State Providers

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'state_providers.g.dart';

// Current user provider
@riverpod
class CurrentUser extends _$CurrentUser {
  @override
  Future<User?> build() async {
    final supabase = ref.watch(supabaseProvider);
    final session = supabase.auth.currentSession;

    if (session == null) return null;

    final repo = ref.watch(userRepositoryProvider);
    return await repo.getUserById(session.user.id);
  }

  Future<void> updatePreferences(UserPreferences preferences) async {
    final currentUser = await future;
    if (currentUser == null) return;

    final repo = ref.watch(userRepositoryProvider);
    final updatedUser = currentUser.copyWith(preferences: preferences);

    await repo.updateUser(updatedUser);
    ref.invalidateSelf();
  }
}

// Messages list provider (with filters)
@riverpod
class MessageList extends _$MessageList {
  @override
  Future<List<Message>> build({
    String? accountId,
    String? categoryId,
    bool? readStatus,
    String? platform,
    PriorityLevel? priorityLevel,
    bool urgentOnly = false,
  }) async {
    final repo = ref.watch(messageRepositoryProvider);

    return await repo.getMessages(
      accountId: accountId,
      categoryId: categoryId,
      readStatus: readStatus,
      platform: platform,
      priorityLevel: priorityLevel,
      urgentOnly: urgentOnly,
    );
  }

  Future<void> markAsRead(String messageId) async {
    final repo = ref.watch(messageRepositoryProvider);
    await repo.updateReadStatus(messageId, true);
    ref.invalidateSelf();
  }

  Future<void> archiveMessage(String messageId) async {
    final repo = ref.watch(messageRepositoryProvider);
    await repo.archiveMessage(messageId);
    ref.invalidateSelf();
  }

  Future<void> categorizeMessage(String messageId, String categoryId) async {
    final repo = ref.watch(messageRepositoryProvider);
    await repo.updateCategory(messageId, categoryId);
    ref.invalidateSelf();
  }
}

// Connected accounts provider
@riverpod
class ConnectedAccounts extends _$ConnectedAccounts {
  @override
  Future<List<ConnectedAccount>> build() async {
    final repo = ref.watch(connectedAccountRepositoryProvider);
    final user = await ref.watch(currentUserProvider.future);

    if (user == null) return [];

    return await repo.getAccountsByUserId(user.id);
  }

  Future<void> syncAccount(String accountId) async {
    final repo = ref.watch(connectedAccountRepositoryProvider);
    await repo.triggerSync(accountId);
    ref.invalidateSelf();
  }

  Future<void> disconnectAccount(String accountId) async {
    final repo = ref.watch(connectedAccountRepositoryProvider);
    await repo.disconnectAccount(accountId);
    ref.invalidateSelf();
  }
}

// Categories provider
@riverpod
class Categories extends _$Categories {
  @override
  Future<List<Category>> build() async {
    final repo = ref.watch(categoryRepositoryProvider);
    final user = await ref.watch(currentUserProvider.future);

    // Get predefined + user's custom categories
    return await repo.getAllCategories(user?.id);
  }

  Future<void> createCategory(Category category) async {
    final repo = ref.watch(categoryRepositoryProvider);
    await repo.createCategory(category);
    ref.invalidateSelf();
  }

  Future<void> updateCategory(Category category) async {
    final repo = ref.watch(categoryRepositoryProvider);
    await repo.updateCategory(category);
    ref.invalidateSelf();
  }

  Future<void> deleteCategory(String categoryId) async {
    final repo = ref.watch(categoryRepositoryProvider);
    await repo.deleteCategory(categoryId);
    ref.invalidateSelf();
  }
}

// Unread count provider
@riverpod
Future<int> unreadCount(UnreadCountRef ref) async {
  final repo = ref.watch(messageRepositoryProvider);
  return await repo.getUnreadCount();
}

// Analytics provider
@riverpod
class Analytics extends _$Analytics {
  @override
  Future<AnalyticsData?> build({
    required PeriodType periodType,
    required DateTime periodStart,
  }) async {
    final repo = ref.watch(analyticsRepositoryProvider);
    final user = await ref.watch(currentUserProvider.future);

    if (user == null) return null;

    return await repo.getAnalytics(
      userId: user.id,
      periodType: periodType,
      periodStart: periodStart,
    );
  }
}
```

### Real-time Subscriptions

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'realtime_providers.g.dart';

// Real-time messages stream
@riverpod
Stream<List<Message>> messagesStream(MessagesStreamRef ref) {
  final supabase = ref.watch(supabaseProvider);
  final user = ref.watch(currentUserProvider).value;

  if (user == null) return Stream.value([]);

  return supabase
      .from('messages')
      .stream(primaryKey: ['id'])
      .eq('connected_account_id', user.id)
      .order('message_timestamp', ascending: false)
      .map((data) => data.map((json) => Message.fromJson(json)).toList());
}

// Real-time notifications stream
@riverpod
Stream<List<Notification>> notificationsStream(NotificationsStreamRef ref) {
  final supabase = ref.watch(supabaseProvider);
  final user = ref.watch(currentUserProvider).value;

  if (user == null) return Stream.value([]);

  return supabase
      .from('notifications')
      .stream(primaryKey: ['id'])
      .eq('user_id', user.id)
      .eq('delivery_status', 'delivered')
      .order('created_at', ascending: false)
      .limit(50)
      .map((data) => data.map((json) => Notification.fromJson(json)).toList());
}
```

---

## Caching Strategy

### Local Database (SQLite)

**Purpose**: Offline-first architecture with local cache for recent messages and user data.

**Implementation**:

```dart
// Local database schema (sqflite)
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class LocalDatabase {
  static final LocalDatabase instance = LocalDatabase._init();
  static Database? _database;

  LocalDatabase._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('communication_hub.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    // Users cache
    await db.execute('''
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        cached_at INTEGER NOT NULL
      )
    ''');

    // Messages cache
    await db.execute('''
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        connected_account_id TEXT NOT NULL,
        data TEXT NOT NULL,
        message_timestamp INTEGER NOT NULL,
        cached_at INTEGER NOT NULL,
        FOREIGN KEY (connected_account_id) REFERENCES connected_accounts(id)
      )
    ''');

    // Connected accounts cache
    await db.execute('''
      CREATE TABLE connected_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        data TEXT NOT NULL,
        cached_at INTEGER NOT NULL
      )
    ''');

    // Categories cache
    await db.execute('''
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        cached_at INTEGER NOT NULL
      )
    ''');

    // Create indexes
    await db.execute('CREATE INDEX idx_messages_timestamp ON messages(message_timestamp DESC)');
    await db.execute('CREATE INDEX idx_messages_account ON messages(connected_account_id)');
  }

  // Cache operations
  Future<void> cacheMessages(List<Message> messages) async {
    final db = await database;
    final batch = db.batch();

    for (final message in messages) {
      batch.insert(
        'messages',
        {
          'id': message.id,
          'connected_account_id': message.connectedAccountId,
          'data': jsonEncode(message.toJson()),
          'message_timestamp': message.messageTimestamp.millisecondsSinceEpoch,
          'cached_at': DateTime.now().millisecondsSinceEpoch,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }

    await batch.commit(noResult: true);
  }

  Future<List<Message>> getCachedMessages({int limit = 100}) async {
    final db = await database;
    final result = await db.query(
      'messages',
      orderBy: 'message_timestamp DESC',
      limit: limit,
    );

    return result
        .map((json) => Message.fromJson(jsonDecode(json['data'] as String)))
        .toList();
  }

  Future<void> clearOldCache({int maxAgeHours = 24}) async {
    final db = await database;
    final cutoffTime = DateTime.now()
        .subtract(Duration(hours: maxAgeHours))
        .millisecondsSinceEpoch;

    await db.delete('messages', where: 'cached_at < ?', whereArgs: [cutoffTime]);
  }
}
```

### Caching Provider

```dart
@riverpod
class MessageCache extends _$MessageCache {
  @override
  Future<List<Message>> build() async {
    // Try to load from local cache first
    final localDb = LocalDatabase.instance;
    final cachedMessages = await localDb.getCachedMessages();

    if (cachedMessages.isNotEmpty) {
      // Return cached data immediately
      state = AsyncData(cachedMessages);
    }

    // Fetch from Supabase in background
    final repo = ref.watch(messageRepositoryProvider);
    final freshMessages = await repo.getMessages(limit: 100);

    // Update cache
    await localDb.cacheMessages(freshMessages);

    return freshMessages;
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
  }
}
```

### Cache Invalidation Strategy

**Rules**:
1. **User actions**: Invalidate immediately (mark as read, archive, delete)
2. **Background sync**: Update cache every 60 seconds (FR-004)
3. **Age-based**: Clear cache older than 24 hours
4. **Storage limits**: Keep max 1000 messages locally (oldest deleted first)

---

## Data Migration & Versioning

### Database Migrations

**Supabase Migration Example**:

```sql
-- Migration: 001_add_message_search_index.sql
-- Date: 2025-11-16
-- Description: Add GIN index for full-text search on messages

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_search_vector
  ON messages USING GIN(search_vector);

-- Backfill search vectors for existing messages
UPDATE messages
SET search_vector =
  setweight(to_tsvector('english', COALESCE(subject, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content_text, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(sender_name, '')), 'C')
WHERE search_vector IS NULL;
```

### Data Retention Policy

**Implementation**:

```sql
-- Scheduled job to delete old messages (run daily)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  cutoff_date DATE;
BEGIN
  FOR user_record IN SELECT id, data_retention_days FROM users WHERE is_active = true
  LOOP
    cutoff_date := CURRENT_DATE - (user_record.data_retention_days || ' days')::INTERVAL;

    DELETE FROM messages
    WHERE connected_account_id IN (
      SELECT id FROM connected_accounts WHERE user_id = user_record.id
    )
    AND message_timestamp < cutoff_date;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily cleanup (using pg_cron extension in Supabase)
SELECT cron.schedule(
  'cleanup-old-messages',
  '0 2 * * *', -- 2 AM UTC daily
  'SELECT cleanup_old_messages();'
);
```

---

## Summary

This data model provides:

1. **Complete entity definitions** with all fields, relationships, and validation rules
2. **Production-ready PostgreSQL schema** following Supabase best practices with RLS
3. **Type-safe Flutter/Dart models** using Freezed for immutability and JSON serialization
4. **Riverpod state management** with repositories, providers, and real-time subscriptions
5. **Offline-first caching** using SQLite for resilient UX
6. **Data retention and migration** strategies for production deployment

**Next Steps**:
- Generate Freezed code: `flutter pub run build_runner build`
- Generate Riverpod providers: `flutter pub run build_runner watch`
- Apply database migrations to Supabase
- Implement repository layer with Supabase client
- Set up local SQLite cache
- Configure Row Level Security policies

---

**Document Status**: Complete - Ready for Phase 2 (Implementation)
**Last Updated**: 2025-11-16
**Next Review**: After implementation of core repositories
