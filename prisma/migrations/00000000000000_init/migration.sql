-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "section" (
    "id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" UUID NOT NULL,
    "lineage_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "lineage_key" TEXT NOT NULL,
    "section_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "hint" TEXT,
    "options" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'live',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_response" (
    "id" UUID NOT NULL,
    "survey_version" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completion_seconds" INTEGER,
    "framework_type" TEXT,
    "age_group" TEXT,
    "group_size" TEXT,
    "experience" TEXT,

    CONSTRAINT "survey_response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_answer" (
    "id" UUID NOT NULL,
    "response_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "question_key" TEXT NOT NULL,
    "question_number" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" TEXT NOT NULL,
    "selected_options" TEXT[],
    "text_value" TEXT,
    "other_text" TEXT,

    CONSTRAINT "survey_answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "section_position_idx" ON "section"("position");

-- CreateIndex
CREATE INDEX "question_status_idx" ON "question"("status");

-- CreateIndex
CREATE INDEX "question_lineage_id_idx" ON "question"("lineage_id");

-- CreateIndex
CREATE INDEX "question_section_id_position_idx" ON "question"("section_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "question_lineage_id_version_key" ON "question"("lineage_id", "version");

-- CreateIndex
CREATE INDEX "survey_response_submitted_at_idx" ON "survey_response"("submitted_at");

-- CreateIndex
CREATE INDEX "survey_response_survey_version_idx" ON "survey_response"("survey_version");

-- CreateIndex
CREATE INDEX "survey_response_framework_type_idx" ON "survey_response"("framework_type");

-- CreateIndex
CREATE INDEX "survey_response_age_group_idx" ON "survey_response"("age_group");

-- CreateIndex
CREATE INDEX "survey_response_group_size_idx" ON "survey_response"("group_size");

-- CreateIndex
CREATE INDEX "survey_response_experience_idx" ON "survey_response"("experience");

-- CreateIndex
CREATE INDEX "survey_answer_question_id_idx" ON "survey_answer"("question_id");

-- CreateIndex
CREATE INDEX "survey_answer_question_key_idx" ON "survey_answer"("question_key");

-- CreateIndex
CREATE UNIQUE INDEX "survey_answer_response_id_question_id_key" ON "survey_answer"("response_id", "question_id");

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answer" ADD CONSTRAINT "survey_answer_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "survey_response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answer" ADD CONSTRAINT "survey_answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

