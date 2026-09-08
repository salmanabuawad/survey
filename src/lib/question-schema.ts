import { z } from "zod";

import { MAX_OTHER_LENGTH, MAX_TEXT_LENGTH } from "./limits";

/** Shape the admin editor posts. Kept apart from the respondent-facing schema. */
export const questionInputSchema = z
  .object({
    sectionId: z.string().uuid(),
    type: z.enum(["single", "multiple", "text"]),
    text: z.string().trim().min(1, "نص السؤال مطلوب").max(600),
    hint: z.string().trim().max(300).nullable().optional(),
    options: z
      .array(
        z.object({
          // Absent for a newly added option; the server assigns one.
          id: z.string().trim().max(120).optional(),
          label: z.string().trim().min(1).max(MAX_OTHER_LENGTH),
          other: z.boolean().optional(),
        }),
      )
      .max(60)
      .default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.type === "text") return;
    if (value.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "يحتاج السؤال إلى خيارين على الأقل",
        path: ["options"],
      });
    }
    const labels = value.options.map((option) => option.label);
    if (new Set(labels).size !== labels.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "لا يمكن تكرار نفس الخيار",
        path: ["options"],
      });
    }
  });

export type QuestionInputPayload = z.infer<typeof questionInputSchema>;

export const reorderSchema = z
  .object({
    ordered: z
      .array(z.object({ id: z.string().uuid(), sectionId: z.string().uuid() }))
      .max(500),
  })
  .strict();

export { MAX_TEXT_LENGTH };
