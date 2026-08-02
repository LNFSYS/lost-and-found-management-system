import type { Request, Response } from "express";
import { z } from "zod";
import { verificationQuestionService } from "../services/verification-question.service.js";
import { created, ok } from "../utils/api-response.js";
import { HttpError } from "../utils/http-error.js";

const createQuestionSchema = z.object({
  prompt: z.string().trim().min(8).max(500),
  questionType: z.enum(["TEXT", "MASKED_SERIAL", "MULTIPLE_CHOICE", "VISUAL_DETAIL"]),
  sourceSignal: z.string().trim().min(2).max(100),
  expectedAnswer: z.string().trim().min(2).max(500),
  options: z.array(z.string().trim().min(1).max(200)).min(2).max(8).optional(),
  weight: z.coerce.number().min(0.1).max(1).default(0.5),
  privacyLevel: z.enum(["PRIVATE", "HIGHLY_PRIVATE"]).default("PRIVATE"),
  approved: z.boolean().default(false)
});

const questionStatusSchema = z.object({
  status: z.enum(["APPROVED", "DISABLED"])
});

const answerSchema = z.object({
  answer: z.string().trim().min(1).max(500)
});

function requireStringParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `Missing route parameter: ${name}`);
  }
  return value;
}

export const verificationQuestionController = {
  async suggest(request: Request, response: Response) {
    const suggestions = await verificationQuestionService.suggest(
      request.auth!,
      requireStringParam(request.params.id, "id")
    );
    response.json(ok({ suggestions }));
  },

  async create(request: Request, response: Response) {
    const question = await verificationQuestionService.create(
      request.auth!,
      requireStringParam(request.params.id, "id"),
      createQuestionSchema.parse(request.body)
    );
    response.status(201).json(created({ question }, "Verification question saved"));
  },

  async listForPost(request: Request, response: Response) {
    const questions = await verificationQuestionService.listForPost(
      request.auth!,
      requireStringParam(request.params.id, "id")
    );
    response.json(ok({ questions }));
  },

  async updateStatus(request: Request, response: Response) {
    const input = questionStatusSchema.parse(request.body);
    const question = await verificationQuestionService.setStatus(
      request.auth!,
      requireStringParam(request.params.id, "id"),
      requireStringParam(request.params.questionId, "questionId"),
      input.status
    );
    response.json(ok({ question }, "Verification question updated"));
  },

  async listForClaim(request: Request, response: Response) {
    const questions = await verificationQuestionService.listForClaim(
      request.auth!,
      requireStringParam(request.params.id, "id")
    );
    response.json(ok({ questions }));
  },

  async answer(request: Request, response: Response) {
    const input = answerSchema.parse(request.body);
    const result = await verificationQuestionService.answer(
      request.auth!,
      requireStringParam(request.params.id, "id"),
      requireStringParam(request.params.questionId, "questionId"),
      input.answer
    );
    response.json(ok(result, "Verification answer submitted"));
  }
};
