import { z } from "zod";

export const packageTypeSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  unitsPerPackage: z.number().min(0).optional(),
  barcode: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.number().min(0).optional(),
  isActive: z.boolean().default(true),
});

export const packageTypeQuerySchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 20),
  sort: z.string().optional().default('name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  q: z.string().optional(),
});

export type PackageTypeFormData = z.infer<typeof packageTypeSchema>;
export type PackageTypeQuery = z.infer<typeof packageTypeQuerySchema>;