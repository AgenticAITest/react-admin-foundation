
import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(500).optional(),
  
});

export const productEditSchema = productSchema.extend({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
});

export type Product = z.infer<typeof productSchema>;
export type ProductEdit = z.infer<typeof productEditSchema>;