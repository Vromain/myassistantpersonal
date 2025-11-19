<!--
SYNC IMPACT REPORT
==================
Version: [TEMPLATE] → 1.0.0
Change Type: MINOR (Initial constitution ratification)

Sections Added:
- Core Principles (5 principles defined)
- Development Standards
- Quality Gates
- Governance

Principles Defined:
1. Simplicity First
2. Test-Driven Development
3. Documentation as Code
4. Incremental Delivery
5. Security by Default

Templates Consistency:
- ✅ plan-template.md - Constitution Check section references this file
- ✅ spec-template.md - Requirements align with principles
- ✅ tasks-template.md - Task structure supports TDD and incremental delivery

Follow-up TODOs: None
-->

# MyAssistantPersonal Constitution

## Core Principles

### I. Simplicity First

Every solution MUST start with the simplest viable approach. Complexity requires explicit
justification documented in plan.md. YAGNI (You Aren't Gonna Need It) is enforced—build only
what is needed now, not what might be needed later.

**Rationale**: Simple code is easier to understand, test, maintain, and debug. Premature
optimization and speculative features increase maintenance burden without delivering immediate
value.

### II. Test-Driven Development

All features MUST follow the red-green-refactor cycle:
- Write failing tests first
- Implement minimal code to pass tests
- Refactor while keeping tests green

Unit tests are REQUIRED for all business logic. Integration tests are REQUIRED for:
- New API contracts
- Cross-service communication
- External dependencies
- Data persistence layers

**Rationale**: TDD ensures code is testable by design, provides living documentation, and
catches regressions early. Front-loading test design clarifies requirements before
implementation begins.

### III. Documentation as Code

Code MUST be self-documenting through clear naming and structure. Additional documentation is
REQUIRED for:
- Public APIs and contracts (in contracts/ directory)
- Architecture decisions (in plan.md)
- User-facing features (in quickstart.md)
- Complex algorithms or business logic (inline comments)

All documentation MUST be maintained alongside code changes—stale docs are worse than no docs.

**Rationale**: Documentation enables onboarding, reduces knowledge silos, and prevents
assumptions. Keeping docs near code reduces synchronization overhead.

### IV. Incremental Delivery

Features MUST be broken into independently testable user stories with assigned priorities
(P1, P2, P3, etc.). Each story MUST be deliverable as a standalone increment that provides
user value.

Implementation MUST proceed in priority order (P1 → P2 → P3). Lower-priority stories can be
deferred without blocking higher-priority work.

**Rationale**: Incremental delivery enables early feedback, reduces risk, and allows pivoting
based on user needs. Independent stories enable parallel development and flexible scope
management.

### V. Security by Default

Security MUST be considered at design time, not retrofitted. All features MUST:
- Validate and sanitize user input
- Use parameterized queries for database access
- Implement proper authentication and authorization
- Log security-relevant events
- Follow least-privilege principles

OWASP Top 10 vulnerabilities MUST be addressed during code review.

**Rationale**: Security vulnerabilities can have severe consequences. Fixing security issues
after deployment is exponentially more expensive than preventing them during development.

## Development Standards

### Code Quality

- All code MUST pass linting and formatting checks before commit
- Code reviews are REQUIRED for all changes
- Cyclomatic complexity MUST be kept low (< 10 per function as guideline)
- No commented-out code in production branches
- Magic numbers MUST be replaced with named constants

### Dependency Management

- Dependencies MUST be pinned to specific versions
- New dependencies require justification in plan.md
- Licenses MUST be compatible with project license
- Security vulnerabilities in dependencies MUST be addressed within 7 days

## Quality Gates

Before merging to main branch:

1. **All tests pass**: Unit, integration, and contract tests green
2. **Code review approved**: At least one reviewer approval required
3. **Documentation updated**: All affected docs synchronized with code changes
4. **No security violations**: OWASP check passed, no known vulnerabilities
5. **Constitution compliance**: All principles verified during review

## Governance

### Amendment Process

Constitution changes REQUIRE:
1. Proposal documenting change rationale
2. Review of impact on existing code and templates
3. Update of all dependent templates (plan, spec, tasks)
4. Version increment following semantic versioning
5. Documentation of migration path for in-flight work

### Versioning Policy

Constitution follows semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Backward-incompatible governance changes (principle removal/redefinition)
- **MINOR**: New principles or sections added
- **PATCH**: Clarifications, wording improvements, non-semantic fixes

### Compliance Review

All pull requests MUST verify constitution compliance. Reviewers MUST check:
- Simplicity justification if adding complexity
- Tests written before implementation (TDD)
- Documentation updates included
- User story independence maintained
- Security considerations addressed

Violations MUST be resolved before merge—no exceptions without documented executive override.

**Version**: 1.0.0 | **Ratified**: 2025-11-16 | **Last Amended**: 2025-11-16
