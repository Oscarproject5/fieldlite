'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, Filter, X, Calendar, MapPin, User, Tag, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { JobFilters, JobStatus, JobPriority, JobType } from '@/types/jobs';
import { useJobStore } from '@/stores/jobStore';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface AdvancedJobSearchProps {
  onFiltersChange?: (filters: JobFilters) => void;
  className?: string;
}

export const AdvancedJobSearch: React.FC<AdvancedJobSearchProps> = ({
  onFiltersChange,
  className,
}) => {
  const { filters, setFilters, clearFilters, searchJobs } = useJobStore();
  const [localFilters, setLocalFilters] = useState<JobFilters>(filters);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: filters.date_range?.start,
    to: filters.date_range?.end,
  });
  const [locationRadius, setLocationRadius] = useState(filters.location?.radius || 10);

  const debouncedSearch = useDebounce(searchInput, 300);

  // Status options
  const statusOptions: JobStatus[] = ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'];

  // Priority options
  const priorityOptions: JobPriority[] = ['low', 'medium', 'high', 'urgent'];

  // Type options
  const typeOptions: JobType[] = ['installation', 'maintenance', 'repair', 'inspection', 'consultation', 'emergency', 'other'];

  // Payment status options
  const paymentStatusOptions = ['pending', 'partial', 'paid', 'overdue'];

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      searchJobs(debouncedSearch);
    }
  }, [debouncedSearch, searchJobs, filters.search]);

  const handleStatusChange = (status: JobStatus, checked: boolean) => {
    const newStatuses = checked
      ? [...(localFilters.status || []), status]
      : (localFilters.status || []).filter(s => s !== status);

    updateLocalFilter('status', newStatuses.length ? newStatuses : undefined);
  };

  const handlePriorityChange = (priority: JobPriority, checked: boolean) => {
    const newPriorities = checked
      ? [...(localFilters.priority || []), priority]
      : (localFilters.priority || []).filter(p => p !== priority);

    updateLocalFilter('priority', newPriorities.length ? newPriorities : undefined);
  };

  const handleTypeChange = (type: JobType, checked: boolean) => {
    const newTypes = checked
      ? [...(localFilters.type || []), type]
      : (localFilters.type || []).filter(t => t !== type);

    updateLocalFilter('type', newTypes.length ? newTypes : undefined);
  };

  const handlePaymentStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked
      ? [...(localFilters.payment_status || []), status]
      : (localFilters.payment_status || []).filter(s => s !== status);

    updateLocalFilter('payment_status', newStatuses.length ? newStatuses : undefined);
  };

  const updateLocalFilter = (key: keyof JobFilters, value: any) => {
    const updated = { ...localFilters, [key]: value };
    if (value === undefined) {
      delete updated[key];
    }
    setLocalFilters(updated);
  };

  const applyFilters = () => {
    const finalFilters = { ...localFilters };

    if (dateRange.from && dateRange.to) {
      finalFilters.date_range = {
        start: dateRange.from,
        end: dateRange.to,
      };
    }

    setFilters(finalFilters);
    onFiltersChange?.(finalFilters);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    setLocalFilters({});
    setSearchInput('');
    setDateRange({ from: undefined, to: undefined });
    setLocationRadius(10);
    clearFilters();
    onFiltersChange?.({});
  };

  const activeFilterCount = Object.keys(localFilters).filter(
    key => key !== 'search' && localFilters[key as keyof JobFilters] !== undefined
  ).length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search jobs by title, description, or customer..."
            className="pl-10"
          />
        </div>

        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[600px] p-0" align="end">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Advanced Filters</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-muted-foreground"
                >
                  Reset All
                </Button>
              </div>
            </div>

            <Tabs defaultValue="status" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b h-auto p-0">
                <TabsTrigger value="status" className="rounded-none">Status</TabsTrigger>
                <TabsTrigger value="schedule" className="rounded-none">Schedule</TabsTrigger>
                <TabsTrigger value="assignment" className="rounded-none">Assignment</TabsTrigger>
                <TabsTrigger value="financial" className="rounded-none">Financial</TabsTrigger>
                <TabsTrigger value="location" className="rounded-none">Location</TabsTrigger>
              </TabsList>

              <div className="p-4 max-h-[400px] overflow-y-auto">
                <TabsContent value="status" className="space-y-4 mt-0">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Job Status</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {statusOptions.map(status => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={localFilters.status?.includes(status) || false}
                            onCheckedChange={(checked) => handleStatusChange(status, !!checked)}
                          />
                          <Label
                            htmlFor={`status-${status}`}
                            className="text-sm font-normal cursor-pointer capitalize"
                          >
                            {status.replace('_', ' ')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Priority</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {priorityOptions.map(priority => (
                        <div key={priority} className="flex items-center space-x-2">
                          <Checkbox
                            id={`priority-${priority}`}
                            checked={localFilters.priority?.includes(priority) || false}
                            onCheckedChange={(checked) => handlePriorityChange(priority, !!checked)}
                          />
                          <Label
                            htmlFor={`priority-${priority}`}
                            className="text-sm font-normal cursor-pointer capitalize"
                          >
                            {priority}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Job Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {typeOptions.map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`type-${type}`}
                            checked={localFilters.type?.includes(type) || false}
                            onCheckedChange={(checked) => handleTypeChange(type, !!checked)}
                          />
                          <Label
                            htmlFor={`type-${type}`}
                            className="text-sm font-normal cursor-pointer capitalize"
                          >
                            {type}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="schedule" className="space-y-4 mt-0">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Date Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start">
                            <Calendar className="h-4 w-4 mr-2" />
                            {dateRange.from ? format(dateRange.from, 'PP') : 'From date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={dateRange.from}
                            onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start">
                            <Calendar className="h-4 w-4 mr-2" />
                            {dateRange.to ? format(dateRange.to, 'PP') : 'To date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={dateRange.to}
                            onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                            disabled={(date) => dateRange.from ? date < dateRange.from : false}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Quick Ranges</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = new Date();
                          setDateRange({ from: today, to: today });
                        }}
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = new Date();
                          const tomorrow = new Date(today);
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          setDateRange({ from: today, to: tomorrow });
                        }}
                      >
                        Tomorrow
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = new Date();
                          const nextWeek = new Date(today);
                          nextWeek.setDate(nextWeek.getDate() + 7);
                          setDateRange({ from: today, to: nextWeek });
                        }}
                      >
                        Next 7 Days
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = new Date();
                          const nextMonth = new Date(today);
                          nextMonth.setMonth(nextMonth.getMonth() + 1);
                          setDateRange({ from: today, to: nextMonth });
                        }}
                      >
                        Next 30 Days
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="assignment" className="space-y-4 mt-0">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Assigned To</Label>
                    <Select
                      value={localFilters.assigned_to?.[0] || ''}
                      onValueChange={(value) => updateLocalFilter('assigned_to', value ? [value] : undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Members</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        <SelectItem value="user1">John Doe</SelectItem>
                        <SelectItem value="user2">Jane Smith</SelectItem>
                        <SelectItem value="user3">Bob Johnson</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Team</Label>
                    <Select
                      value={localFilters.team_id || ''}
                      onValueChange={(value) => updateLocalFilter('team_id', value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Teams</SelectItem>
                        <SelectItem value="team1">Installation Team</SelectItem>
                        <SelectItem value="team2">Maintenance Team</SelectItem>
                        <SelectItem value="team3">Emergency Response</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="space-y-4 mt-0">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Payment Status</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentStatusOptions.map(status => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`payment-${status}`}
                            checked={localFilters.payment_status?.includes(status) || false}
                            onCheckedChange={(checked) => handlePaymentStatusChange(status, !!checked)}
                          />
                          <Label
                            htmlFor={`payment-${status}`}
                            className="text-sm font-normal cursor-pointer capitalize"
                          >
                            {status}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Cost Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min cost"
                        value={localFilters.min_cost || ''}
                        onChange={(e) => updateLocalFilter('min_cost', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      <Input
                        type="number"
                        placeholder="Max cost"
                        value={localFilters.max_cost || ''}
                        onChange={(e) => updateLocalFilter('max_cost', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="location" className="space-y-4 mt-0">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Search Radius: {locationRadius} km
                    </Label>
                    <Slider
                      value={[locationRadius]}
                      onValueChange={([value]) => setLocationRadius(value)}
                      min={1}
                      max={100}
                      step={1}
                      className="mb-4"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">City</Label>
                    <Input
                      placeholder="Enter city name"
                      value={localFilters.city || ''}
                      onChange={(e) => updateLocalFilter('city', e.target.value || undefined)}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">State</Label>
                    <Input
                      placeholder="Enter state"
                      value={localFilters.state || ''}
                      onChange={(e) => updateLocalFilter('state', e.target.value || undefined)}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Postal Code</Label>
                    <Input
                      placeholder="Enter postal code"
                      value={localFilters.postal_code || ''}
                      onChange={(e) => updateLocalFilter('postal_code', e.target.value || undefined)}
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <div className="p-4 border-t bg-muted/50">
              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={() => setIsFilterOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={applyFilters}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {Object.keys(filters).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="pl-2">
              <Search className="h-3 w-3 mr-1" />
              {filters.search}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 hover:bg-transparent"
                onClick={() => {
                  setSearchInput('');
                  searchJobs('');
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.status?.map(status => (
            <Badge key={status} variant="secondary" className="pl-2">
              Status: {status.replace('_', ' ')}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 hover:bg-transparent"
                onClick={() => {
                  const newStatuses = filters.status?.filter(s => s !== status);
                  setFilters({ ...filters, status: newStatuses?.length ? newStatuses : undefined });
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}

          {filters.priority?.map(priority => (
            <Badge key={priority} variant="secondary" className="pl-2">
              Priority: {priority}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 hover:bg-transparent"
                onClick={() => {
                  const newPriorities = filters.priority?.filter(p => p !== priority);
                  setFilters({ ...filters, priority: newPriorities?.length ? newPriorities : undefined });
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}

          {filters.date_range && (
            <Badge variant="secondary" className="pl-2">
              <Calendar className="h-3 w-3 mr-1" />
              {format(filters.date_range.start, 'MMM d')} - {format(filters.date_range.end, 'MMM d')}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 hover:bg-transparent"
                onClick={() => {
                  setFilters({ ...filters, date_range: undefined });
                  setDateRange({ from: undefined, to: undefined });
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-6 text-xs"
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};