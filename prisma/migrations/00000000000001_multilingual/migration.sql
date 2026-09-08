-- AlterTable
ALTER TABLE "survey_response" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'ar';

-- AlterTable
ALTER TABLE "survey_answer" ADD COLUMN     "selected_option_ids" TEXT[];

-- CreateTable
CREATE TABLE "question_translation" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "hint" TEXT,
    "option_labels" JSONB NOT NULL,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_translation" (
    "id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "section_translation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_translation_locale_idx" ON "question_translation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "question_translation_question_id_locale_key" ON "question_translation"("question_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "section_translation_section_id_locale_key" ON "section_translation"("section_id", "locale");

-- CreateIndex
CREATE INDEX "survey_response_locale_idx" ON "survey_response"("locale");

-- AddForeignKey
ALTER TABLE "question_translation" ADD CONSTRAINT "question_translation_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_translation" ADD CONSTRAINT "section_translation_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

