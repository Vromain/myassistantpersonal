# Implementation Tasks: Intelligent Message Analysis and Homepage Redesign

**Feature**: 002-intelligent-message-analysis
**Created**: 2025-11-19
**Tech Stack**: Flutter 3.x (Frontend), Node.js/TypeScript (Backend), MongoDB, Ollama AI

## Overview

This document organizes implementation tasks by user story to enable independent development, testing, and deployment of each feature increment.

### User Stories (from spec.md)

1. **US1**: Accessing System Services - Services page with health metrics
2. **US2**: Reviewing Intelligent Message Analysis - Dashboard with AI insights
3. **US3**: Configuring Auto-Spam Deletion - Settings toggle and automation
4. **US4**: Configuring Auto-Reply - Settings toggle with confirmation

### Implementation Strategy

- **MVP Scope**: User Story 1 (Services Page) - Delivers immediate value by cleaning up homepage
- **Incremental Delivery**: Each user story is independently deployable
- **Testing**: Manual testing for UI, integration testing for AI features
- **Parallel Execution**: Tasks marked [P] can run concurrently within each story

---

## Phase 1: Setup & Prerequisites

**Goal**: Prepare codebase for new features

### Tasks

- [ ] T001 Review existing codebase structure (backend/src, flutter_app/lib)
- [ ] T002 [P] Create MessageAnalysis model schema in backend/src/models/message_analysis.ts
- [ ] T003 [P] Create UserSettings model schema in backend/src/models/user_settings.ts
- [ ] T004 [P] Create ServiceHealth model/interface in backend/src/models/service_health.ts
- [ ] T005 Update backend API routes index in backend/src/api/index.ts (prepare for new routes)
- [ ] T006 Create Flutter services directory structure in flutter_app/lib/services/
- [ ] T007 Create Flutter models directory for new entities in flutter_app/lib/models/

**Completion Criteria**:
- All model schemas defined with proper TypeScript interfaces
- MongoDB schemas created for persistence
- Flutter directory structure ready for new components
- No breaking changes to existing functionality

---

## Phase 2: User Story 1 - Accessing System Services

**Story Goal**: Users can access a dedicated Services page showing Backend API and Ollama AI health status

**Independent Test Criteria**:
- [ ] Services menu item visible in user dropdown
- [ ] Services page loads and displays health metrics
- [ ] Status indicators update every 30 seconds
- [ ] Offline services show error messages

### Backend Tasks

- [ ] T008 [US1] Create ServiceHealthService in backend/src/services/service_health_service.ts
- [ ] T009 [US1] Implement getBackendHealth() method returning status, endpoint, response time
- [ ] T010 [US1] Implement getOllamaHealth() method returning availability, model, last check
- [ ] T011 [US1] Create /api/v1/services/health endpoint in backend/src/api/services/index.ts
- [ ] T012 [US1] Add auto-refresh logic (30s interval) to health endpoint

### Frontend Tasks

- [ ] T013 [P] [US1] Create ServiceHealth model in flutter_app/lib/models/service_health.dart
- [ ] T014 [P] [US1] Create ServicesService API client in flutter_app/lib/services/services_service.dart
- [ ] T015 [US1] Create Services page widget in flutter_app/lib/pages/services_page.dart
- [ ] T016 [US1] Implement health metrics display with status indicators
- [ ] T017 [US1] Add 30-second auto-refresh using Timer in Services page
- [ ] T018 [US1] Add "Services" menu item to user dropdown in flutter_app/lib/main_simple.dart
- [ ] T019 [US1] Create /services route in Flutter routing configuration
- [ ] T020 [US1] Remove service cards from homepage dashboard in flutter_app/lib/main_simple.dart

**Story Completion**: User can access Services page from menu, view real-time health status of Backend API and Ollama AI

---

## Phase 3: User Story 2 - Reviewing Intelligent Message Analysis

**Story Goal**: Users see analyzed messages with spam detection, response necessity, and AI-generated reply suggestions

**Independent Test Criteria**:
- [ ] Messages display with analysis badges (spam/needs reply/reviewed)
- [ ] Message analysis completes within 5 seconds
- [ ] AI reply suggestions appear for messages needing response
- [ ] Users can edit and send suggested replies

### Backend Tasks - Analysis Engine

- [ ] T021 [US2] Create MessageAnalysisService in backend/src/services/message_analysis_service.ts
- [ ] T022 [US2] Implement analyzeMessage() method calling Ollama for spam detection
- [ ] T023 [US2] Implement detectResponseNecessity() using Ollama sentiment analysis
- [ ] T024 [US2] Implement generateReply() using Ollama text generation
- [ ] T025 [US2] Add message analysis to sync workflow in backend/src/services/sync_scheduler.ts
- [ ] T026 [US2] Create /api/v1/messages/:id/analysis endpoint in backend/src/api/messages/index.ts
- [ ] T027 [US2] Create /api/v1/messages/:id/generate-reply endpoint
- [ ] T028 [US2] Add analysis results to message list endpoint response

### Frontend Tasks - Dashboard Enhancement

- [ ] T029 [P] [US2] Create MessageAnalysis model in flutter_app/lib/models/message_analysis.dart
- [ ] T030 [P] [US2] Create MessageAnalysisService in flutter_app/lib/services/message_analysis_service.dart
- [ ] T031 [US2] Update dashboard to fetch analysis data with messages
- [ ] T032 [US2] Create analysis badge components (spam/needs-reply/reviewed) in flutter_app/lib/widgets/
- [ ] T033 [US2] Add badge rendering to message list items in dashboard
- [ ] T034 [US2] Implement message filtering by analysis category
- [ ] T035 [US2] Implement message sorting by analysis result
- [ ] T036 [US2] Create message detail view with full analysis in flutter_app/lib/pages/message_detail_page.dart
- [ ] T037 [US2] Add "Suggested Reply" section to message detail view
- [ ] T038 [US2] Implement editable reply text area with send functionality
- [ ] T039 [US2] Add "Regenerate" button to fetch new reply suggestion
- [ ] T040 [US2] Track sent replies in message history

**Story Completion**: Dashboard displays analyzed messages with visual indicators, users can review AI suggestions and send replies

---

## Phase 4: User Story 3 - Configuring Auto-Spam Deletion

**Story Goal**: Users can enable automatic deletion of spam messages with configurable thresholds

**Independent Test Criteria**:
- [ ] Auto-delete spam toggle appears in Settings
- [ ] Setting persists across sessions
- [ ] Spam messages auto-move to Trash when enabled
- [ ] Daily summary email sent with deletion count

### Backend Tasks - Auto-Delete Logic

- [ ] T041 [US3] Add autoDeleteSpam field to UserSettings model in backend/src/models/user_settings.ts
- [ ] T042 [US3] Create /api/v1/settings endpoint GET/PUT in backend/src/api/settings/index.ts
- [ ] T043 [US3] Implement auto-delete logic in MessageAnalysisService
- [ ] T044 [US3] Add spam threshold check (>80%) before auto-delete
- [ ] T045 [US3] Implement moveToTrash() method in backend/src/services/message_service.ts
- [ ] T046 [US3] Create background job for Trash cleanup (30-day retention) in backend/src/services/
- [ ] T047 [US3] Implement daily summary email generation in backend/src/services/email_service.ts
- [ ] T048 [US3] Add summary email scheduling to cron jobs

### Frontend Tasks - Settings UI

- [ ] T049 [P] [US3] Create UserSettings model in flutter_app/lib/models/user_settings.dart
- [ ] T050 [P] [US3] Create SettingsService API client in flutter_app/lib/services/settings_service.dart
- [ ] T051 [US3] Create Settings page if not exists in flutter_app/lib/pages/settings_page.dart
- [ ] T052 [US3] Add "Message Management" section to Settings page
- [ ] T053 [US3] Add "Auto-delete spam" toggle widget
- [ ] T054 [US3] Implement toggle persistence (save on change)
- [ ] T055 [US3] Add confirmation dialog on toggle enable
- [ ] T056 [US3] Display setting status ("Enabled" / "Disabled")

**Story Completion**: Users can toggle auto-delete spam in Settings, spam is automatically moved to Trash when enabled

---

## Phase 5: User Story 4 - Configuring Auto-Reply

**Story Goal**: Users can enable automatic sending of AI-generated replies with safety controls

**Independent Test Criteria**:
- [ ] Auto-send replies toggle appears in Settings
- [ ] Explicit confirmation required before activation
- [ ] Auto-replies sent for messages with >85% response confidence
- [ ] Daily summary email includes sent reply count and links
- [ ] Auto-replies include AI disclaimer

### Backend Tasks - Auto-Reply Logic

- [ ] T057 [US4] Add autoSendReplies field to UserSettings model
- [ ] T058 [US4] Add autoReplyConditions (whitelist/blacklist/hours/limits) to UserSettings
- [ ] T059 [US4] Implement auto-reply logic in MessageAnalysisService
- [ ] T060 [US4] Add response confidence threshold check (>85%)
- [ ] T061 [US4] Implement sendAutoReply() method in backend/src/services/message_service.ts
- [ ] T062 [US4] Add AI disclaimer to auto-generated replies
- [ ] T063 [US4] Implement sender whitelist/blacklist filtering
- [ ] T064 [US4] Implement business hours check based on user timezone
- [ ] T065 [US4] Implement daily reply limit counter and enforcement
- [ ] T066 [US4] Update daily summary email to include auto-reply info
- [ ] T067 [US4] Add auto-reply tracking to message history

### Frontend Tasks - Settings UI & Confirmation

- [ ] T068 [P] [US4] Add "Auto-send replies" toggle to Settings page
- [ ] T069 [P] [US4] Create AutoReplyConditions form in flutter_app/lib/widgets/
- [ ] T070 [US4] Implement confirmation dialog with warning message
- [ ] T071 [US4] Add sender whitelist/blacklist input fields
- [ ] T072 [US4] Add "Business hours only" checkbox
- [ ] T073 [US4] Add "Max replies per day" number input
- [ ] T074 [US4] Implement conditions save functionality
- [ ] T075 [US4] Display current auto-reply status and conditions
- [ ] T076 [US4] Add daily summary view showing sent auto-replies

**Story Completion**: Users can configure auto-reply with safety controls, replies are automatically sent based on conditions

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Ensure quality, performance, and user experience across all stories

### Tasks

- [ ] T077 [P] Add error handling for Ollama AI service failures
- [ ] T078 [P] Implement graceful degradation when AI unavailable
- [ ] T079 [P] Add loading states to all async operations
- [ ] T080 [P] Optimize dashboard query performance for 100+ messages
- [ ] T081 Add user feedback mechanism for false positives/negatives
- [ ] T082 Implement analysis accuracy logging for monitoring
- [ ] T083 Add mobile-responsive styles to Services page
- [ ] T084 Add mobile-responsive styles to Settings page
- [ ] T085 Create user documentation for new features
- [ ] T086 Add analytics tracking for feature usage
- [ ] T087 Performance testing: Message analysis <5s
- [ ] T088 Performance testing: Services page load <2s
- [ ] T089 Performance testing: Dashboard load <3s with 100 messages
- [ ] T090 Security review: Validate auto-reply cannot send sensitive data
- [ ] T091 Security review: Validate spam deletion has recovery mechanism

**Completion Criteria**:
- All features work on mobile and desktop
- Performance targets met
- Error states handled gracefully
- Security validations passed

---

## Dependencies & Execution Order

### Story Dependencies

```
US1 (Services Page) ← No dependencies, can start immediately
US2 (Message Analysis) ← Requires Phase 1 (Models)
US3 (Auto-Spam Deletion) ← Requires US2 (Analysis engine)
US4 (Auto-Reply) ← Requires US2 (Analysis engine)
```

### Parallel Execution Opportunities

**Phase 1** (Setup):
- T002, T003, T004 (Model creation) - All parallel
- T006, T007 (Flutter directories) - Parallel

**Phase 2** (US1):
- T008-T012 (Backend) || T013-T014 (Frontend models/services) - Parallel tracks
- T015-T020 (Frontend UI) - Sequential after T013-T014

**Phase 3** (US2):
- T021-T028 (Backend analysis) || T029-T030 (Frontend models/services) - Parallel tracks
- T031-T040 (Frontend dashboard) - Sequential after T029-T030

**Phase 4** (US3):
- T041-T048 (Backend auto-delete) || T049-T050 (Frontend models/services) - Parallel tracks
- T051-T056 (Frontend settings UI) - Sequential after T049-T050

**Phase 5** (US4):
- T057-T067 (Backend auto-reply) || T068-T069 (Frontend forms) - Parallel tracks
- T070-T076 (Frontend settings completion) - Sequential after T068-T069

**Phase 6** (Polish):
- T077-T079, T080, T082-T084, T086 (All parallel)
- T087-T091 (Testing/validation) - Can run parallel

---

## MVP Recommendation

**Minimum Viable Product**: User Story 1 only (Tasks T001-T020)

**Rationale**:
- Delivers immediate UX improvement (cleaner homepage)
- Independent of AI complexity
- Can be deployed and tested quickly
- Provides Services monitoring value
- Foundation for subsequent stories

**Incremental Releases**:
1. **Release 1**: US1 - Services Page
2. **Release 2**: US1 + US2 - Message Analysis (Read-only)
3. **Release 3**: US1 + US2 + US3 - Add Auto-Spam Deletion
4. **Release 4**: Full Feature - Add Auto-Reply

---

## Task Summary

- **Total Tasks**: 91
- **Phase 1 (Setup)**: 7 tasks
- **Phase 2 (US1 - Services Page)**: 13 tasks
- **Phase 3 (US2 - Message Analysis)**: 20 tasks
- **Phase 4 (US3 - Auto-Spam Deletion)**: 16 tasks
- **Phase 5 (US4 - Auto-Reply)**: 20 tasks
- **Phase 6 (Polish)**: 15 tasks
- **Parallelizable Tasks**: 23 tasks marked [P]

### Tasks per User Story

- **US1** (Services Page): 13 tasks (T008-T020)
- **US2** (Message Analysis): 20 tasks (T021-T040)
- **US3** (Auto-Spam Deletion): 16 tasks (T041-T056)
- **US4** (Auto-Reply): 20 tasks (T057-T076)

---

## Notes

- All tasks follow checklist format: `- [ ] [TID] [P?] [Story?] Description with file path`
- Each user story is independently testable
- Backend uses existing Ollama AI integration (no new AI service setup needed)
- Frontend follows existing Flutter architecture (StatefulWidget, Services pattern)
- MongoDB schemas extend existing models (User, Message)
- Tests are not included as specification doesn't explicitly request TDD
- Security considerations addressed in US4 tasks (T062, T063, T090)
- Performance targets addressed in Phase 6 (T080, T087-T089)
