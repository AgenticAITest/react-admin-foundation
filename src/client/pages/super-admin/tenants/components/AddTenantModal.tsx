import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/components/ui/form';
import { Input } from '@client/components/ui/input';
import { Button } from '@client/components/ui/button';
import { Separator } from '@client/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/components/ui/card';
import { Building2, User, Mail, Lock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

// Schema matching our backend API
const createTenantSchema = z.object({
  // Tenant registration details (mandatory)
  name: z.string().min(2, 'Tenant name must be at least 2 characters'),
  domain: z.string()
    .min(4, 'Domain must be at least 4 characters')
    .max(253, 'Domain must be less than 253 characters')
    .regex(/^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*$/, 'Domain must be in full format (e.g., techcorp.com)')
    .refine(val => val.includes('.') && val.split('.').length >= 2, 'Domain must include TLD (e.g., .com, .co.uk)')
    .refine(val => !val.includes('--'), 'Domain cannot contain consecutive hyphens')
    .refine(val => !val.includes('..'), 'Domain cannot contain consecutive dots'),
  
  // Tenant admin user details (mandatory)
  adminUsername: z.string().min(3, 'Username must be at least 3 characters'),
  adminEmail: z.string().email('Please enter a valid email address'),
  adminFullName: z.string().min(2, 'Full name must be at least 2 characters'),
  adminPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  // Optional company details
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email().optional().or(z.literal('')),
});

type CreateTenantFormData = z.infer<typeof createTenantSchema>;

interface AddTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddTenantModal({ open, onOpenChange, onSuccess }: AddTenantModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateTenantFormData>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: '',
      domain: '',
      adminUsername: '',
      adminEmail: '',
      adminFullName: '',
      adminPassword: '',
      companyName: '',
      companyAddress: '',
      companyPhone: '',
      companyEmail: '',
    },
  });

  const onSubmit = async (data: CreateTenantFormData) => {
    try {
      setIsSubmitting(true);
      
      // Remove empty optional fields
      const submitData = {
        ...data,
        companyName: data.companyName || undefined,
        companyAddress: data.companyAddress || undefined,
        companyPhone: data.companyPhone || undefined,
        companyEmail: data.companyEmail || undefined,
      };

      await axios.post('/api/system/tenant', submitData);
      
      toast.success('Tenant created successfully');
      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to create tenant. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        form.reset();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Add New Tenant
          </DialogTitle>
          <DialogDescription>
            Create a new tenant organization with dedicated schema and admin user.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tenant Registration Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Tenant Registration
                </CardTitle>
                <CardDescription>
                  Basic tenant information and domain settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter tenant name (e.g., ACME Corporation)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter domain (e.g., techcorp.com)" 
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, '');
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Schema will be created as: tenant_{field.value?.replace(/[^a-z0-9]/g, '_') || 'domain_com'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Only lowercase letters, numbers, dots, and hyphens allowed
                      </p>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Tenant Admin User Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Tenant Administrator
                </CardTitle>
                <CardDescription>
                  Admin user who will manage this tenant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="adminUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username *</FormLabel>
                        <FormControl>
                          <Input placeholder="admin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adminFullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="adminEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="admin@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adminPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter secure password" {...field} />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Must contain at least 8 characters with uppercase, lowercase, and numbers
                      </p>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Optional Company Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Company Details (Optional)
                </CardTitle>
                <CardDescription>
                  Additional company information for the tenant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="ACME Corporation Inc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St, City, State 12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contact@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Tenant'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}