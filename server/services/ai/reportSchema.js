import { z } from 'zod';

export const reportSchema = z.object({
  summary: z.string(),
  verdict: z.enum(['BUY', 'CONSIDER WITH CAUTION', 'PASS']),
  verdictReason: z.string(),
  pros: z.array(z.object({
    point: z.string(),
    impact: z.enum(['HIGH', 'MEDIUM', 'LOW']).catch('MEDIUM')
  })).default([]),
  cons: z.array(z.object({
    point: z.string(),
    severity: z.enum(['CRITICAL', 'MODERATE', 'MINOR']).catch('MODERATE')
  })).default([]),
  bestFor: z.array(z.string()).default([]),
  notRecommendedFor: z.array(z.string()).default([]),
  keyThemes: z.array(z.string()).default([]),
  confidenceScore: z.number().catch(88),
  isMock: z.boolean().default(false),
  provider: z.string().default('gemini')
});
