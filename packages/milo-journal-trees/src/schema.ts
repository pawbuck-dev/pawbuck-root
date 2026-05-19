import { z } from "zod";

export const chipOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  drilldownPrompt: z.string().optional(),
  drilldownOptional: z.boolean().optional(),
});

export const questionSchema = z.object({
  id: z.string(),
  step: z.number().int().min(2).max(7),
  prompt: z.string(),
  type: z.enum(["single", "multi", "two_stage", "freeform"]),
  options: z.array(chipOptionSchema).optional(),
  stage1Options: z.array(chipOptionSchema).optional(),
  stage2Options: z.array(chipOptionSchema).optional(),
  skipToQuestionId: z.string().optional(),
  skipIfAnswerIds: z.array(z.string()).optional(),
  conditionalOn: z.string().optional(),
});

export const redFlagTriggerSchema = z.object({
  ifAnyAnswerIds: z.array(z.string()).optional(),
  ifAllAnswerIds: z.array(z.string()).optional(),
  ifPattern: z.string().optional(),
  level: z.enum(["emergency", "urgent"]),
});

export const summaryFieldMapSchema = z.record(z.string());

export const journalTreeSchema = z.object({
  treeId: z.string(),
  topic: z.string(),
  version: z.string(),
  symptomTaxonomy: z.array(z.string()),
  contextSurface: z.object({
    alwaysSurface: z.array(z.string()),
    adrSymptomKeys: z.array(z.string()).optional(),
    puppyGiWarning: z.boolean().optional(),
  }),
  questions: z.array(questionSchema),
  redFlagTriggers: z.array(redFlagTriggerSchema),
  summaryFieldMap: summaryFieldMapSchema,
  maxQuestions: z.number().int().default(6),
});

export type JournalTree = z.infer<typeof journalTreeSchema>;
export type JournalQuestion = z.infer<typeof questionSchema>;
