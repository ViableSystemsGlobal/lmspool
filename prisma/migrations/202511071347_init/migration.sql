-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('LEARNER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" "RoleName" NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "phone" TEXT,
    "department_id" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "job_title" TEXT,
    "employee_code" TEXT,
    "avatar_url" TEXT,
    "deactivated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" BIGINT NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "auth_otps" (
    "id" BIGSERIAL NOT NULL,
    "email" CITEXT NOT NULL,
    "code" CHAR(6) NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'login',
    "attempts_left" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumed_at" TIMESTAMPTZ,

    CONSTRAINT "auth_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "user_agent" TEXT,
    "ip" INET,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "parent_id" BIGINT,
    "manager_user_id" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_import_jobs" (
    "id" BIGSERIAL NOT NULL,
    "uploaded_by_id" BIGINT NOT NULL,
    "source_filename" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "processed_rows" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_summary" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "user_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_import_job_rows" (
    "id" BIGSERIAL NOT NULL,
    "job_id" BIGINT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "raw_json" JSONB NOT NULL,
    "outcome" TEXT DEFAULT 'skipped',
    "message" TEXT,

    CONSTRAINT "user_import_job_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "pass_mark" INTEGER NOT NULL DEFAULT 70,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "difficulty" TEXT,
    "estimated_duration_min" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_versions" (
    "id" BIGSERIAL NOT NULL,
    "course_id" BIGINT NOT NULL,
    "version_label" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ,

    CONSTRAINT "course_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" BIGSERIAL NOT NULL,
    "course_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" BIGSERIAL NOT NULL,
    "module_id" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content_url" TEXT,
    "content_html" TEXT,
    "duration_min" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_assets" (
    "id" BIGSERIAL NOT NULL,
    "lesson_id" BIGINT NOT NULL,
    "file_id" BIGINT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "lesson_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_templates" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "structure_json" JSONB NOT NULL,
    "default_pass_mark" INTEGER,
    "course_id" BIGINT,

    CONSTRAINT "course_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" BIGSERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "uploaded_by_id" BIGINT NOT NULL,
    "description" TEXT,
    "category_id" BIGINT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version_no" INTEGER NOT NULL DEFAULT 1,
    "parent_file_id" BIGINT,
    "duration_sec" INTEGER,
    "resolution" TEXT,
    "external_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_categories" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" BIGINT,

    CONSTRAINT "file_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_permissions" (
    "id" BIGSERIAL NOT NULL,
    "file_id" BIGINT NOT NULL,
    "department_id" BIGINT,
    "role" TEXT,
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "file_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" BIGSERIAL NOT NULL,
    "course_id" BIGINT NOT NULL,
    "time_limit_sec" INTEGER,
    "attempts_allowed" INTEGER NOT NULL DEFAULT 1,
    "randomize" BOOLEAN NOT NULL DEFAULT false,
    "pass_mark_override" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" BIGSERIAL NOT NULL,
    "quiz_id" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "prompt_html" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 1,
    "difficulty" TEXT,
    "category_id" BIGINT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "media_file_id" BIGINT,
    "explanation_html" TEXT,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" BIGSERIAL NOT NULL,
    "question_id" BIGINT NOT NULL,
    "label" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_pools" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "course_id" BIGINT,
    "category_id" BIGINT,

    CONSTRAINT "question_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_pool_memberships" (
    "pool_id" BIGINT NOT NULL,
    "question_id" BIGINT NOT NULL,

    CONSTRAINT "question_pool_memberships_pkey" PRIMARY KEY ("pool_id","question_id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" BIGSERIAL NOT NULL,
    "quiz_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "score" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "submitted_at" TIMESTAMPTZ,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "attempt_no" INTEGER NOT NULL,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempt_answers" (
    "id" BIGSERIAL NOT NULL,
    "attempt_id" BIGINT NOT NULL,
    "question_id" BIGINT NOT NULL,
    "option_id" BIGINT,
    "response_text" TEXT,
    "is_correct" BOOLEAN,

    CONSTRAINT "quiz_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" BIGSERIAL NOT NULL,
    "course_id" BIGINT NOT NULL,
    "assigned_by_id" BIGINT NOT NULL,
    "due_at" TIMESTAMPTZ,
    "scope" TEXT NOT NULL,
    "grace_days" INTEGER DEFAULT 0,
    "recurrence_interval_months" INTEGER,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "prerequisites_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_targets" (
    "id" BIGSERIAL NOT NULL,
    "assignment_id" BIGINT NOT NULL,
    "user_id" BIGINT,
    "department_id" BIGINT,
    "role" TEXT,

    CONSTRAINT "assignment_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_courses" (
    "learning_path_id" BIGINT NOT NULL,
    "course_id" BIGINT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "learning_path_courses_pkey" PRIMARY KEY ("learning_path_id","course_id")
);

-- CreateTable
CREATE TABLE "auto_enroll_rules" (
    "id" BIGSERIAL NOT NULL,
    "trigger" TEXT NOT NULL,
    "department_id" BIGINT,
    "roleId" INTEGER,
    "course_id" BIGINT,
    "path_id" BIGINT,
    "due_days" INTEGER DEFAULT 30,

    CONSTRAINT "auto_enroll_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "course_id" BIGINT NOT NULL,
    "assigned_via_assignment_id" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "certificate_id" BIGINT,
    "due_at" TIMESTAMPTZ,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "recertification_due_at" TIMESTAMPTZ,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER,
    "feedback" TEXT,
    "recommendation_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "lesson_id" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'seen',
    "last_viewed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "time_spent_sec" INTEGER DEFAULT 0,
    "attempts_count" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMPTZ,

    CONSTRAINT "progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "lesson_id" BIGINT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria_json" JSONB NOT NULL,
    "image_file_id" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "badge_id" BIGINT NOT NULL,
    "earned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidence_url" TEXT,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_course" (
    "id" BIGSERIAL NOT NULL,
    "course_id" BIGINT NOT NULL,
    "assigned_count" INTEGER NOT NULL DEFAULT 0,
    "started_count" INTEGER NOT NULL DEFAULT 0,
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "average_score" DECIMAL(5,2),
    "average_time_spent" INTEGER,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "analytics_course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competencies" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_competencies" (
    "course_id" BIGINT NOT NULL,
    "competency_id" BIGINT NOT NULL,

    CONSTRAINT "course_competencies_pkey" PRIMARY KEY ("course_id","competency_id")
);

-- CreateTable
CREATE TABLE "user_competencies" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "competency_id" BIGINT NOT NULL,
    "level" TEXT,
    "achieved_at" TIMESTAMPTZ,

    CONSTRAINT "user_competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "course_id" BIGINT NOT NULL,
    "number" TEXT NOT NULL,
    "pdf_url" TEXT NOT NULL,
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_at" TIMESTAMPTZ,
    "template_id" BIGINT,
    "qr_code_url" TEXT,
    "badge_id" BIGINT,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_templates" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT,
    "background_file_id" BIGINT,
    "design_json" JSONB NOT NULL,
    "default_expiry_days" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "send_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "meta_json" JSONB DEFAULT '{}',

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "subject_template" TEXT NOT NULL,
    "body_template" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_preferences" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "channel" TEXT NOT NULL,
    "opt_in" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_threads" (
    "id" BIGSERIAL NOT NULL,
    "participants_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_at" TIMESTAMPTZ,

    CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" BIGSERIAL NOT NULL,
    "thread_id" BIGINT NOT NULL,
    "sender_id" BIGINT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments_json" JSONB DEFAULT '[]',
    "read_by_json" JSONB DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" BIGINT,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "actor_user_id" BIGINT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "ip" INET,
    "user_agent" TEXT,
    "ts" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "changed_fields" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" BIGSERIAL NOT NULL,
    "event_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" TEXT NOT NULL,
    "resolved_at" TIMESTAMPTZ,
    "resolution_notes" TEXT,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_code_key" ON "users"("employee_code");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "auth_otps_email_idx" ON "auth_otps"("email");

-- CreateIndex
CREATE INDEX "auth_otps_expires_at_idx" ON "auth_otps"("expires_at");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_manager_user_id_key" ON "departments"("manager_user_id");

-- CreateIndex
CREATE INDEX "user_import_job_rows_job_id_idx" ON "user_import_job_rows"("job_id");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "courses"("status");

-- CreateIndex
CREATE INDEX "courses_category_idx" ON "courses"("category");

-- CreateIndex
CREATE INDEX "course_versions_course_id_idx" ON "course_versions"("course_id");

-- CreateIndex
CREATE INDEX "modules_course_id_idx" ON "modules"("course_id");

-- CreateIndex
CREATE INDEX "lessons_module_id_idx" ON "lessons"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_assets_lesson_id_file_id_key" ON "lesson_assets"("lesson_id", "file_id");

-- CreateIndex
CREATE INDEX "files_uploaded_by_id_idx" ON "files"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "files_category_id_idx" ON "files"("category_id");

-- CreateIndex
CREATE INDEX "quizzes_course_id_idx" ON "quizzes"("course_id");

-- CreateIndex
CREATE INDEX "questions_quiz_id_idx" ON "questions"("quiz_id");

-- CreateIndex
CREATE INDEX "question_options_question_id_idx" ON "question_options"("question_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_quiz_id_idx" ON "quiz_attempts"("quiz_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_user_id_idx" ON "quiz_attempts"("user_id");

-- CreateIndex
CREATE INDEX "quiz_attempt_answers_attempt_id_idx" ON "quiz_attempt_answers"("attempt_id");

-- CreateIndex
CREATE INDEX "assignments_course_id_idx" ON "assignments"("course_id");

-- CreateIndex
CREATE INDEX "assignment_targets_assignment_id_idx" ON "assignment_targets"("assignment_id");

-- CreateIndex
CREATE INDEX "enrollments_user_id_idx" ON "enrollments"("user_id");

-- CreateIndex
CREATE INDEX "enrollments_course_id_idx" ON "enrollments"("course_id");

-- CreateIndex
CREATE INDEX "enrollments_status_idx" ON "enrollments"("status");

-- CreateIndex
CREATE INDEX "progress_user_id_idx" ON "progress"("user_id");

-- CreateIndex
CREATE INDEX "progress_lesson_id_idx" ON "progress"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "progress_user_id_lesson_id_key" ON "progress"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "notes_user_id_lesson_id_idx" ON "notes"("user_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "user_badges"("user_id", "badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_course_course_id_key" ON "analytics_course"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_competencies_user_id_competency_id_key" ON "user_competencies"("user_id", "competency_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_number_key" ON "certificates"("number");

-- CreateIndex
CREATE INDEX "certificates_user_id_idx" ON "certificates"("user_id");

-- CreateIndex
CREATE INDEX "certificates_course_id_idx" ON "certificates"("course_id");

-- CreateIndex
CREATE INDEX "certificates_number_idx" ON "certificates"("number");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_send_at_idx" ON "notifications"("send_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_type_language_version_key" ON "notification_templates"("type", "language", "version");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preferences_user_id_channel_key" ON "user_notification_preferences"("user_id", "channel");

-- CreateIndex
CREATE INDEX "messages_thread_id_idx" ON "messages"("thread_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_ts_idx" ON "audit_logs"("ts");

-- CreateIndex
CREATE INDEX "security_events_severity_idx" ON "security_events"("severity");

-- CreateIndex
CREATE INDEX "security_events_resolved_at_idx" ON "security_events"("resolved_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_user_id_fkey" FOREIGN KEY ("manager_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_import_jobs" ADD CONSTRAINT "user_import_jobs_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_import_job_rows" ADD CONSTRAINT "user_import_job_rows_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "user_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_versions" ADD CONSTRAINT "course_versions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_assets" ADD CONSTRAINT "lesson_assets_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_assets" ADD CONSTRAINT "lesson_assets_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_templates" ADD CONSTRAINT "course_templates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "file_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_parent_file_id_fkey" FOREIGN KEY ("parent_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_categories" ADD CONSTRAINT "file_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "file_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_permissions" ADD CONSTRAINT "file_permissions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_pool_memberships" ADD CONSTRAINT "question_pool_memberships_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "question_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_pool_memberships" ADD CONSTRAINT "question_pool_memberships_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_targets" ADD CONSTRAINT "assignment_targets_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_targets" ADD CONSTRAINT "assignment_targets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_courses" ADD CONSTRAINT "learning_path_courses_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_courses" ADD CONSTRAINT "learning_path_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_enroll_rules" ADD CONSTRAINT "auto_enroll_rules_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_enroll_rules" ADD CONSTRAINT "auto_enroll_rules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_enroll_rules" ADD CONSTRAINT "auto_enroll_rules_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "learning_paths"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_assigned_via_assignment_id_fkey" FOREIGN KEY ("assigned_via_assignment_id") REFERENCES "assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_competencies" ADD CONSTRAINT "course_competencies_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_competencies" ADD CONSTRAINT "course_competencies_competency_id_fkey" FOREIGN KEY ("competency_id") REFERENCES "competencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_competencies" ADD CONSTRAINT "user_competencies_competency_id_fkey" FOREIGN KEY ("competency_id") REFERENCES "competencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

