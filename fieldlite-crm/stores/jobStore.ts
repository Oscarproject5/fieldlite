import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient } from '@/lib/supabase/client';
import type {
  Job,
  JobFilters,
  JobMetrics,
  CreateJobInput,
  UpdateJobInput,
  JobComment,
  JobHistoryEntry
} from '@/types/jobs';

interface JobState {
  // Data
  jobs: Record<string, Job>;
  jobsList: string[]; // Ordered list of job IDs
  activeJob: Job | null;
  filters: JobFilters;
  metrics: JobMetrics | null;
  comments: Record<string, JobComment[]>; // job_id -> comments
  history: Record<string, JobHistoryEntry[]>; // job_id -> history

  // UI State
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
  searchQuery: string;
  selectedJobs: Set<string>;
  viewMode: 'list' | 'grid' | 'calendar' | 'map';
  sortBy: 'date' | 'priority' | 'status' | 'customer';
  sortOrder: 'asc' | 'desc';

  // Pagination
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;

  // Real-time
  subscription: any;

  // Cache Management
  lastFetch: number;
  cacheTimeout: number;

  // Actions
  loadJobs: (filters?: JobFilters, append?: boolean) => Promise<void>;
  loadJob: (id: string) => Promise<void>;
  createJob: (job: CreateJobInput) => Promise<Job>;
  updateJob: (id: string, updates: UpdateJobInput) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  bulkUpdateJobs: (ids: string[], updates: Partial<Job>) => Promise<void>;

  // Search and Filter
  setFilters: (filters: JobFilters) => void;
  clearFilters: () => void;
  searchJobs: (query: string) => void;

  // Selection
  selectJob: (id: string) => void;
  deselectJob: (id: string) => void;
  selectAllJobs: () => void;
  clearSelection: () => void;

  // View Management
  setViewMode: (mode: 'list' | 'grid' | 'calendar' | 'map') => void;
  setSortBy: (field: 'date' | 'priority' | 'status' | 'customer') => void;
  toggleSortOrder: () => void;

  // Pagination
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  loadNextPage: () => Promise<void>;

  // Comments
  loadComments: (jobId: string) => Promise<void>;
  addComment: (jobId: string, content: string, isInternal?: boolean) => Promise<void>;

  // History
  loadHistory: (jobId: string) => Promise<void>;

  // Metrics
  loadMetrics: () => Promise<void>;

  // Real-time
  subscribeToChanges: () => void;
  unsubscribeFromChanges: () => void;

  // Cache
  invalidateCache: () => void;

  // Cleanup
  reset: () => void;
}

const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const useJobStore = create<JobState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial State
        jobs: {},
        jobsList: [],
        activeJob: null,
        filters: {},
        metrics: null,
        comments: {},
        history: {},

        isLoading: false,
        isCreating: false,
        isUpdating: false,
        error: null,
        searchQuery: '',
        selectedJobs: new Set(),
        viewMode: 'list',
        sortBy: 'date',
        sortOrder: 'desc',

        page: 1,
        pageSize: 25,
        totalPages: 1,
        totalCount: 0,
        hasMore: false,

        subscription: null,
        lastFetch: 0,
        cacheTimeout: CACHE_TIMEOUT,

        // Load Jobs
        loadJobs: async (filters?: JobFilters, append = false) => {
          const state = get();
          const supabase = createClient();

          // Check cache validity
          if (!filters && !append && Date.now() - state.lastFetch < state.cacheTimeout) {
            return;
          }

          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            let query = supabase
              .from('jobs')
              .select('*', { count: 'exact' });

            // Apply filters
            if (filters?.status?.length) {
              query = query.in('status', filters.status);
            }
            if (filters?.priority?.length) {
              query = query.in('priority', filters.priority);
            }
            if (filters?.type?.length) {
              query = query.in('type', filters.type);
            }
            if (filters?.assigned_to?.length) {
              query = query.contains('assigned_to', filters.assigned_to);
            }
            if (filters?.customer_id) {
              query = query.eq('customer_id', filters.customer_id);
            }
            if (filters?.search) {
              query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
            }
            if (filters?.date_range) {
              query = query
                .gte('scheduled_start', filters.date_range.start.toISOString())
                .lte('scheduled_start', filters.date_range.end.toISOString());
            }
            if (filters?.tags?.length) {
              query = query.contains('tags', filters.tags);
            }

            // Apply sorting
            const sortColumn = state.sortBy === 'date' ? 'scheduled_start' :
                             state.sortBy === 'priority' ? 'priority' :
                             state.sortBy === 'status' ? 'status' : 'customer_name';
            query = query.order(sortColumn, { ascending: state.sortOrder === 'asc' });

            // Apply pagination
            const from = append ? state.jobsList.length : (state.page - 1) * state.pageSize;
            const to = from + state.pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            set((state) => {
              if (append) {
                // Append to existing jobs
                data?.forEach((job) => {
                  state.jobs[job.id] = job;
                  if (!state.jobsList.includes(job.id)) {
                    state.jobsList.push(job.id);
                  }
                });
              } else {
                // Replace jobs
                state.jobs = {};
                state.jobsList = [];
                data?.forEach((job) => {
                  state.jobs[job.id] = job;
                  state.jobsList.push(job.id);
                });
              }

              state.totalCount = count || 0;
              state.totalPages = Math.ceil((count || 0) / state.pageSize);
              state.hasMore = state.jobsList.length < (count || 0);
              state.lastFetch = Date.now();
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to load jobs';
              state.isLoading = false;
            });
          }
        },

        // Load Single Job
        loadJob: async (id: string) => {
          const supabase = createClient();
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const { data, error } = await supabase
              .from('jobs')
              .select('*')
              .eq('id', id)
              .single();

            if (error) throw error;

            set((state) => {
              state.jobs[id] = data;
              state.activeJob = data;
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to load job';
              state.isLoading = false;
            });
          }
        },

        // Create Job
        createJob: async (jobInput: CreateJobInput) => {
          const supabase = createClient();
          set((state) => {
            state.isCreating = true;
            state.error = null;
          });

          try {
            // Generate job number
            const { data: countData } = await supabase
              .from('jobs')
              .select('job_number', { count: 'exact', head: true });

            const jobNumber = `JOB-${String((countData?.length || 0) + 1).padStart(6, '0')}`;

            const { data, error } = await supabase
              .from('jobs')
              .insert({
                ...jobInput,
                job_number: jobNumber,
                status: 'scheduled',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (error) throw error;

            set((state) => {
              state.jobs[data.id] = data;
              state.jobsList.unshift(data.id);
              state.isCreating = false;
            });

            // Track history
            await get().addHistory(data.id, 'created', null, { new: data });

            return data;
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to create job';
              state.isCreating = false;
            });
            throw error;
          }
        },

        // Update Job
        updateJob: async (id: string, updates: UpdateJobInput) => {
          const supabase = createClient();
          const oldJob = get().jobs[id];

          // Optimistic update
          set((state) => {
            if (state.jobs[id]) {
              Object.assign(state.jobs[id], updates);
            }
            state.isUpdating = true;
            state.error = null;
          });

          try {
            const { data, error } = await supabase
              .from('jobs')
              .update({
                ...updates,
                updated_at: new Date().toISOString(),
              })
              .eq('id', id)
              .select()
              .single();

            if (error) throw error;

            set((state) => {
              state.jobs[id] = data;
              if (state.activeJob?.id === id) {
                state.activeJob = data;
              }
              state.isUpdating = false;
            });

            // Track history
            await get().addHistory(id, 'updated', { old: oldJob, new: data });
          } catch (error) {
            // Rollback optimistic update
            set((state) => {
              if (oldJob) {
                state.jobs[id] = oldJob;
              }
              state.error = error instanceof Error ? error.message : 'Failed to update job';
              state.isUpdating = false;
            });
          }
        },

        // Delete Job
        deleteJob: async (id: string) => {
          const supabase = createClient();
          const jobToDelete = get().jobs[id];

          // Optimistic delete
          set((state) => {
            delete state.jobs[id];
            state.jobsList = state.jobsList.filter(jobId => jobId !== id);
            if (state.activeJob?.id === id) {
              state.activeJob = null;
            }
          });

          try {
            const { error } = await supabase
              .from('jobs')
              .delete()
              .eq('id', id);

            if (error) throw error;
          } catch (error) {
            // Rollback optimistic delete
            set((state) => {
              if (jobToDelete) {
                state.jobs[id] = jobToDelete;
                state.jobsList.push(id);
              }
              state.error = error instanceof Error ? error.message : 'Failed to delete job';
            });
          }
        },

        // Bulk Update Jobs
        bulkUpdateJobs: async (ids: string[], updates: Partial<Job>) => {
          const supabase = createClient();

          set((state) => {
            state.isUpdating = true;
            state.error = null;
          });

          try {
            const { error } = await supabase
              .from('jobs')
              .update({
                ...updates,
                updated_at: new Date().toISOString(),
              })
              .in('id', ids);

            if (error) throw error;

            // Reload affected jobs
            await get().loadJobs();

            set((state) => {
              state.isUpdating = false;
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to update jobs';
              state.isUpdating = false;
            });
          }
        },

        // Filters
        setFilters: (filters: JobFilters) => {
          set((state) => {
            state.filters = filters;
            state.page = 1;
          });
          get().loadJobs(filters);
        },

        clearFilters: () => {
          set((state) => {
            state.filters = {};
            state.page = 1;
          });
          get().loadJobs();
        },

        searchJobs: (query: string) => {
          set((state) => {
            state.searchQuery = query;
            state.filters = { ...state.filters, search: query };
            state.page = 1;
          });
          get().loadJobs(get().filters);
        },

        // Selection
        selectJob: (id: string) => {
          set((state) => {
            state.selectedJobs.add(id);
          });
        },

        deselectJob: (id: string) => {
          set((state) => {
            state.selectedJobs.delete(id);
          });
        },

        selectAllJobs: () => {
          set((state) => {
            state.selectedJobs = new Set(state.jobsList);
          });
        },

        clearSelection: () => {
          set((state) => {
            state.selectedJobs = new Set();
          });
        },

        // View Management
        setViewMode: (mode: 'list' | 'grid' | 'calendar' | 'map') => {
          set((state) => {
            state.viewMode = mode;
          });
        },

        setSortBy: (field: 'date' | 'priority' | 'status' | 'customer') => {
          set((state) => {
            state.sortBy = field;
          });
          get().loadJobs(get().filters);
        },

        toggleSortOrder: () => {
          set((state) => {
            state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
          });
          get().loadJobs(get().filters);
        },

        // Pagination
        setPage: (page: number) => {
          set((state) => {
            state.page = page;
          });
          get().loadJobs(get().filters);
        },

        setPageSize: (size: number) => {
          set((state) => {
            state.pageSize = size;
            state.page = 1;
          });
          get().loadJobs(get().filters);
        },

        loadNextPage: async () => {
          const state = get();
          if (state.hasMore && !state.isLoading) {
            await state.loadJobs(state.filters, true);
          }
        },

        // Comments
        loadComments: async (jobId: string) => {
          const supabase = createClient();
          try {
            const { data, error } = await supabase
              .from('job_comments')
              .select('*')
              .eq('job_id', jobId)
              .order('created_at', { ascending: false });

            if (error) throw error;

            set((state) => {
              state.comments[jobId] = data || [];
            });
          } catch (error) {
            console.error('Failed to load comments:', error);
          }
        },

        addComment: async (jobId: string, content: string, isInternal = false) => {
          const supabase = createClient();
          const { data: userData } = await supabase.auth.getUser();

          try {
            const { data, error } = await supabase
              .from('job_comments')
              .insert({
                job_id: jobId,
                user_id: userData?.user?.id,
                user_name: userData?.user?.email || 'Unknown',
                content,
                is_internal: isInternal,
                created_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (error) throw error;

            set((state) => {
              if (!state.comments[jobId]) {
                state.comments[jobId] = [];
              }
              state.comments[jobId].unshift(data);
            });
          } catch (error) {
            console.error('Failed to add comment:', error);
          }
        },

        // History
        loadHistory: async (jobId: string) => {
          const supabase = createClient();
          try {
            const { data, error } = await supabase
              .from('job_history')
              .select('*')
              .eq('job_id', jobId)
              .order('performed_at', { ascending: false });

            if (error) throw error;

            set((state) => {
              state.history[jobId] = data || [];
            });
          } catch (error) {
            console.error('Failed to load history:', error);
          }
        },

        addHistory: async (jobId: string, action: string, changes?: any, notes?: string) => {
          const supabase = createClient();
          const { data: userData } = await supabase.auth.getUser();

          try {
            const { data, error } = await supabase
              .from('job_history')
              .insert({
                job_id: jobId,
                action,
                changes,
                performed_by: userData?.user?.id,
                performed_at: new Date().toISOString(),
                notes,
              })
              .select()
              .single();

            if (error) throw error;

            set((state) => {
              if (!state.history[jobId]) {
                state.history[jobId] = [];
              }
              state.history[jobId].unshift(data);
            });
          } catch (error) {
            console.error('Failed to add history:', error);
          }
        },

        // Metrics
        loadMetrics: async () => {
          const supabase = createClient();
          try {
            // Get job counts by status
            const { data: statusCounts } = await supabase
              .from('jobs')
              .select('status', { count: 'exact' });

            // Get job counts by priority
            const { data: priorityCounts } = await supabase
              .from('jobs')
              .select('priority', { count: 'exact' });

            // Calculate metrics
            const metrics: JobMetrics = {
              total_jobs: statusCounts?.length || 0,
              jobs_by_status: {},
              jobs_by_priority: {},
              average_completion_time: 0,
              on_time_completion_rate: 0,
              customer_satisfaction_score: 0,
              revenue_generated: 0,
              upcoming_jobs_today: 0,
              overdue_jobs: 0,
              unassigned_jobs: 0,
            };

            set((state) => {
              state.metrics = metrics;
            });
          } catch (error) {
            console.error('Failed to load metrics:', error);
          }
        },

        // Real-time Subscriptions
        subscribeToChanges: () => {
          const supabase = createClient();

          const subscription = supabase
            .channel('jobs_changes')
            .on('postgres_changes', {
              event: '*',
              schema: 'public',
              table: 'jobs',
            }, (payload) => {
              if (payload.eventType === 'INSERT') {
                set((state) => {
                  state.jobs[payload.new.id] = payload.new as Job;
                  state.jobsList.unshift(payload.new.id);
                });
              } else if (payload.eventType === 'UPDATE') {
                set((state) => {
                  state.jobs[payload.new.id] = payload.new as Job;
                });
              } else if (payload.eventType === 'DELETE') {
                set((state) => {
                  delete state.jobs[payload.old.id];
                  state.jobsList = state.jobsList.filter(id => id !== payload.old.id);
                });
              }
            })
            .subscribe();

          set((state) => {
            state.subscription = subscription;
          });
        },

        unsubscribeFromChanges: () => {
          const state = get();
          if (state.subscription) {
            state.subscription.unsubscribe();
            set((state) => {
              state.subscription = null;
            });
          }
        },

        // Cache Management
        invalidateCache: () => {
          set((state) => {
            state.lastFetch = 0;
          });
        },

        // Reset Store
        reset: () => {
          get().unsubscribeFromChanges();
          set((state) => {
            state.jobs = {};
            state.jobsList = [];
            state.activeJob = null;
            state.filters = {};
            state.metrics = null;
            state.comments = {};
            state.history = {};
            state.isLoading = false;
            state.isCreating = false;
            state.isUpdating = false;
            state.error = null;
            state.searchQuery = '';
            state.selectedJobs = new Set();
            state.page = 1;
            state.lastFetch = 0;
          });
        },
      })),
      {
        name: 'job-store',
        partialize: (state) => ({
          filters: state.filters,
          viewMode: state.viewMode,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          pageSize: state.pageSize,
        }),
      }
    ),
    {
      name: 'job-store',
    }
  )
);