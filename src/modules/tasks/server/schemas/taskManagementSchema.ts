import { z } from 'zod';

export const taskManagementSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
});

export const taskManagementEditSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
});

export type TaskManagementFormData = z.infer<typeof taskManagementSchema>;
export type TaskManagementEditFormData = z.infer<typeof taskManagementEditSchema>;