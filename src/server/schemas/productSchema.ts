import { z } from "zod";

export const productSchema = z.object({
  id: z.number().optional(),
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  inventoryTypeId: z.number().positive("Inventory type ID must be positive"),
  packageTypeId: z.number().positive("Package type ID must be positive"),
  minimumStockLevel: z.number().min(0).optional(),
  reorderPoint: z.number().min(0).optional(),
  requiredTemperatureMin: z.number().optional(),
  requiredTemperatureMax: z.number().optional(),
  weight: z.number().min(0).optional(),
  dimensions: z.string().optional(),
  active: z.boolean().default(true),
  hasExpiryDate: z.boolean().default(false),
});

export const productQuerySchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 20),
  sort: z.string().optional().default('name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  q: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;