LMS Full Product Modules Specification
Simple LMS for Staff Training — Product Requirements Document (PRD)
1) Overview

Goal: Deliver a lightweight Learning Management System (LMS) for a company to train staff on internal topics (onboarding, SOPs, compliance, product knowledge). Emphasis on simplicity, speed, and clarity—no SCORM, no complex authoring suite.

Primary value: Give admins a dead-simple way to publish short courses; give staff a clean place to take them, pass quick checks, and let managers see who’s done what.

2) Objectives & Success Metrics

Objectives

Publish bite-sized courses in minutes.

Track completion & basic scores per employee and per department.

Automate nudges (email/SMS/WhatsApp) until completion.

Success Metrics

Time to publish a course: ≤10 minutes.

Course completion rate within assignment window: ≥80%.

Admin NPS for LMS UX: ≥8/10 after first month.

Report export time (CSV): <5 seconds for ≤5k users.

3) Users & Roles

Learner (Employee): Takes courses, tracks progress, downloads certificates.

Manager: Assigns courses to their team, views team reports.

Admin (L&D/HR): Creates courses, questions, assignments, and sees org-wide analytics.

Super Admin (IT/Owner): Tenant settings, SSO, integrations, role management.

Permissions (MVP)

Learner: view assigned/available courses, take quizzes, view certificate.

Manager: view team roster & progress, assign existing courses to team, download team CSV.

Admin: create/edit courses/quizzes, org reports, bulk enroll, manage categories.

Super Admin: tenant/company settings, SSO, data retention, audit logs.

4) In-Scope (MVP)

Course structure: Course → Modules → Lessons (video/PDF/text) + Quick Checks (MCQ/true-false).

Assignments: by user, team/department, or all employees with due date.

Basic assessments: timed optional, pass mark %, 1–3 attempts.

Completion rules: view all lessons + pass quiz ≥ pass mark.

Certificates (auto-generated PDF) with name, course, score, completion date.

Reports: course completion, quiz scores, overdue learners, manager dashboards; CSV export.

Notifications: email (mandatory), optional SMS/WhatsApp (phaseable).

Search & filters: course title, category, status, department.

Simple content library (upload MP4, PDF, images) with file size caps.

Single organization (multi-department). (Multi-tenant optional later.)

Basic branding: company logo, brand color, certificate template.

Simple API for user sync (CSV upload + REST endpoints).

Out-of-Scope (MVP)

SCORM/xAPI, complex authoring, discussion forums, gamification, ecommerce, instructor-led scheduling.

5) Non-Functional Requirements

Performance: P95 page load < 2s on broadband; exports under 5s for ≤5k users.

Availability: 99.5%+ monthly uptime.

Security: Role-based access control, salted hashing, HTTPS, audit logs; least privilege on DB.

Privacy: Per-tenant data isolation; downloadable data on request.

Accessibility: WCAG 2.1 AA basics (keyboard navigation, captions field).

Localization: Timezone Africa/Accra default; support date/time formats; copy strings externalized.

6) User Journeys (Happy Paths)
6.1 Admin creates a course

New Course → title, description, category, estimated time, pass mark (%).

Add Modules, then Lessons (video/PDF/text, link or upload).

Add Quiz (question bank or inline): MCQ/True-False with answer keys and explanations.

Set Completion Rule (all lessons + pass quiz).

Assign to department(s)/users with due date; toggle reminders.

Publish → course goes live; notifications sent.

6.2 Learner completes a course

Dashboard shows Assigned Courses with due dates & progress.

Learner opens a course, watches video/reads PDF, marks complete.

Takes quiz; if pass ≥ threshold → Certificate; else retry (max attempts).

Dashboard updates completion; manager sees it instantly.

6.3 Manager monitors team

Team dashboard shows On-track / At-risk / Overdue.

Drill into a course to see per-learner progress & scores.

Download CSV or trigger reminders to overdue learners.

7) Functional Requirements (MVP)
7.1 Course Management

Create/edit/archive course; version label (v1, v1.1).

Modules/lessons reorder via drag-and-drop.

Content types: Text (rich), Video (MP4/link), Document (PDF).

Estimated duration per lesson and overall.

Visibility: public to org vs restricted (specific departments).

7.2 Quiz & Question Bank

Question types: MCQ single-select, multi-select, true/false.

Randomize order; question pools (optional); time limit (per quiz).

Scoring: auto; pass mark configurable; attempts: 1–3.

Feedback per question (show explanation after submission).

7.3 Assignments & Enrolment

Assign by user list, department, or all staff.

Due date; grace period (optional).

Auto-enrol new hires to onboarding tracks.

7.4 Certificates

Template with logo, brand color, signatures, QR/ID.

Unique certificate ID; downloadable PDF.

7.5 Reporting & Analytics

Course overview: assigned, started, completed, avg score, median time.

Learner report: courses assigned, progress, last activity.

Manager report: team summaries; overdue list.

CSV exports; scheduled weekly summary to managers.

7.6 Notifications

Triggers: assignment, 3-day reminder, due-day reminder, overdue weekly.

Channels: Email (MVP). SMS/WhatsApp (Phase 2).

Timezone aware (Africa/Accra); send 09:00 local by default.

7.7 Admin & Settings

Departments/teams management.

Branding, certificate signer name(s).

Data retention & export; audit logs for admin actions.

8) Data Model (MVP Tables)

users (id, name, email, phone?, role, department_id, status)

departments (id, name, manager_user_id)

courses (id, title, description, category, pass_mark, status, version)

modules (id, course_id, title, order)

lessons (id, module_id, type[text|video|pdf], title, content_url|html, duration_min, order)

quizzes (id, course_id, time_limit_sec, attempts_allowed, randomize, pass_mark_override?)

questions (id, quiz_id, type, prompt_html, order, points)

options (id, question_id, label, is_correct)

assignments (id, course_id, assigned_by, due_at, scope[department|user|all])

assignment_targets (id, assignment_id, user_id or department_id) (or keep two junctions)

enrolments (id, user_id, course_id, assigned_via_assignment_id, status[assigned|started|completed], started_at, completed_at, certificate_id)

progress (id, user_id, lesson_id, status[seen|completed], last_viewed_at)

attempts (id, quiz_id, user_id, score, started_at, submitted_at, passed[bool], attempt_no)

attempt_answers (id, attempt_id, question_id, option_id)

certificates (id, user_id, course_id, number, pdf_url, issued_at)

files (id, url, mime, size, uploaded_by)

audit_logs (id, actor_id, action, entity_type, entity_id, ts, meta_json)

(If you’ll host on your own Postgres/Hostinger VPS, this schema maps cleanly.)

9) Integrations (Phaseable)

Auth/SSO: Email+OTP (MVP), optional SSO (Google/Microsoft) in Phase 2.

Messaging: Email (MVP). SMS (Deywuro/Africa’s gateways) & WhatsApp (Phase 2).

HR Sync: CSV import (MVP), REST API & webhook sync (Phase 2).

Storage/CDN: Local object storage or S3-compatible (e.g., Wasabi/MinIO).

10) UX Requirements (Essentials)

Learner Dashboard: Assigned courses (cards), due date, % complete, resume button.

Course Player: Left sidebar (modules/lessons), main pane (content), top progress bar, next/prev, “Mark complete”.

Quiz Flow: Clear timer (if enabled), per-question nav, submission confirmation, score & feedback page.

Manager View: Team filter, traffic-light status, quick remind, CSV export.

Admin Studio: Course list (status, enrolments), drag-drop outline editor, question builder, assignment panel.

11) Privacy, Security & Compliance

Encrypted at rest (DB, files) and in transit (HTTPS).

RBAC enforced server-side; audit logs for all admin actions.

PII minimization (name, email, department, optional phone).

Data export on request; soft delete for users/courses.

12) Platform & Tech Notes (suggested)

Backend: Node.js (Express/Nest) or Python (FastAPI) + Postgres.

Frontend: React/Next.js (SSR optional), Tailwind UI for speed.

Storage: Postgres for relational; S3-compatible bucket for files.

Background jobs: BullMQ/Celery for reminders & certificate rendering.

Hosting: Your Hostinger VPS; Nginx reverse proxy; HTTPS; backups daily.

Observability: Basic logs + uptime ping; error notifications to admin email.

13) API (MVP Endpoints – sketch)

POST /auth/login (email+OTP), POST /auth/otp/verify

GET /me

Courses: GET /courses, POST /courses, GET /courses/:id, PATCH /courses/:id, POST /courses/:id/publish

Structure: POST /courses/:id/modules, POST /modules/:id/lessons, reorder endpoints

Quizzes: POST /courses/:id/quiz, POST /quiz/:id/questions, POST /quiz/:id/start, POST /quiz/:id/submit

Assignments: POST /assignments, GET /assignments?courseId=

Progress: POST /lessons/:id/complete, GET /enrolments?userId=

Reports: GET /reports/course/:id, GET /reports/team/:departmentId, GET /reports/export.csv

Users: POST /users/import-csv, GET /users?departmentId=

14) Acceptance Criteria (MVP)

Course Creation

✅ Admin can create a course with at least 1 module and 1 lesson.

✅ Admin can add a quiz with ≥5 questions and set a pass mark.

Assignment & Completion

✅ Admin assigns a course to a department with a due date.

✅ Learner receives an email and sees the course on dashboard.

✅ Learner completes lessons, passes quiz, and system issues a certificate (PDF with unique ID).

Reporting

✅ Manager can see team completion % and overdue list.

✅ Admin can export CSV for a selected course with user, status, score, completed_at.

Notifications

✅ Automatic reminder 3 days before due date and on due date at 09:00 Africa/Accra.

Performance & Security

✅ P95 < 2s for dashboard with ≤5k users.

✅ All admin actions recorded in audit_logs.

Perfect—no multi-tenant. We’ll ship this module-by-module. Here’s the build order and the full spec for Module 1 to start immediately.

Build Order (single-tenant)

Auth & RBAC

Organization & Directory

Course Authoring Studio

Content Library

Assessment Engine

Assignments & Enrolment

Course Player (Learner UI)

Progress Tracking

Certificates

Reporting & Exports

Notifications

Admin Settings

Audit Logs & Security hardening

Module 1 — Auth & RBAC (Passwordless Email OTP)
Goal

Let users sign in via email + one-time code, issue secure session cookies, and enforce role-based access (LEARNER, MANAGER, ADMIN, SUPER_ADMIN).

Deliverables

Email OTP login flow (request → verify).

HTTP-only session cookie (JWT or signed ID).

RBAC middleware + route guards.

Seed script for first SUPER_ADMIN.

Minimal Admin UI: sign-in page + “You are X role” dashboard stub.

Basic audit logging for auth events.

Tech Assumptions

Backend: Node.js + Express (or Nest; same interfaces below).

DB: Postgres on your Hostinger VPS.

Email: SMTP (Hostinger/SendGrid).

Sessions: JWT in httpOnly, Secure, SameSite=Lax cookie; 7-day TTL, rolling.

Database (SQL)
-- roles
create table roles (
  id serial primary key,
  name text unique not null check (name in ('LEARNER','MANAGER','ADMIN','SUPER_ADMIN')),
  description text
);

-- users
create table users (
  id bigserial primary key,
  name text not null,
  email citext unique not null,
  phone text,
  department_id bigint, -- will link later in Module 2
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- user_roles (many-to-one for simplicity; but allow multiple if needed)
create table user_roles (
  user_id bigint references users(id) on delete cascade,
  role_id int references roles(id) on delete restrict,
  primary key (user_id, role_id)
);

-- otp codes
create table auth_otps (
  id bigserial primary key,
  email citext not null,
  code char(6) not null,
  purpose text not null default 'login',
  attempts_left int not null default 5,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);
create index on auth_otps(email);
create index on auth_otps(expires_at);

-- sessions
create table sessions (
  id uuid primary key,              -- session id (also jti)
  user_id bigint references users(id) on delete cascade,
  user_agent text,
  ip inet,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

-- audit logs (auth-focused for now)
create table audit_logs (
  id bigserial primary key,
  actor_user_id bigint,
  action text not null,             -- 'otp_requested','login_success','logout','otp_failed'
  entity_type text,                 -- 'user','session','otp'
  entity_id text,
  ip inet,
  user_agent text,
  ts timestamptz not null default now(),
  meta jsonb default '{}'::jsonb
);

API Contracts
POST /auth/otp/request
  body: { email }
  200: { ok: true }  // always 200 to avoid user enumeration
  side-effect: create OTP, email code (6 digits), 10-min expiry

POST /auth/otp/verify
  body: { email, code }
  200: { user: {id, name, email, roles:[] } }
       Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
  400/401 on invalid/expired; decrement attempts_left; lock on 0

POST /auth/logout
  clears cookie, revokes session (set revoked_at)

GET  /auth/me
  returns current user & roles if cookie valid

GET  /health
  returns { ok: true } (for load balancer/uptime)

RBAC Middleware (pattern)

Decode session cookie → req.user (id, roles).

Route decorator or wrapper:

requireAuth() for signed-in.

requireRoles('ADMIN') etc.

Deny with 403 if role absent.

Example route protection
app.get('/admin/courses', requireRoles('ADMIN','SUPER_ADMIN'), handler);
app.get('/manager/team', requireRoles('MANAGER','ADMIN','SUPER_ADMIN'), handler);

Email OTP UX

User types email → “We’ve sent a 6-digit code.”

Enter code. Show resend after 30s (rate-limit 5/min/IP).

On success, redirect to /dashboard.

Security Controls

OTP: 6-digit numeric, 10-minute expiry, 5 attempts, single-use (set consumed_at).

Brute-force: rate-limit /auth/otp/* by IP + email; captcha after N failures.

Sessions: rotate token every 24h (new cookie, update session expires_at).

CSRF: cookie is httpOnly + SameSite=Lax; for state-changing API, accept only application/json + CSRF header on future modules if needed.

Logging: write to audit_logs on OTP request/verify, login, logout, lockouts.

Seeding Script (outline)

Insert roles.

Create initial SUPER_ADMIN from env (SEED_ADMIN_EMAIL, SEED_ADMIN_NAME).

Grant role in user_roles.

Minimal UI (for now)

/signin (email → code).

/verify (code input).

/dashboard placeholder that echoes role(s).

Global toaster for errors; keep it clean with Tailwind.

Module 2 — Organization & Directory
Goal

Stand up the company’s org backbone: Departments, Users, Managers, and Imports. This powers assignments “by department/team” and manager dashboards in later modules.

Deliverables

Departments CRUD (with optional parent for simple hierarchy).

User directory (profiles, role tags from Module 1, department membership).

Manager-of linkage (each department has an optional manager).

CSV bulk import for users (create/update, idempotent).

Basic user lifecycle: activate, deactivate, soft delete.

Minimal UI: Departments list/form; Users table; Import wizard (CSV → map fields → preview → commit).

Endpoints + RBAC + audit logs.

Validation & integrity constraints.

Data Model (Postgres)

Extends Module 1 tables (users, roles, user_roles, audit_logs). All FKs on delete restrict unless noted.
-- Departments (flat or simple tree via parent_id)
create table departments (
  id bigserial primary key,
  name text not null unique,
  code text unique,
  parent_id bigint references departments(id) on delete set null,
  manager_user_id bigint references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add department_id to users (if not added in M1)
alter table users
  add column if not exists department_id bigint references departments(id),
  add column if not exists job_title text,
  add column if not exists employee_code text unique,
  add column if not exists avatar_url text,
  add column if not exists deactivated_at timestamptz;

create index on users(department_id);

-- Unique manager per department (enforced by FK + check)
alter table departments
  add constraint chk_manager_in_dept
  check (
    manager_user_id is null
    or manager_user_id in (
      select u.id from users u where u.id = manager_user_id
    )
  );

-- Import jobs (for auditability & retries)
create table user_import_jobs (
  id bigserial primary key,
  uploaded_by bigint references users(id),
  source_filename text,
  total_rows int,
  processed_rows int default 0,
  status text check (status in ('pending','processing','completed','failed')) not null default 'pending',
  error_summary text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table user_import_job_rows (
  id bigserial primary key,
  job_id bigint references user_import_jobs(id) on delete cascade,
  row_number int not null,
  raw_json jsonb not null,
  outcome text check (outcome in ('created','updated','skipped','error')) default 'skipped',
  message text
);
create index on user_import_job_rows(job_id);

Notes

Keep single department per user for simplicity (MVP). If you later need multi-team, add a junction table.

employee_code is a convenient unique HR identifier if emails change.

API Contracts

Departments

GET   /departments                      // ADMIN, MANAGER (read)
POST  /departments                      // ADMIN
PATCH /departments/:id                  // ADMIN
DELETE /departments/:id                 // ADMIN (only if no users/enrolments)

Users
GET   /users?departmentId=&q=&status=active|inactive|all  // ADMIN, MANAGER (see only own team)
POST  /users                                              // ADMIN (create single)
PATCH /users/:id                                          // ADMIN (profile edits, role changes require SUPER_ADMIN)
POST  /users/:id/deactivate                               // ADMIN
POST  /users/:id/activate                                 // ADMIN

Manager Views
GET  /managers/me/team            // MANAGER: paginated list of direct reports (users in their department)
GET  /departments/:id/members     // ADMIN, MANAGER (if owns that department)

Import
POST /imports/users/upload (multipart CSV)                // ADMIN
    returns { jobId, columnsDetected: [] }

POST /imports/users/:jobId/mapping                        // ADMIN
    body: { map: { "email":"Email", "name":"Full Name", "department":"Dept", "role":"Role", "employee_code":"EmpCode", "job_title":"Title" }, createMissingDepartments: true }

POST /imports/users/:jobId/commit                         // ADMIN
    returns { created, updated, skipped, errors }

GET  /imports/users/:jobId                                // ADMIN (status & row outcomes)



This document details the remaining modules (3 through 13) required to build a fully functional learning management system (LMS) for corporate training. Each module description includes goals, deliverables, database schema considerations, API contracts, UI requirements, acceptance criteria, and security considerations. The specification builds on the previously defined authentication and organization modules and assumes a single‑tenant environment.

Module 3 — Course Authoring Studio

Goal

A robust authoring environment that allows training administrators to create, edit, version, and publish courses directly within the LMS. The environment should support organising content into modules and lessons, and should manage the content within the same platform rather than relying on external tools
workramp.com
.

Deliverables

Course list with filters (title, category, status).

Course editor with drag‑and‑drop outline: create modules and lessons, reorder, and nest modules.

Lesson types: rich text (markdown), video (MP4/link with streaming), documents (PDF, PPT), images and audio; support future interactive activities.

Course metadata fields: title, description, category, duration, difficulty, tags, version.

Versioning: draft → published status; maintain history and allow rollback; ability to duplicate course.

Save as draft, preview, publish/unpublish.

Pre‑built templates and course presets for quick creation.

Automatic calculation of estimated completion time based on lesson durations.

Bulk import of existing courses via CSV or ZIP (with mapping to modules/lessons).

Integration with Content Library (Module 4) for asset selection.

Data Model Updates

course_versions (id, course_id, version_label, description, status [draft|published|archived], created_at, published_at).

Extend courses with fields: difficulty (enum), tags (array), estimated_duration_min.

lesson_assets linking lessons to files in files with type (video, pdf, image, audio).

course_templates (id, name, description, structure_json, default_pass_mark).

API Contracts

GET /courses?status=&category=&q= – list courses with filters.

POST /courses – create new course (initial draft).

PATCH /courses/:id – update metadata.

POST /courses/:id/versions – create a version (duplicate from latest).

PATCH /course_versions/:id – update modules/lessons in version.

POST /course_versions/:id/publish – publish a version.

GET /course_versions/:id/preview – preview course as learner.

DELETE /course_versions/:id – archive or delete version.

POST /courses/import – import courses.

UI Requirements

Course dashboard with search, filters, and bulk actions.

Outline editor: hierarchical tree representing modules/lessons with drag‑and‑drop; side panel for lesson properties; ability to upload or pick assets from library.

Metadata form: fields for title, description, tags, category, duration, difficulty; preview of certificate theme.

Version selector and history timeline; diff view highlighting changes.

Templates gallery; ability to start from blank or template.

Access control: only Admin and Super Admin can author; Manager can view but not edit.

Acceptance Criteria

Admin can create a course, add modules/lessons, set metadata, save drafts, preview, publish, and see the result in the learner portal.

Drag‑and‑drop ordering persists to the database.

Version control allows multiple drafts and at least one published version; old versions remain viewable but not editable.

Templates pre‑populate course outlines.

Security Considerations

Validate and sanitize all user‑generated HTML/text to prevent cross‑site scripting (XSS).

Enforce permission checks for authoring actions.

Limit upload sizes and file types per company policy.

Maintain audit logs (Module 13) for all create/edit/publish actions.

Module 4 — Content Library

Goal

Provide a central repository for all training assets (video, audio, documents, images) with metadata, search and categorization; integrated with Course Authoring and Player modules. A unified library reduces duplication and ensures consistent management
workramp.com
.

Deliverables

Asset storage with S3‑compatible backend; handle large video uploads with chunking; optional integration with a streaming service for encoding.

Asset metadata: name, description, file type, size, duration (for media), uploaded_by, created_at.

Folders or categories to organize assets; tags for search; ability to filter by type, date, uploader.

Asset preview (video streaming with player, PDF viewer, image thumbnail); audio player for audio files.

Versioning of assets: ability to upload a new version of a file while preserving previous uses; update references automatically.

Permissions: manage who can upload, edit, or delete assets; link assets to departments or categories; restrict certain types (e.g., HR‑only content).

Usage tracking: track where assets are used (courses/lessons), last accessed.

Quota management: per‑company quotas for total storage; notifications when approaching limit.

Data Model

Extend files with: description, category_id, tags (array), version_no, parent_file_id, duration_sec, resolution, external_url.

file_categories (id, name, description, parent_id).

file_permissions (id, file_id, department_id, role, can_view, can_edit, can_delete).

API

GET /files?type=&category=&q=&page= – list assets with filters.

POST /files (multipart) – upload asset; returns file id and metadata.

PATCH /files/:id – update metadata or upload a new version.

GET /files/:id/download – generate a signed URL for download/streaming.

GET /files/:id/usage – list courses/lessons referencing the file.

DELETE /files/:id – soft delete; prevent deletion if used in published courses.

UI Requirements

Library explorer: sidebar of categories/folders; grid/list view of files with thumbnails and metadata; search bar; filters; sorting; details drawer (metadata, preview, usage).

Upload modal: drag‑and‑drop, progress bar, fields for description, category, tags; ability to upload multiple files.

Version history: accessible from file details; ability to revert to a prior version.

Acceptance Criteria

Admin can upload, tag, categorise, and preview assets; can see where assets are used.

Upload rejects unsupported file types; file sizes above limit produce an error.

Asset usage shows all courses/lessons referencing the file.

Deleting an asset used in published content prompts the user and logs the action; physical deletion occurs only when no references remain.

Security Considerations

Validate file types; implement virus scanning; store files outside the web root.

Use signed URLs for downloads to protect attachments.

Enforce permission checks; audit logs.

Module 5 — Assessment Engine

Goal

Provide a comprehensive assessment engine to evaluate learner understanding through quizzes, interactive questions and gamified activities. It should support multiple question types and integrate with analytics
workramp.com
.

Deliverables

Question bank: categories, difficulty levels, tags; reusability across courses.

Question types: single‑choice, multiple‑choice, true/false, short answer, fill‑in‑the‑blank, drag‑and‑drop matching, ordering/sequencing; support images and media in questions and answers; randomization of options.

Quiz builder interface: create quizzes linked to courses; set total points, pass marks, time limits, attempts allowed, randomisation, question pools.

Dynamic assessments: assemble a quiz from question pools; adapt difficulty based on learner performance.

Gamified assessment: incorporate elements like points, badges and leaderboards
workramp.com
.

Feedback and explanations per question; ability to show correct answers after submission or per organisation setting.

Branching assessments (future roadmap): skip questions based on previous answers.

Analytics integration: store responses per question for reporting (score distribution, common wrong answers)
workramp.com
.

Import/export of questions and quizzes (CSV or QTI format).

Data Model

Extend questions with: type, difficulty, category_id, tags array, media_file_id, explanation_html.

question_pools (id, name, description, course_id?, category_id).

pool_memberships (pool_id, question_id).

Extend quizzes with: randomize_questions boolean, time_limit_sec, attempts_allowed, scoring_scheme, pass_mark, feedback_policy.

Extend attempts with: per‑question details (score, correct, response_text).

API

GET /questions?pool_id=&category=&difficulty=&q= – search question bank.

POST /questions – create question.

PATCH /questions/:id – update question.

POST /quizzes – create quiz.

POST /quizzes/:id/assign – attach to course (if multiple quizzes per course stage).

POST /quizzes/:id/start – create attempt; return token.

POST /quizzes/:id/submit – submit attempt; returns score and feedback.

GET /attempts/:id – retrieve attempt details.

UI Requirements

Question bank explorer: list questions with filters; ability to edit; import/export.

Quiz builder: interface to select questions from bank or create new; define settings; preview.

Learner UI: accessible inside course player; show timer; question navigation; responsive design; accessible keyboard navigation; show results and feedback at end.

Acceptance Criteria

Admin can create all question types, build a quiz, assign it to a course, and specify a pass mark and attempt limit.

Learner can start and submit quizzes; results and feedback display correctly; progress saves on network disruptions.

Analytics capture question‑level responses.

Security Considerations

Validate user input; prevent answer injection; restrict file attachments.

Rate limit attempts; protect randomisation seeds.

Audit logs for modifications to questions and quizzes.

Module 6 — Assignments & Enrolment

Goal

Provide robust assignment workflows to enrol learners in courses or learning paths automatically or manually. Support due dates, prerequisites, automatic enrolment for new hires, recertification cycles and track status.

Deliverables

Assign courses individually, by department/team, by role, by user attribute (e.g., new hire, region), or to all employees.

Support grouping courses into learning paths/tracks with prerequisites; ability to assign a learning path.

Due dates and grace periods; ability to set different due dates for each target group; specify priority or mandatory/optional status.

Recurring/recertification assignments (e.g., annual compliance training) with automatic re‑enrol every N months.

Auto‑enrol rules: when a new user is added to a department or role, automatically enrol them in certain courses or tracks.

Prerequisite enforcement: cannot start a course until prerequisites are completed; optional override.

Self‑enrolment: allow learners to browse and enrol in elective courses; require manager approval optionally.

Assignment statuses: not started, in progress, overdue, completed.

Bulk assignment operations and export of assignment lists.

Integration with Notifications module for reminders.

Data Model

learning_paths (id, name, description, created_by).

learning_path_courses (learning_path_id, course_id, order, mandatory boolean).

Extend assignments with: scope (user, department, role, group, path), due_at, grace_days, recurrence_interval_months, mandatory boolean, prerequisites_json.

auto_enroll_rules (id, trigger [on_user_created, on_role_change], department_id, role_id, course_id, path_id, due_days).

Extend enrolments with: assignment_id, due_at, mandatory boolean, recertification_due_at.

API

POST /assignments – create assignment; body includes scope, course_id or path_id, due_at, recurrence, mandatory, prerequisites.

GET /assignments?userId= – list assignments; filter by status and due date.

PATCH /assignments/:id – update assignment.

POST /auto-enroll-rules – create rule; GET /auto-enroll-rules – list rules.

DELETE /auto-enroll-rules/:id – remove rule.

POST /enrolments/:id/override – manager marks completed/unassign.

UI Requirements

Assignment wizard: select target groups/users, pick course or learning path, set due date and recurrence, choose prerequisites; review summary and confirm.

Learning path manager: create and edit learning paths; reorder courses; mark mandatory/elective.

Assignments dashboard: list all assignments; show progress by course/path; status heatmap; search and filters.

Auto‑enrol rules page: view existing rules; add, edit, delete.

Acceptance Criteria

Admin can assign courses or paths to departments, roles or users with due dates.

Learners auto‑enrol when they join a department with an auto enrol rule.

Recurring assignments trigger re‑enrolment on schedule.

Prerequisite enforcement prevents starting courses prematurely.

Reporting shows assignment statuses (completed, overdue) for each assignment.

Security Considerations

Only Admin/Super Admin can create or modify assignments; managers can assign to their team only if allowed.

Audit logs for assignment creation, modification and deletion.

Module 7 — Course Player & Learner Portal

Goal

Provide an intuitive, customisable learner portal and course player that deliver engaging learning experiences across desktop and mobile. The portal should reflect user roles, interests and progress, and support various delivery methods such as on‑demand, instructor‑led and blended learning
workramp.com
workramp.com
.

Deliverables

Learner Portal Dashboard: Landing page tailored to the learner’s role or group, showing assigned courses, learning paths, progress charts and recommendations; easy search and discovery; ability to filter courses.

Course Player: Unified interface for consuming lessons (video, text, documents, interactive) with responsive design; left‑hand outline for navigation; progress bar; ability to mark lessons complete; note‑taking; transcripts and captions; adjustable playback speed; offline‑friendly PDF downloads; next/previous navigation; resume where the learner left off.

Multi‑Delivery Methods: Support live sessions and webinars (Zoom/Teams integration), with calendar invites; ability to join instructor‑led sessions from the course page; integrate with streaming.

Mobile‑Friendly & Microlearning: Optimised for mobile devices with microlearning modules; allow learners to complete training in short segments
workramp.com
.

Gamification & Social Features: Optional points, badges, leaderboards and progress streaks to motivate learners
workramp.com
; ability to comment/discuss; peer feedback; share achievements.

Personalisation: Learner portal shows courses relevant to their interests and previous scores; recommended courses based on performance; ability to bookmark.

Accessibility & Localization: WCAG 2.1 AA compliance; alternative text for images; keyboard navigation; multi‑language support; right‑to‑left layout; support for multiple time zones and date formats; localisable labels.

Self‑Enrolment & Elective Courses: Catalogue where learners can browse and enrol in elective courses; manager approval flow; search and filter by category, duration and difficulty.

Feedback & Ratings: Learners can rate courses and provide feedback after completion; aggregated ratings displayed; analytics integrated.

Data Model

Extend enrolments with: bookmarked boolean, rating int (1–5), feedback text, recommendation_reason text.

badges (id, name, description, criteria_json, image_file_id) and user_badges (user_id, badge_id, earned_at).

notes (id, user_id, lesson_id, content, created_at, updated_at).

events table for live sessions (id, course_id, start_time, end_time, host_user_id, meeting_url, max_attendees) and event_attendees.

API

GET /portal/dashboard – returns learner dashboard data.

GET /courses/:id/player – returns course content, outline and progress.

POST /lessons/:id/complete – mark lesson complete.

POST /notes – create or update note.

POST /ratings/:courseId – submit rating and feedback.

GET /badges and GET /badges/me – list badge templates and earned badges.

GET /live-sessions/:id/join – return meeting join link or embed.

POST /enrolments/self-enroll – self‑enrol to an elective course; triggers manager approval if required.

UI Requirements

Responsive design across devices; accessible components.

Dashboard: card or list view; progress bars; reminders; search bar; recommended courses.

Player: two‑column layout; collapsible navigation; top‑level progress; transcripts toggle; playback controls.

Feedback modal after course completion; star rating.

Badges panel; leaderboard page.

Acceptance Criteria

Learner sees personalised dashboard; can enrol in courses, access content, mark complete and resume progress.

Live sessions can be scheduled and joined; attendance recorded.

Gamification features display badges and points; awarding occurs after criteria met.

Rating and feedback collection integrated; results feed into reports.

Mobile/responsive design; microlearning accessible on smartphones.

Security Considerations

Ensure unauthorised users cannot access restricted courses; verify enrolment before serving content.

Protect meeting join links; generate unique tokens.

Sanitize user feedback; moderate comments.

Module 8 — Progress Tracking & Analytics

Goal

Provide comprehensive tracking of learner progress at multiple levels (lesson, course, learning path) and analytics for learners, managers and administrators. This supports measuring engagement, identifying gaps and recommending interventions
workramp.com
rippling.com
.

Deliverables

Tracking: Capture time spent per lesson, number of visits, completion status, quiz scores, attempts; record first/last access.

Dashboards: Visualise progress for learners (their own), managers (team‑level) and administrators (organisation‑level); provide heat maps and completion funnels.

Segmentation & Filters: Filter analytics by department, role, location, course category and time period.

Engagement Metrics: Identify drop‑off points; measure average time in lesson; highlight content that causes low scores or high retries.

Skill & Competency Tracking: Map courses to competencies; track competency achievement per user; show skill gaps; integrate with HR performance data.

Alerts & Interventions: Trigger notifications to managers when learners are overdue or stuck; recommend remedial courses.

Compliance Reporting: Real‑time dashboards for compliance‑required training and certification status; export for audits
rippling.com
.

Data Export & API: Provide CSV, Excel and JSON exports; API endpoints for external BI tools.

Data Model

Extend progress with: time_spent_sec, attempts_count, last_activity_at.

analytics_course aggregated table (course_id, assigned_count, started_count, completed_count, average_score, average_time_spent) – updated via cron.

competencies (id, name, description), course_competencies (course_id, competency_id), user_competencies (user_id, competency_id, level, achieved_at).

API

GET /analytics/overview?period= – returns organisation‑level metrics.

GET /analytics/course/:id – course‑specific metrics and trends.

GET /analytics/user/:id – user‑specific timeline.

GET /analytics/team/:departmentId – team‑level metrics.

GET /analytics/export?type=course|user|team – generate export.

UI Requirements

Admin dashboard: charts for overall course completion rates, highest/lowest performing courses, overdue learners.

Manager dashboard: list of team members with progress; ability to drill down; highlight at‑risk individuals.

Learner analytics: personal progress timeline; achievements; upcoming deadlines.

Interactive graphs: bar charts for completion by department; line charts for time to completion; heat maps for drop‑off.

Acceptance Criteria

Progress tracking accurately records user interactions; dashboards display updated information.

Admin and manager dashboards can filter by department and timeframe.

Exports include necessary fields; correct date range.

Competency tracking displays progress toward skills; can recommend courses.

Security Considerations

Ensure aggregated analytics respect user privacy; individual details only accessible to authorised managers.

Provide data anonymisation for aggregated insights.

Module 9 — Certificates & Credentials

Goal

Generate and manage completion certificates and digital credentials that validate learners’ achievements. Support customizable certificate templates, unique IDs, QR codes for verification, expiry and renewal reminders
rippling.com
.

Deliverables

Certificate Templates: Create multiple templates with company branding, background images, signatures, logos and custom fields; support dynamic placeholders (learner name, course title, completion date, score, expiry date).

Certificate Generation: When a learner meets completion criteria (complete all lessons and pass assessment), the system automatically generates a PDF certificate with a unique ID; stores the PDF and metadata; notifies learner and manager.

QR Code & Verification Portal: Each certificate includes a QR code linking to a public verification page; the page shows certificate details and validity status; organisation can embed a verification widget.

Expiry & Renewal: Define expiry period for certificates (e.g., 1 year for compliance training); track upcoming expirations; send notifications and automatically assign recertification courses; handle renewal requests.

Digital Badges and Open Badges: Issue badges adhering to the Open Badges standard; generate JSON web signature; allow sharing on LinkedIn or email; integrate with badge provider.

Credential Register & Reports: Provide a registry of all certificates and credentials; allow admin to search, revoke or reissue certificates; export lists for compliance audits.

Bulk Certificate Generation: Support manual generation for learners who completed courses before certificate functionality existed; upload list of completions to generate certificates.

Data Model

Extend certificates with: expiry_at, template_id, qr_code_url, badge_id, revoked_at.

certificate_templates (id, name, description, file_url, background_file_id, design_json, default_expiry_days).

badge_templates (id, name, criteria_json, image_file_id, issuer_json).

issued_badges (id, user_id, badge_template_id, issued_at, evidence_url).

API

GET /certificate-templates – list templates.

POST /certificate-templates – upload or design new template.

POST /certificate-templates/:id/publish – make template available.

POST /courses/:id/certificates/customize – override certificate template for a course.

GET /certificates/:id – view certificate details and download.

GET /certificates/verify/:uniqueNumber – public verification endpoint.

GET /certificates?userId=&courseId=&status= – list certificates.

PATCH /certificates/:id/revoke – revoke certificate (requires reason).

POST /badges – create badge template.

UI Requirements

Certificate template editor: WYSIWYG interface with drag‑and‑drop for text fields, images, signatures; preview; assign default expiry.

Course settings: select certificate template; define expiry; choose signatories; toggle QR code.

Learner: certificate page with download button; share to LinkedIn; view badge; QR code.

Admin: certificate registry; search; filter by course; export; revoke.

Acceptance Criteria

On course completion, certificates generate automatically; PDF contains correct data and QR code; unique number.

Verification page returns status; revoked certificates show invalid.

Expired certificates trigger recertification assignments.

Badge issuance meets the Open Badges standard.

Security Considerations

Use cryptographically secure unique IDs; sign certificate data.

QR code points to an HTTPS verification page; limit information exposed publicly.

Permission checks for revocation; audit logs.

Module 10 — Reporting & Exports

Goal

Provide comprehensive reporting and analytics capabilities across the LMS to support decision‑making, compliance and ROI measurement. Reports should cover completion rates, assessment results, engagement metrics and compliance status, with flexible filtering and export functionality
workramp.com
rippling.com
.

Deliverables

Standard Reports: Pre‑built reports for course progress (assigned/started/completed/overdue), quiz performance (score distribution, question accuracy), learner activity (time spent, sessions), compliance (mandatory training completion and certification status), enrolment and assignment statuses, department performance, competencies and skills, and recertification status.

Custom Reports: Allow admins to build custom reports by selecting dimensions (department, role, user attribute), metrics (completion rate, score average), filters (date range, course, category), grouping and sorting; support saving and sharing custom report templates.

Scheduled Reports: Schedule reports to run automatically (daily, weekly, monthly) and send to recipients via email; include attachments or links to dashboards.

Interactive Dashboards: Visual analytics dashboards with charts (bar, line, pie, heat maps) that allow drill‑down from aggregate to detailed views.

Export & API: Export any report to CSV, Excel or PDF; support large datasets; provide API endpoints for integration with external BI tools or HRIS.

Data Warehouse Integration: Provide connectors to push LMS data into data warehouses (e.g., BigQuery, Snowflake) for advanced analytics; maintain data dictionary.

Access Control: Restrict report access based on user roles; managers see their teams; admins see all; custom sharing options.

Data Model

Precompute aggregated metrics tables (e.g., report_course_completion, report_user_activity) updated daily or near real‑time.

Logging tables capturing user actions; ensure data is captured for all modules.

API

GET /reports/templates – list standard and custom report templates.

POST /reports/templates – create a custom template.

GET /reports/:id?filters= – generate report; returns JSON or file.

POST /reports/:id/schedule – schedule report; body includes frequency and recipients.

GET /reports/export – export data with query parameters.

POST /reports/send-now – send an ad‑hoc report to recipients.

UI Requirements

Reports home page: list of standard reports; custom report builder; schedule manager.

Report builder: interface to select dimensions, metrics and filters; preview results; save template.

Dashboard: interactive charts; cross‑filtering; drill‑down; export buttons.

Schedule manager: list of scheduled reports with next run date; ability to edit recipients or frequency.

Acceptance Criteria

All standard reports produce accurate data matching progress tracking and assignment data.

Custom report builder supports multiple dimensions and metrics; saved templates persist.

Reports can be scheduled and delivered via email; recipients receive timely notifications.

Exported files open correctly in Excel/CSV.

Security Considerations

Enforce role‑based access; managers cannot see data outside their teams.

Protect sensitive personal information; mask or exclude personally identifying fields when not needed.

Audit logs for report creation, modification and export.

Module 11 — Notifications & Messaging

Goal

Provide a flexible notifications system that keeps learners, managers and admins informed about assignments, deadlines, completions, upcoming sessions, certification renewals and other events. Enable communication within the LMS and integrate with external channels
rippling.com
workramp.com
.

Deliverables

Notification Types: Assignment notifications (when assigned or auto‑enrolled), reminder notifications (3 days before due date, due date, overdue), completion notifications (to learner and manager), certification expiry reminders, live session reminders, feedback notifications (new comments, replies), system alerts (maintenance, updates).

Channels: Email (HTML and plain text), SMS, WhatsApp, push notifications (web and mobile), in‑app notifications (bell icon); Slack/Microsoft Teams integration for manager channels.

Template Management: Admin can edit notification templates using variables; templates for each event; support multiple languages and localisation; preview before saving; versioning and revert.

Schedule & Time Zones: Send notifications based on the learner’s time zone; support customizing send time (e.g., 9 AM local)
rippling.com
; throttle to avoid spam.

Subscription & Preferences: Users can set preferences for channels and opt out of certain notifications (except mandatory compliance reminders); administrators can override for compliance training.

Batch & Real‑Time: Real‑time triggers for immediate events and batch jobs for scheduled reminders; ensure reliability via retry logic and queue management.

Audit & Logs: Keep a history of notifications sent, delivery status and open/click tracking; support resending.

In‑App Messaging: Provide a message centre for direct messages between manager and learner; group messages; attachments; moderation.

Data Model

notifications (id, type, user_id, channel, subject, body, status [queued|sent|failed], send_at, sent_at, meta_json).

notification_templates (id, name, type, language, subject_template, body_template, version, updated_at).

user_notification_preferences (id, user_id, channel, opt_in_boolean).

message_threads (id, participants_json, created_at, last_message_at) and messages (id, thread_id, sender_id, content, attachments_json, created_at, read_by_json).

API

GET /notifications?userId= – list notifications.

POST /notifications/test – preview template with variables.

PATCH /notification-templates/:id – update template; POST /notification-templates/:id/publish – publish template.

GET /message-threads/:id – fetch messages; POST /message-threads – start new thread; POST /messages – send message.

PATCH /users/:id/notification-preferences – update preferences.

UI Requirements

Notification centre: list of notifications; filters by type and date; statuses (read/unread); mark as read; access to message centre.

Template editor: list of templates; editing interface with variables; preview; version control.

Preferences page: toggles for each channel/event; time zone and preferred send time.

Message inbox: conversation‑style UI; group threads; attachments.

Acceptance Criteria

Notification system delivers email to correct addresses with dynamic variables; reminders sent at correct times; failure handling logs.

Learners can opt out of optional notifications; cannot opt out of compliance reminders.

Managers receive notifications for team completions and overdue statuses.

Message centre supports direct messages; attachments show; read receipts update.

Security Considerations

Validate template variables to prevent injection; sanitise message content.

Secure integration with external providers (API keys, secret management).

Rate‑limit message sending; ensure no spam.

Module 12 — Admin Settings & Configuration

Goal

Provide a centralized settings panel for administrators to configure global preferences, brand customisation, integration settings, user roles, security policies and other system‑wide options.

Deliverables

Branding: Configure company logo, colours, fonts and default certificate design; preview changes; update in real time across the portal; support multiple brand themes if multi‑department customisation is needed.

Localization & Time Zones: Set default language, date/time format (Africa/Accra default), available languages; configure working days and holidays; define fiscal year for reporting.

Roles & Permissions: Manage role definitions; create custom roles (e.g., Instructor) with granular permissions; assign roles to users; maintain a permission matrix.

Integration Settings: Configure external integrations: email provider (SMTP credentials), SMS/WhatsApp gateway, SSO providers (Google Workspace, Microsoft Azure AD), HRIS sync endpoints, video conferencing (Zoom, Teams), analytics connectors.

Data Retention & Privacy: Define retention periods for user data, progress logs and audit logs; automatic data purging; export personal data for compliance; toggle anonymisation for analytics; configure cookie consent and privacy notices.

Security Settings: Configure password policies (if password‑based login used), two‑factor authentication (2FA), session timeout, IP restrictions, encryption keys; manage API tokens for external API; set up Single Sign On.

Course & Content Policies: Default pass marks, quiz settings (randomisation, attempts), certificate expiry; default assignment reminders; default template selections.

Legal & Compliance: Upload terms of service, privacy policy and training agreements; require acceptance on first login; maintain version history.

Maintenance & System Status: Set maintenance windows; display maintenance banner; enable/disable modules; view system health.

Data Model

settings table (key, value, updated_at, updated_by) storing JSON for complex settings.

Extend roles to allow custom roles; permissions table (id, name, description); role_permissions (role_id, permission_id).

API

GET /settings – fetch all settings; PATCH /settings/:key – update one setting.

GET /roles, POST /roles, PATCH /roles/:id, DELETE /roles/:id – manage roles.

GET /permissions – list available permissions.

GET /integrations – list configured integrations; PATCH /integrations/:name – update credentials.

GET /privacy/export/:userId – export user data.

UI Requirements

Settings dashboard with categorised tabs (Branding, Localization, Roles & Permissions, Integrations, Privacy & Compliance, Security, Course Policies, System).

Forms for editing each setting; toggles and dropdowns; test connection for integrations.

Role editor: choose permissions from list; assign to users.

Data export: search user, generate export.

Acceptance Criteria

Changes to settings reflect across the system immediately (e.g., brand colours update UI, certificate templates update new certificates).

Admin can create custom roles with selected permissions; assign to users; restrictions enforced.

Integration credentials saved securely; test connections before saving.

Data retention policies purge data after the configured period.

Security Considerations

Only Super Admin can access critical settings (security, integrations, roles).

Validate inputs for settings; do not store secrets in logs.

Encrypt sensitive settings (API keys) at rest.

Module 13 — Audit Logs & Security Hardening

Goal

Provide comprehensive audit trails for all critical actions across the LMS and implement security best practices to protect data integrity, confidentiality and availability. Ensure the platform is hardened against threats and meets compliance requirements【875808781766704†L266-L272】.

Deliverables

Audit Logging: Capture detailed logs for user authentication events, course creation/modification/publishing, content uploads, assignment operations, role changes, settings updates, integration changes, certificate generation and revocation, notification template modifications, data exports, and user data access. Each entry should record timestamp, user ID, action, entity type, entity ID, IP address, user agent and additional metadata.

Log Storage & Retention: Store logs in a tamper‑evident manner (append‑only DB or log management system); retention policies; ability to archive logs; logs accessible to authorised auditors; export for compliance.

Audit Viewer: Interface for admins and compliance officers to search and filter logs by date range, user, action and entity type; ability to drill down; export results.

Intrusion Detection & Alerting: Monitor log patterns for suspicious activities (e.g., multiple failed logins, mass deletion of content); send alerts to administrators; integrate with SIEM.

Security Hardening:

Authentication & Authorisation: Enforce 2FA for Admin roles; support SSO; implement password complexity and rotation policies; use secure session management (token rotation, HttpOnly, SameSite cookies).

Encryption: Use TLS for all communications; encrypt sensitive data at rest (passwords hashed with PBKDF2/Bcrypt; encryption of API keys).

Input Validation & Sanitisation: Guard against injection attacks; use parameterised queries; sanitise HTML; implement CSRF protection.

Rate Limiting & Brute Force Protection: Limit login attempts; implement captcha after repeated failures; throttle API requests.

Security Scans & Patching: Regularly run automated vulnerability scans; track dependencies; apply patches; maintain updated frameworks; ensure underlying OS and libraries are up to date.

Backup & Disaster Recovery: Automated backups of databases and files; offsite storage; periodic restore tests.

Compliance Standards: Map controls to relevant standards (e.g., ISO 27001, SOC 2, GDPR); support data subject requests; maintain a data breach response plan.

Data Model

Extend audit_logs with changed_fields JSON to record specifics of modifications (before/after values).

security_events (id, event_type, description, detected_at, severity, resolved_at, resolution_notes).

API

GET /audit-logs?userId=&action=&entityType=&dateFrom=&dateTo= – fetch logs; paginated.

GET /audit-logs/:id – view log details.

GET /security-events – list detected security events; PATCH /security-events/:id/resolve – mark as resolved.

POST /security/events/report – manually report incident.

UI Requirements

Audit logs viewer: table view with filters; detail drawer for each log; ability to export as CSV.

Security dashboard: display recent security events; severity; resolution status; ability to acknowledge; links to actions.

2FA settings page; security settings accessible from Module 12.

Acceptance Criteria

All critical actions produce entries in audit logs; accessible via the viewer.

2FA enforcement works for Admin and Super Admin.

Logs cannot be modified or deleted except by retention policy; attempted tampering triggers alerts.

Security events detection and alerts function; administrators can resolve events.

Compliance reports can be generated from logs.

Security Considerations

Logs stored in append‑only tables with checksums to detect tampering.

Access to audit logs restricted to authorised roles; logs contain minimal necessary PII.

Regular penetration testing and vulnerability assessments; patch management.

Summary

This comprehensive specification outlines modules 3 through 13 of a fully functional learning management system for corporate training. It covers course creation, content management, assessments, enrolment flows, learner experiences, analytics, certification, reporting, notifications, administrative settings and security measures. The design draws inspiration from industry best practices, such as integrated course and content management
workramp.com
, the importance of varied delivery methods and learner portals
workramp.com
workramp.com
, the need for engaging assessments and gamification
workramp.com
workramp.com
, robust analytics and reporting capabilities
workramp.com
rippling.com
, and compliance features like certification and notification management
rippling.com
rippling.com
. By implementing these modules sequentially, the organisation will gain a scalable platform that supports continuous learning, compliance and employee development.