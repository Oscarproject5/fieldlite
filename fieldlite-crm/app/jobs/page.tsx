'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  List,
  Grid3x3,
  Calendar,
  Map,
  Download,
  Upload,
  RefreshCw,
  Settings,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Clock
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { VirtualizedJobList } from '@/components/jobs/VirtualizedJobList';
import { AdvancedJobSearch } from '@/components/jobs/AdvancedJobSearch';
import { useJobStore } from '@/stores/jobStore';
import type { Job, JobFilters } from '@/types/jobs';
import { cn } from '@/lib/utils';

// Metrics Card Component
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: string;
}> = ({ title, value, change, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change !== undefined && (
              <p className={cn(
                'text-xs',
                change >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from last month
              </p>
            )}
          </div>
          <div className={cn('p-3 rounded-lg', colorClasses[color as keyof typeof colorClasses])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function JobsPage() {
  const {
    jobs,
    jobsList,
    isLoading,
    error,
    filters,
    metrics,
    selectedJobs,
    viewMode,
    sortBy,
    sortOrder,
    loadJobs,
    loadMetrics,
    setViewMode,
    setSortBy,
    toggleSortOrder,
    selectAllJobs,
    clearSelection,
    bulkUpdateJobs,
    subscribeToChanges,
    unsubscribeFromChanges,
  } = useJobStore();

  const [bulkAction, setBulkAction] = useState('');
  const [isCreatingJob, setIsCreatingJob] = useState(false);

  useEffect(() => {
    // Load initial data
    loadJobs();
    loadMetrics();

    // Subscribe to real-time changes
    subscribeToChanges();

    // Cleanup
    return () => {
      unsubscribeFromChanges();
    };
  }, []);

  const handleJobClick = useCallback((job: Job) => {
    // Navigate to job detail page
    window.location.href = `/jobs/${job.id}`;
  }, []);

  const handleJobAction = useCallback(async (job: Job, action: string) => {
    switch (action) {
      case 'view':
        window.location.href = `/jobs/${job.id}`;
        break;
      case 'edit':
        window.location.href = `/jobs/${job.id}/edit`;
        break;
      case 'delete':
        // Implement delete confirmation
        if (confirm(`Are you sure you want to delete job ${job.job_number}?`)) {
          await useJobStore.getState().deleteJob(job.id);
        }
        break;
      case 'start':
        await useJobStore.getState().updateJob(job.id, {
          status: 'in_progress',
          actual_start: new Date()
        });
        break;
      case 'complete':
        await useJobStore.getState().updateJob(job.id, {
          status: 'completed',
          actual_end: new Date(),
          completed_at: new Date()
        });
        break;
      default:
        console.log(`Action ${action} for job ${job.id}`);
    }
  }, []);

  const handleBulkAction = async () => {
    if (!bulkAction || selectedJobs.size === 0) return;

    const selectedJobIds = Array.from(selectedJobs);

    switch (bulkAction) {
      case 'delete':
        if (confirm(`Delete ${selectedJobs.size} selected jobs?`)) {
          for (const jobId of selectedJobIds) {
            await useJobStore.getState().deleteJob(jobId);
          }
        }
        break;
      case 'complete':
        await bulkUpdateJobs(selectedJobIds, {
          status: 'completed',
          completed_at: new Date()
        });
        break;
      case 'assign':
        // Open assignment modal
        console.log('Assign jobs:', selectedJobIds);
        break;
      case 'export':
        // Export selected jobs
        console.log('Export jobs:', selectedJobIds);
        break;
    }

    clearSelection();
    setBulkAction('');
  };

  const handleRefresh = () => {
    loadJobs(filters);
    loadMetrics();
  };

  // Get jobs array from the normalized store
  const jobsArray = jobsList.map(id => jobs[id]).filter(Boolean);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Briefcase className="h-8 w-8" />
              Jobs
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage and track all service jobs
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => setIsCreatingJob(true)}
              className="bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </div>
        </div>

        {/* Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Total Jobs"
            value={metrics?.total_jobs || 0}
            change={12}
            icon={<Calendar className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="In Progress"
            value={metrics?.jobs_by_status?.in_progress || 0}
            icon={<Clock className="h-6 w-6" />}
            color="yellow"
          />
          <MetricCard
            title="Completed Today"
            value={metrics?.jobs_by_status?.completed || 0}
            change={8}
            icon={<CheckCircle className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="Overdue"
            value={metrics?.overdue_jobs || 0}
            change={-15}
            icon={<AlertCircle className="h-6 w-6" />}
            color="red"
          />
        </div>

        {/* Search and Filters */}
        <AdvancedJobSearch className="mb-4" />

        {/* Bulk Actions Bar */}
        {selectedJobs.size > 0 && (
          <div className="flex items-center justify-between p-3 mb-4 bg-accent rounded-lg">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedJobs.size === jobsList.length}
                onCheckedChange={(checked) => {
                  if (checked) {
                    selectAllJobs();
                  } else {
                    clearSelection();
                  }
                }}
              />
              <span className="text-sm font-medium">
                {selectedJobs.size} job{selectedJobs.size !== 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Bulk actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assign">Assign to Team</SelectItem>
                  <SelectItem value="complete">Mark as Complete</SelectItem>
                  <SelectItem value="export">Export Selected</SelectItem>
                  <SelectItem value="delete">Delete Selected</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                size="sm"
              >
                Apply
              </Button>
            </div>
          </div>
        )}

        {/* View Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border p-1">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('calendar')}
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'map' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('map')}
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-8" />

            <Select
              value={sortBy}
              onValueChange={(value: any) => setSortBy(value)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSortOrder}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {jobsList.length} of {metrics?.total_jobs || 0} jobs
          </div>
        </div>

        {/* Jobs List/Grid/Calendar/Map View */}
        <div className="flex-1 overflow-hidden">
          {error && (
            <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-lg">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="space-y-4 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Loading jobs...</p>
              </div>
            </div>
          ) : (
            <>
              {viewMode === 'list' && (
                <VirtualizedJobList
                  jobs={jobsArray}
                  viewMode="compact"
                  onJobClick={handleJobClick}
                  onJobAction={handleJobAction}
                  className="h-full"
                />
              )}

              {viewMode === 'grid' && (
                <VirtualizedJobList
                  jobs={jobsArray}
                  viewMode="detailed"
                  onJobClick={handleJobClick}
                  onJobAction={handleJobAction}
                  className="h-full"
                />
              )}

              {viewMode === 'calendar' && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Calendar View</h3>
                      <p className="text-muted-foreground">
                        Calendar view will be implemented here
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {viewMode === 'map' && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <Map className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Map View</h3>
                      <p className="text-muted-foreground">
                        Map view will show job locations
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {metrics?.on_time_completion_rate || 0}%
              </p>
              <p className="text-xs text-muted-foreground">On-Time Completion</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {metrics?.average_completion_time || 0}h
              </p>
              <p className="text-xs text-muted-foreground">Avg Completion Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                ${metrics?.revenue_generated || 0}
              </p>
              <p className="text-xs text-muted-foreground">Revenue This Month</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {metrics?.customer_satisfaction_score || 0}/5
              </p>
              <p className="text-xs text-muted-foreground">Customer Satisfaction</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}