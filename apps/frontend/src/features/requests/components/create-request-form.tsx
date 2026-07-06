import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Loader2, Droplets, Shield, Pill, Stethoscope } from 'lucide-react';

import {
  useCreateRequest,
  useAvailableInventory,
} from '@/features/requests/hooks/use-requests';
import { useFacilities } from '@/features/facilities/hooks/use-facilities';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ResourceType } from '@/types';

const schema = z.object({
  supplyingFacilityId: z.string().min(1, 'Please select a supplying facility'),
  resourceType: z.enum(['BLOOD', 'PPE', 'MEDICATION', 'MEDICAL_EQUIPMENT']),
  itemName: z.string().min(2).max(255),
  quantity: z.coerce.number().int().positive(),
  unit: z.enum([
    'UNITS',
    'TABLETS',
    'CAPSULES',
    'VIALS',
    'BOXES',
    'PACKS',
    'PIECES',
    'BOTTLES',
  ]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().min(5).max(1000),
});

type CreateRequestForm = z.infer<typeof schema>;

const RESOURCE_TYPES: {
  value: ResourceType;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: 'BLOOD', label: 'Blood', icon: Droplets },
  { value: 'PPE', label: 'PPE', icon: Shield },
  { value: 'MEDICATION', label: 'Medicine', icon: Pill },
  { value: 'MEDICAL_EQUIPMENT', label: 'Equipment', icon: Stethoscope },
];

const FACILITY_TYPE_LABELS: Record<string, string> = {
  HOSPITAL: 'Hospital',
  PHARMACY: 'Pharmacy',
  BLOOD_BANK: 'Blood Bank',
  PPE_SUPPLIER: 'PPE Supplier',
};

interface CreateRequestFormProps {
  onSuccess?: () => void;
}

export function CreateRequestForm({ onSuccess }: CreateRequestFormProps) {
  const navigate = useNavigate();
  const createRequest = useCreateRequest();
  const { data: facilities = [], isLoading: facilitiesLoading } =
    useFacilities();
  const currentUser = useAuthStore((s) => s.user);

  // Exclude the user's own facility from the supplier list
  const supplierOptions = facilities.filter(
    (f) => f.id !== currentUser?.facilityId && f.status === 'ACTIVE'
  );

  const { state } = useLocation() as {
    state?: {
      supplyingFacilityId?: string;
      resourceType?: ResourceType;
      itemName?: string;
      quantity?: number;
      unit?: string;
      description?: string;
    };
  };

  const form = useForm<CreateRequestForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      resourceType: state?.resourceType ?? 'BLOOD',
      supplyingFacilityId: state?.supplyingFacilityId ?? '',
      itemName: state?.itemName ?? '',
      priority: 'MEDIUM',
      unit: (state?.unit as any) ?? 'UNITS',
      quantity: state?.quantity ?? 1,
      description: state?.description ?? '',
    },
  });

  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  const onSubmit = async (data: CreateRequestForm) => {
    if (data.supplyingFacilityId) {
      const itemExists = availableItems.some(
        (item) => item.itemName.toLowerCase() === data.itemName.toLowerCase()
      );
      if (!itemExists) {
        form.setError('itemName', {
          type: 'manual',
          message: 'The selected item is not available at this facility.',
        });
        return;
      }
    }

    await createRequest.mutateAsync(
      data as Parameters<typeof createRequest.mutateAsync>[0]
    );
    onSuccess?.();
    navigate('/requests');
  };

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedType = form.watch('resourceType');
  const selectedFacilityId = form.watch('supplyingFacilityId');

  const { data: availableItems = [], isLoading: inventoryLoading } =
    useAvailableInventory(selectedFacilityId, selectedType);

  const selectedItemName = form.watch('itemName');
  const selectedItem = availableItems.find(
    (item) => item.itemName === selectedItemName
  );

  const filteredItems = availableItems.filter((item) =>
    item.itemName.toLowerCase().includes((selectedItemName || '').toLowerCase())
  );

  // Reset itemName and unit when facility or resource type changes, skipping pre-populated values on mount
  const [initialFacility] = useState(state?.supplyingFacilityId ?? '');
  const [initialResourceType] = useState(state?.resourceType ?? '');
  const [isFirstRun, setIsFirstRun] = useState(true);

  useEffect(() => {
    if (isFirstRun) {
      setIsFirstRun(false);
      if (selectedFacilityId === initialFacility && selectedType === initialResourceType) {
        return;
      }
    }
    form.setValue('itemName', '');
    form.setValue('unit', 'UNITS');
  }, [selectedFacilityId, selectedType, form]);

  // Auto-fill unit when item changes
  useEffect(() => {
    if (selectedItem) {
      form.setValue('unit', selectedItem.unit);
    }
  }, [selectedItem, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Resource type selector */}
        <FormField
          control={form.control}
          name="resourceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Resource Type</FormLabel>
              <FormControl>
                <div className="grid grid-cols-4 gap-3">
                  {RESOURCE_TYPES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                        selectedType === value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Supplying facility — searchable dropdown */}
          <FormField
            control={form.control}
            name="supplyingFacilityId"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Supplying Facility</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={facilitiesLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          facilitiesLoading
                            ? 'Loading facilities...'
                            : 'Select a facility to request from'
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {supplierOptions.length === 0 ? (
                      <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                        No other active facilities found
                      </div>
                    ) : (
                      supplierOptions.map((facility) => (
                        <SelectItem key={facility.id} value={facility.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{facility.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {FACILITY_TYPE_LABELS[facility.type] ??
                                facility.type}{' '}
                              · {facility.district}, {facility.region}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="itemName"
            render={({ field }) => (
              <FormItem className="relative">
                <FormLabel>Item Name</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      placeholder={
                        !selectedFacilityId
                          ? 'Select a supplying facility first'
                          : 'Type or select an item...'
                      }
                      {...field}
                      disabled={!selectedFacilityId}
                      onFocus={() => setIsSuggestionsOpen(true)}
                      onBlur={() => setIsSuggestionsOpen(false)}
                      autoComplete="off"
                    />
                  </FormControl>
                  {isSuggestionsOpen && selectedFacilityId && (
                    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
                      {inventoryLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredItems.length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                          No matching items found
                        </div>
                      ) : (
                        filteredItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="flex w-full items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-sm text-left outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer select-none transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              field.onChange(item.itemName);
                              setIsSuggestionsOpen(false);
                            }}
                          >
                            <span>{item.itemName}</span>
                            <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded font-mono">
                              {item.quantity} {item.unit.toLowerCase()}{' '}
                              available
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {selectedItem && (
                  <p className="text-xs text-emerald-600 font-medium">
                    Available stock: {selectedItem.quantity}{' '}
                    {selectedItem.unit.toLowerCase()}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!!selectedFacilityId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[
                        'UNITS',
                        'TABLETS',
                        'CAPSULES',
                        'VIALS',
                        'BOXES',
                        'PACKS',
                        'PIECES',
                        'BOTTLES',
                      ].map((u) => (
                        <SelectItem key={u} value={u}>
                          {u.charAt(0) + u.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[
                      { value: 'LOW', label: 'Low' },
                      { value: 'MEDIUM', label: 'Medium' },
                      { value: 'HIGH', label: 'High' },
                      { value: 'CRITICAL', label: 'Critical' },
                    ].map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Provide context for this request..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/requests')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createRequest.isPending}>
            {createRequest.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
