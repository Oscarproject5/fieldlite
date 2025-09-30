import { z } from 'zod';

// Job Status Enum
export type JobStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'on_hold';

// Job Priority Levels
export type JobPriority = 'low' | 'medium' | 'high' | 'urgent';

// Job Types
export type JobType =
  | 'installation'
  | 'maintenance'
  | 'repair'
  | 'inspection'
  | 'consultation'
  | 'emergency'
  | 'other';

// Base Job Interface
export interface Job {
  id: string;
  tenant_id: string;
  job_number: string;
  title: string;
  description?: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;

  // Customer Information
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;

  // Location
  address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  // Scheduling
  scheduled_start: Date;
  scheduled_end: Date;
  estimated_duration: number; // in minutes
  actual_start?: Date;
  actual_end?: Date;

  // Assignment
  assigned_to?: string[]; // Array of user IDs
  team_id?: string;

  // Financial
  estimated_cost?: number;
  actual_cost?: number;
  invoice_id?: string;
  payment_status?: 'pending' | 'partial' | 'paid' | 'overdue';

  // Resources
  required_skills?: string[];
  required_equipment?: string[];
  materials?: JobMaterial[];

  // Notes and Attachments
  notes?: string;
  internal_notes?: string;
  attachments?: JobAttachment[];

  // Metadata
  tags?: string[];
  custom_fields?: Record<string, any>;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
}

// Job Material Interface
export interface JobMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost?: number;
  total_cost?: number;
  supplier?: string;
  notes?: string;
}

// Job Attachment Interface
export interface JobAttachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'video' | 'other';
  url: string;
  size: number;
  uploaded_by: string;
  uploaded_at: Date;
}

// Job Template Interface
export interface JobTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: JobType;
  default_duration: number;
  default_priority: JobPriority;
  required_skills?: string[];
  required_equipment?: string[];
  checklist?: JobChecklistItem[];
  custom_fields_template?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Job Checklist Item
export interface JobChecklistItem {
  id: string;
  title: string;
  description?: string;
  is_required: boolean;
  is_completed: boolean;
  completed_by?: string;
  completed_at?: Date;
  order: number;
}

// Job Filters Interface
export interface JobFilters {
  search?: string;
  status?: JobStatus[];
  priority?: JobPriority[];
  type?: JobType[];
  assigned_to?: string[];
  customer_id?: string;
  date_range?: {
    start: Date;
    end: Date;
  };
  location?: {
    lat: number;
    lng: number;
    radius: number; // in kilometers
  };
  tags?: string[];
  payment_status?: string[];
}

// Job Metrics Interface
export interface JobMetrics {
  total_jobs: number;
  jobs_by_status: Record<JobStatus, number>;
  jobs_by_priority: Record<JobPriority, number>;
  average_completion_time: number;
  on_time_completion_rate: number;
  customer_satisfaction_score: number;
  revenue_generated: number;
  upcoming_jobs_today: number;
  overdue_jobs: number;
  unassigned_jobs: number;
}

// Job History Entry
export interface JobHistoryEntry {
  id: string;
  job_id: string;
  action: string;
  changes?: Record<string, { old: any; new: any }>;
  performed_by: string;
  performed_at: Date;
  notes?: string;
}

// Job Comment Interface
export interface JobComment {
  id: string;
  job_id: string;
  user_id: string;
  user_name: string;
  content: string;
  is_internal: boolean;
  attachments?: JobAttachment[];
  created_at: Date;
  updated_at?: Date;
}

// Validation Schemas with Zod
export const AddressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postal_code: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
});

export const JobMaterialSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Material name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unit_cost: z.number().nonnegative().optional(),
  total_cost: z.number().nonnegative().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

export const JobAttachmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(['image', 'document', 'video', 'other']),
  url: z.string().url(),
  size: z.number().positive(),
  uploaded_by: z.string(),
  uploaded_at: z.date(),
});

export const CreateJobSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters')
    .transform(str => str.trim()),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .transform(str => str?.trim()),
  type: z.enum(['installation', 'maintenance', 'repair', 'inspection', 'consultation', 'emergency', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  customer_id: z.string().uuid('Invalid customer ID'),
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_email: z.string().email('Invalid email').optional().or(z.literal('')),
  customer_phone: z.string().optional(),
  address: AddressSchema,
  scheduled_start: z.string().datetime().or(z.date()),
  scheduled_end: z.string().datetime().or(z.date()),
  estimated_duration: z.number().positive('Duration must be positive'),
  assigned_to: z.array(z.string().uuid()).optional(),
  team_id: z.string().uuid().optional(),
  estimated_cost: z.number().nonnegative().optional(),
  required_skills: z.array(z.string()).optional(),
  required_equipment: z.array(z.string()).optional(),
  materials: z.array(JobMaterialSchema).optional(),
  notes: z.string().max(5000).optional(),
  internal_notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.any()).optional(),
});

export const UpdateJobSchema = CreateJobSchema.partial().extend({
  status: z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold']).optional(),
  actual_start: z.string().datetime().or(z.date()).optional(),
  actual_end: z.string().datetime().or(z.date()).optional(),
  actual_cost: z.number().nonnegative().optional(),
  payment_status: z.enum(['pending', 'partial', 'paid', 'overdue']).optional(),
  completed_at: z.string().datetime().or(z.date()).optional(),
  cancelled_at: z.string().datetime().or(z.date()).optional(),
  cancellation_reason: z.string().max(1000).optional(),
});

export const JobFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.array(z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'])).optional(),
  priority: z.array(z.enum(['low', 'medium', 'high', 'urgent'])).optional(),
  type: z.array(z.enum(['installation', 'maintenance', 'repair', 'inspection', 'consultation', 'emergency', 'other'])).optional(),
  assigned_to: z.array(z.string().uuid()).optional(),
  customer_id: z.string().uuid().optional(),
  date_range: z.object({
    start: z.date(),
    end: z.date(),
  }).optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radius: z.number().positive(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  payment_status: z.array(z.string()).optional(),
});

// Type exports for form validation
export type CreateJobInput = z.infer<typeof CreateJobSchema>;
export type UpdateJobInput = z.infer<typeof UpdateJobSchema>;
export type JobFiltersInput = z.infer<typeof JobFiltersSchema>;

// Helper functions
export const getJobStatusColor = (status: JobStatus): string => {
  const colors: Record<JobStatus, string> = {
    draft: 'gray',
    scheduled: 'blue',
    in_progress: 'yellow',
    completed: 'green',
    cancelled: 'red',
    on_hold: 'orange',
  };
  return colors[status] || 'gray';
};

export const getJobPriorityColor = (priority: JobPriority): string => {
  const colors: Record<JobPriority, string> = {
    low: 'gray',
    medium: 'blue',
    high: 'orange',
    urgent: 'red',
  };
  return colors[priority] || 'gray';
};

export const formatJobNumber = (number: number): string => {
  return `JOB-${String(number).padStart(6, '0')}`;
};

export const calculateJobDuration = (start: Date, end: Date): number => {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // in minutes
};

export const isJobOverdue = (job: Job): boolean => {
  if (job.status === 'completed' || job.status === 'cancelled') {
    return false;
  }
  return new Date(job.scheduled_end) < new Date();
};