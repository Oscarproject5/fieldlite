'use client';

import React, { useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Phone,
  Mail
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Job, JobStatus, JobPriority } from '@/types/jobs';
import { getJobStatusColor, getJobPriorityColor, isJobOverdue } from '@/types/jobs';
import { useJobStore } from '@/stores/jobStore';

interface VirtualizedJobListProps {
  jobs: Job[];
  viewMode?: 'compact' | 'detailed';
  onJobClick?: (job: Job) => void;
  onJobAction?: (job: Job, action: string) => void;
  className?: string;
}

const JobCard: React.FC<{
  job: Job;
  isSelected: boolean;
  viewMode: 'compact' | 'detailed';
  onSelect: (id: string, checked: boolean) => void;
  onClick: () => void;
  onAction: (action: string) => void;
}> = ({ job, isSelected, viewMode, onSelect, onClick, onAction }) => {
  const isOverdue = isJobOverdue(job);

  const statusIcon = {
    draft: <AlertCircle className="h-4 w-4" />,
    scheduled: <Calendar className="h-4 w-4" />,
    in_progress: <Clock className="h-4 w-4 animate-pulse" />,
    completed: <CheckCircle className="h-4 w-4" />,
    cancelled: <XCircle className="h-4 w-4" />,
    on_hold: <AlertCircle className="h-4 w-4" />,
  }[job.status];

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  if (viewMode === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors cursor-pointer rounded-lg',
          isSelected && 'bg-accent',
          isOverdue && 'border-l-4 border-red-500'
        )}
        onClick={onClick}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(job.id, !!checked)}
          onClick={(e) => e.stopPropagation()}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {statusIcon}
            <span className="font-medium truncate">{job.title}</span>
            <Badge variant="outline" className={priorityColors[job.priority]}>
              {job.priority}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {job.customer_name}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(job.scheduled_start), 'MMM d, h:mm a')}
            </span>
            {job.address && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />
                {job.address.city}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isOverdue ? 'destructive' : 'secondary'}>
            {job.status.replace('_', ' ')}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction('view')}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('edit')}>
                Edit Job
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('assign')}>
                Assign Team
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('schedule')}>
                Reschedule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onAction('delete')}
                className="text-destructive"
              >
                Delete Job
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // Detailed view
  return (
    <Card
      className={cn(
        'p-4 hover:shadow-lg transition-shadow cursor-pointer',
        isSelected && 'ring-2 ring-primary',
        isOverdue && 'border-red-500'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(job.id, !!checked)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{job.title}</h3>
              <Badge variant="outline" className={priorityColors[job.priority]}>
                {job.priority}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Job #{job.job_number}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={isOverdue ? 'destructive' : 'secondary'}
            className="flex items-center gap-1"
          >
            {statusIcon}
            {job.status.replace('_', ' ')}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction('start')}>
                Start Job
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('complete')}>
                Mark Complete
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('message')}>
                Message Customer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction('view')}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('edit')}>
                Edit Job
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {job.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {job.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium">{job.customer_name}</p>
            {job.customer_phone && (
              <p className="text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {job.customer_phone}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium">{job.address.street}</p>
            <p className="text-muted-foreground">
              {job.address.city}, {job.address.state} {job.address.postal_code}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {format(new Date(job.scheduled_start), 'MMM d, yyyy')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {format(new Date(job.scheduled_start), 'h:mm a')} -
            {format(new Date(job.scheduled_end), 'h:mm a')}
          </span>
        </div>

        {job.estimated_cost && (
          <span className="flex items-center gap-1 font-medium">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            ${job.estimated_cost.toFixed(2)}
          </span>
        )}
      </div>

      {job.assigned_to && job.assigned_to.length > 0 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <span className="text-sm text-muted-foreground">Assigned to:</span>
          <div className="flex -space-x-2">
            {job.assigned_to.slice(0, 3).map((userId, idx) => (
              <div
                key={userId}
                className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium border-2 border-background"
              >
                {userId.substring(0, 2).toUpperCase()}
              </div>
            ))}
            {job.assigned_to.length > 3 && (
              <div className="h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium border-2 border-background">
                +{job.assigned_to.length - 3}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export const VirtualizedJobList: React.FC<VirtualizedJobListProps> = ({
  jobs,
  viewMode = 'compact',
  onJobClick,
  onJobAction,
  className,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const { selectedJobs, selectJob, deselectJob } = useJobStore();

  const virtualizer = useVirtualizer({
    count: jobs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => (viewMode === 'compact' ? 80 : 200), [viewMode]),
    overscan: 5,
  });

  const handleSelect = useCallback((jobId: string, checked: boolean) => {
    if (checked) {
      selectJob(jobId);
    } else {
      deselectJob(jobId);
    }
  }, [selectJob, deselectJob]);

  const handleJobClick = useCallback((job: Job) => {
    onJobClick?.(job);
  }, [onJobClick]);

  const handleJobAction = useCallback((job: Job, action: string) => {
    onJobAction?.(job, action);
  }, [onJobAction]);

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn('h-full overflow-auto', className)}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualItem) => {
          const job = jobs[virtualItem.index];
          const isSelected = selectedJobs.has(job.id);

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="px-4 py-2">
                <JobCard
                  job={job}
                  isSelected={isSelected}
                  viewMode={viewMode}
                  onSelect={handleSelect}
                  onClick={() => handleJobClick(job)}
                  onAction={(action) => handleJobAction(job, action)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};