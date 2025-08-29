import { z } from "zod";

export const productTypeSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const productTypeQuerySchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 20),
  sort: z.string().optional().default('name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  q: z.string().optional(),
});

export type ProductTypeFormData = z.infer<typeof productTypeSchema>;
export type ProductTypeQuery = z.infer<typeof productTypeQuerySchema>;