-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS inet;

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
    "id" BIGSERISTREAM...
