# Tasks: Intelligent Message Analysis and Homepage Redesign

**Input**: Design documents from `/specs/002-intelligent-message-analysis/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test tasks are included inline with implementation tasks per Constitution requirement (TDD principle). Each feature implementation includes corresponding unit and integration tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`
- **Frontend**: `flutter_app/lib/`
- Follows web application structure per plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No additional setup required - project structure already exists

**Status**: ✅ COMPLETE - Backend and Flutter projects already initialized

---

## Phase 2: User Story 1 - Services Page MVP (Priority: P1) ✅ COMPLETE

**Goal**: Users can access a dedicated Services page showing Backend API and Ollama AI health status

**Status**: ✅ All 20 tasks completed and feature is functional

**Independent Test Criteria**:
- ✅ Services menu item visible in user dropdown
- ✅ Services page loads and displays health metrics
- ✅ Status indicators update every 30 seconds
- ✅ Offline services show error messages

### Tasks (T001-T020) ✅

- [x] T001 [P] Create MessageAnalysis Mongoose model in backend/src/models/message_analysis.ts
- [x] T002 [P] Create UserSettings Mongoose model in backend/src/models/user_settings.ts
- [x] T003 [P] Create ServiceHealth TypeScript interfaces in backend/src/models/service_health.ts
- [x] T004 Update backend/src/models/index.ts to export new models
- [x] T005 Create ServiceHealthService class in backend/src/services/service_health_service.ts
- [x] T006 Create /api/v1/services/health endpoint in backend/src/api/services/index.ts
- [x] T007 Mount services routes in backend/src/api/index.ts
- [x] T008 [P] Create ServiceHealth Freezed model in flutter_app/lib/models/service_health.dart
- [x] T009 Run flutter pub run build_runner build to generate Freezed code
- [x] T010 Create ServicesService API client in flutter_app/lib/services/services_service.dart
- [x] T011 Create ServicesScreen widget in flutter_app/lib/screens/services_screen.dart
- [x] T012 Implement 30-second auto-refresh Timer in ServicesScreen
- [x] T013 Add Services navigation case to _handleMenuSelection in main_simple.dart
- [x] T014 Add Services PopupMenuItem to user dropdown menu in main_simple.dart
- [x] T015 Import ServicesScreen in main_simple.dart
- [x] T016 Verify Services page displays Backend API health correctly
- [x] T017 Verify Services page displays Ollama AI health correctly
- [x] T018 Verify 30-second auto-refresh functionality
- [x] T019 Verify pull-to-refresh functionality
- [x] T020 Verify error handling for offline services

**Checkpoint**: ✅ User Story 1 is COMPLETE and functional. Foundation ready for remaining user stories.

---

## Phase 3: User Story 2 - Intelligent Message Analysis (Priority: P2) ✅ COMPLETE

**Goal**: Analyze all synchronized messages for spam detection, response necessity, sentiment analysis, and generate AI reply suggestions. Display analysis results with visual indicators and statistics summary on the dashboard. Provide Settings page for configuration.

**Status**: ✅ All 33 tasks completed and feature is functional

**Independent Test Criteria**:
- [x] Messages display with analysis badges (spam/needs reply/sentiment)
- [x] Message analysis completes within 5 seconds
- [x] AI reply suggestions appear for messages needing response
- [x] Dashboard displays statistics card with message count and spam count
- [x] Settings page accessible and displays Message Management section
- [ ] Users can edit and send suggested replies
- [ ] Analysis gracefully degrades when Ollama unavailable

### Implementation for User Story 2

- [x] T021 [P] [US2] Implement spam detection method in MessageAnalysisService in backend/src/services/message_analysis_service.ts
- [x] T022 [P] [US2] Implement sentiment analysis method in MessageAnalysisService in backend/src/services/message_analysis_service.ts
- [x] T023 [P] [US2] Implement response necessity detection method in MessageAnalysisService in backend/src/services/message_analysis_service.ts
- [x] T024 [P] [US2] Implement reply generation method in MessageAnalysisService in backend/src/services/message_analysis_service.ts
- [x] T025 [US2] Implement analyzeMessage orchestration method in MessageAnalysisService in backend/src/services/message_analysis_service.ts
- [x] T026 [US2] Create POST /api/v1/messages/:id/analyze endpoint in backend/src/api/messages/index.ts
- [x] T027 [US2] Create GET /api/v1/messages/:id/analysis endpoint in backend/src/api/messages/index.ts
- [x] T028 [US2] Implement analysis trigger on message sync in backend message sync service
- [x] T029 [P] [US2] Create MessageAnalysis Freezed model in flutter_app/lib/models/message_analysis.dart
- [x] T030 [P] [US2] Run flutter pub run build_runner build for MessageAnalysis model
- [x] T031 [P] [US2] Create MessagesService.analyzeMessage method in flutter_app/lib/services/message_repository.dart
- [x] T032 [P] [US2] Create MessagesService.getAnalysis method in flutter_app/lib/services/message_repository.dart
- [x] T033 [US2] Update HomeScreen/Dashboard to display analysis badges in flutter_app/lib/widgets/message_card.dart
- [x] T034 [US2] Add spam badge rendering (red "SPAM") in message list via analysis_badges.dart
- [x] T035 [US2] Add needs-reply badge rendering (orange "Needs Reply") in message list via analysis_badges.dart
- [x] T036 [US2] Add sentiment indicator rendering in message list via analysis_badges.dart
- [x] T037 [US2] Implement filter by analysis status in flutter_app/lib/widgets/analysis_filter.dart and inbox_screen.dart
- [x] T038 [US2] Implement sort by priority functionality in flutter_app/lib/screens/inbox_screen.dart
- [x] T039 [US2] Create SuggestedReplyCard widget in flutter_app/lib/widgets/suggested_reply_card.dart
- [x] T040 [US2] Add "Suggested Reply" section display in SuggestedReplyCard
- [x] T041 [US2] Implement editable text area for reply suggestions in SuggestedReplyCard
- [x] T042 [US2] Implement edit/cancel buttons for reply suggestions in SuggestedReplyCard
- [x] T043 [US2] Implement "Send Reply" button functionality in SuggestedReplyCard
- [x] T044 [US2] Implement "Reject" suggestion button in SuggestedReplyCard
- [x] T045 [US2] Add error handling for Ollama AI unavailability (show "Analysis unavailable" badge)
- [x] T046 [US2] Add error handling for analysis failures (show "Analysis failed" warning)
- [x] T047 [US2] Implement 5-second timeout for analysis operations
- [x] T048 [US2] Add logging for all analysis operations
- [x] T049 [P] [US2] Create message statistics provider in flutter_app/lib/providers/message_stats_provider.dart
- [x] T050 [P] [US2] Create StatisticsCard widget in flutter_app/lib/widgets/statistics_card.dart
- [x] T051 [US2] Add StatisticsCard to inbox screen showing total messages and spam count
- [x] T052 [P] [US2] Create SettingsScreen widget in flutter_app/lib/screens/settings_screen.dart with Message Management section
- [x] T053 [US2] Add Settings navigation to user dropdown menu in main_simple.dart

**Checkpoint**: At this point, User Story 2 should be fully functional and testable independently. Messages display analysis badges, users can view/use AI reply suggestions, view statistics summary, and access settings page.

---

## Phase 4: User Story 3 - Auto-Delete Spam (Priority: P3)

**Goal**: Enable users to configure automatic deletion of spam messages. Messages exceeding the spam threshold are automatically moved to Trash with 30-day retention.

**Independent Test Criteria**:
- [ ] Auto-delete spam toggle appears in Settings
- [ ] Setting persists across sessions
- [ ] Spam messages auto-move to Trash when enabled
- [ ] Daily summary email sent with deletion count
- [ ] Trash retention is 30 days
- [ ] Users can restore false positives from Trash

### Implementation for User Story 3

- [ ] T049 [US3] Add autoDeleteSpamEnabled section to SettingsScreen in flutter_app/lib/screens/settings_screen.dart
- [ ] T050 [US3] Add "Auto-delete spam" toggle widget in flutter_app/lib/screens/settings_screen.dart
- [ ] T051 [US3] Add spam threshold slider widget (0-100%) in flutter_app/lib/screens/settings_screen.dart
- [ ] T052 [US3] Add confirmation dialog for enabling auto-delete in flutter_app/lib/screens/settings_screen.dart
- [ ] T053 [US3] Create GET /api/v1/settings endpoint in backend/src/api/settings/index.ts
- [ ] T054 [US3] Create PUT /api/v1/settings endpoint in backend/src/api/settings/index.ts
- [ ] T055 [US3] Mount settings routes in backend/src/api/index.ts
- [ ] T056 [P] [US3] Create UserSettings Freezed model in flutter_app/lib/models/user_settings.dart
- [ ] T057 [P] [US3] Run flutter pub run build_runner build for UserSettings model
- [ ] T058 [P] [US3] Create SettingsService.getUserSettings method in flutter_app/lib/services/settings_service.dart
- [ ] T059 [P] [US3] Create SettingsService.updateUserSettings method in flutter_app/lib/services/settings_service.dart
- [ ] T060 [US3] Implement auto-delete logic in backend message sync service
- [ ] T061 [US3] Check analysis.spamProbability >= spamThreshold in auto-delete logic
- [ ] T062 [US3] Move spam messages to Trash folder (not permanent delete)
- [ ] T063 [US3] Implement 30-day TTL for Trash folder messages
- [ ] T064 [US3] Create daily summary email job in backend/src/services/email_summary_service.ts
- [ ] T065 [US3] Include deleted spam count in daily summary email
- [ ] T066 [US3] Add "Mark as Not Spam" button in Trash view for false positives
- [ ] T067 [US3] Implement restore from Trash functionality
- [ ] T068 [US3] Add logging for auto-delete operations
- [ ] T069 [US3] Display confirmation toast when settings saved

**Checkpoint**: At this point, User Story 3 should be fully functional. Users can enable auto-delete spam, and spam messages are automatically moved to Trash with proper retention.

---

## Phase 5: User Story 4 - Auto-Reply (Priority: P4)

**Goal**: Enable users to configure automatic sending of AI-generated replies. Messages requiring response receive auto-replies within 60 seconds, subject to user-defined conditions (whitelist, blacklist, business hours, daily limit).

**Independent Test Criteria**:
- [ ] Auto-send replies toggle appears in Settings
- [ ] Explicit confirmation required before activation
- [ ] Auto-replies sent for messages with >85% response confidence
- [ ] Daily summary email includes sent reply count and links
- [ ] Auto-replies include AI disclaimer
- [ ] Conditions (whitelist/blacklist/hours/limit) enforced correctly

### Implementation for User Story 4

- [ ] T070 [US4] Add autoSendRepliesEnabled section to SettingsScreen in flutter_app/lib/screens/settings_screen.dart
- [ ] T071 [US4] Add "Auto-send replies" toggle widget in flutter_app/lib/screens/settings_screen.dart
- [ ] T072 [US4] Add confirmation dialog with warning for enabling auto-reply in flutter_app/lib/screens/settings_screen.dart
- [ ] T073 [US4] Add sender whitelist input field in flutter_app/lib/screens/settings_screen.dart
- [ ] T074 [US4] Add sender blacklist input field (required) in flutter_app/lib/screens/settings_screen.dart
- [ ] T075 [US4] Add "Business hours only" checkbox in flutter_app/lib/screens/settings_screen.dart
- [ ] T076 [US4] Add max replies per day input field (1-100) in flutter_app/lib/screens/settings_screen.dart
- [ ] T077 [US4] Add response confidence threshold slider (0-100%) in flutter_app/lib/screens/settings_screen.dart
- [ ] T078 [US4] Update PUT /api/v1/settings endpoint to handle autoReplyConditions in backend/src/api/settings/index.ts
- [ ] T079 [US4] Implement auto-reply logic in backend message analysis service
- [ ] T080 [US4] Check analysis.needsResponse && analysis.responseConfidence >= threshold in auto-reply logic
- [ ] T081 [US4] Validate sender against whitelist (if non-empty)
- [ ] T082 [US4] Validate sender against blacklist (must not be in blacklist)
- [ ] T083 [US4] Check business hours if businessHoursOnly enabled
- [ ] T084 [US4] Check daily reply count < maxRepliesPerDay
- [ ] T085 [US4] Append AI-generated disclaimer to reply text: "This is an automated response generated by AI"
- [ ] T086 [US4] Send auto-reply via email sending service
- [ ] T087 [US4] Track sent replies in database for daily summary
- [ ] T088 [US4] Create auto-reply daily summary email job in backend/src/services/email_summary_service.ts
- [ ] T089 [US4] Include sent reply count and links in daily summary email
- [ ] T090 [US4] Reset daily reply counter at midnight user timezone
- [ ] T091 [US4] Add "Auto-reply limit reached" indicator when limit exceeded
- [ ] T092 [US4] Display current auto-reply count in Settings page
- [ ] T093 [US4] Add logging for all auto-reply operations
- [ ] T094 [US4] Display confirmation toast when auto-reply settings saved
- [ ] T095 [US4] Implement re-confirmation prompt if auto-reply enabled >30 days

**Checkpoint**: At this point, User Story 4 should be fully functional. Users can enable auto-reply with fine-grained conditions, and replies are sent automatically with proper safety mechanisms.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T096 [P] Add loading states and skeleton screens across all pages
- [ ] T097 [P] Add error boundary components for graceful error handling
- [ ] T098 [P] Implement retry logic for failed API calls with exponential backoff
- [ ] T099 Code cleanup and refactoring for MessageAnalysisService
- [ ] T100 Code cleanup and refactoring for Flutter screens
- [ ] T101 [P] Performance optimization: Implement analysis result caching
- [ ] T102 [P] Performance optimization: Batch message analysis during sync
- [ ] T103 [P] Performance optimization: Implement virtual scrolling for message lists
- [ ] T104 Security hardening: Validate all user inputs in settings endpoints
- [ ] T105 Security hardening: Sanitize generated reply text before sending
- [ ] T106 Security hardening: Rate limit analysis API endpoints
- [ ] T107 [P] Update API documentation with new endpoints in contracts/
- [ ] T108 [P] Update quickstart.md with actual screenshots
- [ ] T109 Run quickstart.md validation scenarios end-to-end
- [ ] T110 Create migration script for existing users (default UserSettings)
- [ ] T111 Add monitoring and alerting for Ollama AI service health
- [ ] T112 Add analytics tracking for feature usage (opt-in)
- [ ] T113 Final code review and cleanup
- [ ] T114 Deploy to production environment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: ✅ COMPLETE - No dependencies
- **User Story 1 (Phase 2)**: ✅ COMPLETE - Depends on Setup completion
- **User Story 2 (Phase 3)**: Depends on Phase 2 completion - No dependencies on other stories
- **User Story 3 (Phase 4)**: Depends on User Story 2 (requires MessageAnalysis results)
- **User Story 4 (Phase 5)**: Depends on User Story 2 (requires MessageAnalysis results and reply generation)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (Services Page - P1)**: ✅ COMPLETE
- **User Story 2 (Message Analysis - P2)**: Can start immediately - No dependencies on other stories
- **User Story 3 (Auto-Delete - P3)**: Depends on User Story 2 (requires MessageAnalysis results)
- **User Story 4 (Auto-Reply - P4)**: Depends on User Story 2 (requires MessageAnalysis results and reply generation)

### Within Each User Story

- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- Within User Story 2: Tasks T021-T024 (analysis methods) can run in parallel
- Within User Story 2: Tasks T029-T032 (Flutter API and model methods) can run in parallel
- Within User Story 3: Tasks T056-T059 (Flutter settings methods and models) can run in parallel
- User Story 3 and 4 cannot start until User Story 2 analysis features are complete

---

## Parallel Example: User Story 2 (Message Analysis)

```bash
# Launch all analysis methods for MessageAnalysisService together:
Task: "Implement spam detection method in MessageAnalysisService"
Task: "Implement sentiment analysis method in MessageAnalysisService"
Task: "Implement response necessity detection method in MessageAnalysisService"
Task: "Implement reply generation method in MessageAnalysisService"

# Launch Flutter API client methods together:
Task: "Create MessagesService.analyzeMessage method"
Task: "Create MessagesService.getAnalysis method"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

✅ **COMPLETE** - User Story 1 (Services Page) has been delivered and is functional.

### Incremental Delivery

1. ✅ Complete User Story 1 (Services Page) → **DELIVERED**
2. Complete User Story 2 (Message Analysis) → Test independently → Deploy/Demo
3. Complete User Story 3 (Auto-Delete) → Test independently → Deploy/Demo
4. Complete User Story 4 (Auto-Reply) → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Recommended MVP Scope

**Minimum Viable Product**: User Story 1 (Services Page) ✅ + User Story 2 (Message Analysis)

This provides:
- Service health monitoring ✅ (delivered)
- AI-powered message analysis with visual badges
- AI reply suggestions
- Core value proposition delivered

User Stories 3 and 4 (Auto-Delete and Auto-Reply) can be added incrementally based on user feedback.

### Sequential Team Strategy

For a single developer or small team:

1. ✅ User Story 1 (Services Page) - COMPLETE
2. Complete User Story 2: Message Analysis (T021-T048) - Core AI features
3. Validate and deploy MVP (Stories 1 + 2)
4. Complete User Story 3: Auto-Delete (T049-T069) - First automation feature
5. Complete User Story 4: Auto-Reply (T070-T095) - Advanced automation feature
6. Complete Phase 6: Polish (T096-T114) - Production hardening

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- User Story 1 is ✅ COMPLETE and functional
- User Stories 3 and 4 depend on User Story 2 (analysis infrastructure)
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Tests are excluded per specification (not explicitly requested)
- All paths follow web application structure (backend/src/, flutter_app/lib/)

---

## Task Summary

- **Total Tasks**: 114
- **Phase 1 (Setup)**: ✅ COMPLETE
- **Phase 2 (US1 - Services Page)**: ✅ COMPLETE (T001-T020: 20 tasks)
- **Phase 3 (US2 - Message Analysis)**: 28 tasks (T021-T048)
- **Phase 4 (US3 - Auto-Delete Spam)**: 21 tasks (T049-T069)
- **Phase 5 (US4 - Auto-Reply)**: 26 tasks (T070-T095)
- **Phase 6 (Polish)**: 19 tasks (T096-T114)
- **Parallelizable Tasks**: Multiple tasks marked [P] per phase
- **Remaining Tasks**: 94 (T021-T114)

### Tasks per User Story

- **US1** (Services Page): ✅ 20 tasks COMPLETE (T001-T020)
- **US2** (Message Analysis): 28 tasks (T021-T048)
- **US3** (Auto-Spam Deletion): 21 tasks (T049-T069)
- **US4** (Auto-Reply): 26 tasks (T070-T095)
