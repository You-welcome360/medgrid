import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Loader2, Droplets, Shield, Pill, Stethoscope } from 'lucide-react';

import { useAuthStore } from '@/stores/auth.store';
import { useFacility } from '@/features/facilities/hooks/use-facilities';
import {
  useCreateInventoryItem,
  useRecordMovement,
} from '@/features/inventory/hooks/use-inventory';
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ResourceType } from '@/types';

// ============================================================
// Schema
// ============================================================

const baseSchema = z.object({
  resourceType: z.enum(['BLOOD', 'PPE', 'MEDICATION', 'MEDICAL_EQUIPMENT']),
  itemName: z.string().min(2).max(255),
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

  price: z.coerce.number().min(0).optional(),
  isMovable: z.boolean().optional(),

  // Opening stock (optional)
  openingStock: z.coerce.number().int().min(0).optional(),
  openingStockReason: z.string().max(500).optional(),

  // Blood metadata
  bloodGroup: z.string().optional(),
  collectionDate: z.string().optional(),
  bloodExpiryDate: z.string().optional(),

  // Medication metadata
  dosageForm: z.string().optional(),
  strength: z.string().optional(),
  manufacturer: z.string().optional(),
  batchNumber: z.string().optional(),
  medExpiryDate: z.string().optional(),

  // PPE metadata
  ppeSize: z.string().optional(),
  ppeManufacturer: z.string().optional(),
  modelNumber: z.string().optional(),

  // Equipment metadata
  eqManufacturer: z.string().optional(),
  eqModelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
});

type CreateInventoryForm = z.infer<typeof baseSchema>;

const FACILITY_RESOURCE_ACCESS = {
  HOSPITAL: ['BLOOD', 'PPE', 'MEDICATION', 'MEDICAL_EQUIPMENT'],
  BLOOD_BANK: ['BLOOD'],
  PHARMACY: ['MEDICATION'],
  PPE_SUPPLIER: ['PPE', 'MEDICAL_EQUIPMENT'],
} as const;

// ============================================================
// Resource type options
// ============================================================

const RESOURCE_TYPES: {
  value: ResourceType;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: 'BLOOD', label: 'Blood', icon: Droplets },
  { value: 'MEDICATION', label: 'Medication', icon: Pill },
  { value: 'PPE', label: 'PPE', icon: Shield },
  { value: 'MEDICAL_EQUIPMENT', label: 'Equipment', icon: Stethoscope },
];

const BLOOD_GROUPS = [
  { value: 'A_POSITIVE', label: 'A+' },
  { value: 'A_NEGATIVE', label: 'A−' },
  { value: 'B_POSITIVE', label: 'B+' },
  { value: 'B_NEGATIVE', label: 'B−' },
  { value: 'AB_POSITIVE', label: 'AB+' },
  { value: 'AB_NEGATIVE', label: 'AB−' },
  { value: 'O_POSITIVE', label: 'O+' },
  { value: 'O_NEGATIVE', label: 'O−' },
];

const UNITS = [
  'UNITS',
  'TABLETS',
  'CAPSULES',
  'VIALS',
  'BOXES',
  'PACKS',
  'PIECES',
  'BOTTLES',
] as const;

// ============================================================
// Metadata sections
// ============================================================

function BloodMetadata({
  form,
}: {
  form: UseFormReturn<CreateInventoryForm>;
}) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="bloodGroup"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Blood Group <span className="text-destructive">*</span>
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {BLOOD_GROUPS.map((bg) => (
                  <SelectItem key={bg.value} value={bg.value}>
                    {bg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="collectionDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Collection Date <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bloodExpiryDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Expiry Date <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

function MedicationMetadata({
  form,
}: {
  form: UseFormReturn<CreateInventoryForm>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="dosageForm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Dosage Form <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. Tablet, Capsule" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="strength"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Strength <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. 500mg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="manufacturer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Manufacturer <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="batchNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Batch Number <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="medExpiryDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Expiry Date <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function PPEMetadata({
  form,
}: {
  form: UseFormReturn<CreateInventoryForm>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="ppeSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Size <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. Small, Medium, Large" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ppeManufacturer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Manufacturer <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="modelNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Model Number{' '}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function EquipmentMetadata({
  form,
}: {
  form: UseFormReturn<CreateInventoryForm>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="eqManufacturer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Manufacturer <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="eqModelNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Model Number <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="serialNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Serial Number <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// ============================================================
// Build metadata payload from form values
// ============================================================

function buildMetadata(data: CreateInventoryForm): Record<string, unknown> {
  switch (data.resourceType) {
    case 'BLOOD':
      return {
        bloodGroup: data.bloodGroup,
        collectionDate: data.collectionDate
          ? new Date(data.collectionDate).toISOString()
          : undefined,
        expiryDate: data.bloodExpiryDate
          ? new Date(data.bloodExpiryDate).toISOString()
          : undefined,
      };
    case 'MEDICATION':
      return {
        dosageForm: data.dosageForm,
        strength: data.strength,
        manufacturer: data.manufacturer,
        batchNumber: data.batchNumber,
        expiryDate: data.medExpiryDate
          ? new Date(data.medExpiryDate).toISOString()
          : undefined,
      };
    case 'PPE':
      return {
        size: data.ppeSize,
        manufacturer: data.ppeManufacturer,
        modelNumber: data.modelNumber,
      };
    case 'MEDICAL_EQUIPMENT':
      return {
        manufacturer: data.eqManufacturer,
        modelNumber: data.eqModelNumber,
        serialNumber: data.serialNumber,
      };
    default:
      return {};
  }
}

// ============================================================
// Main form
// ============================================================

export function CreateInventoryForm() {
  const navigate = useNavigate();
  const createItem = useCreateInventoryItem();
  const recordMovement = useRecordMovement();
  const { user } = useAuthStore();
  const { data: facility } = useFacility(user?.facilityId ?? '');

  const form = useForm<CreateInventoryForm>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      resourceType: 'BLOOD',
      unit: 'UNITS',
      openingStock: undefined,
      isMovable: true,
      price: undefined,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedType = form.watch('resourceType');
  const openingStock = form.watch('openingStock');

  const allowedTypes = (facility
    ? FACILITY_RESOURCE_ACCESS[facility.type as keyof typeof FACILITY_RESOURCE_ACCESS] || []
    : ['BLOOD', 'PPE', 'MEDICATION', 'MEDICAL_EQUIPMENT']) as readonly ResourceType[];

  const filteredResourceTypes = RESOURCE_TYPES.filter(({ value }) =>
    allowedTypes.includes(value)
  );

  // Set default resourceType once facility type is resolved
  useEffect(() => {
    if (facility && allowedTypes.length > 0 && !allowedTypes.includes(selectedType)) {
      form.setValue('resourceType', allowedTypes[0] as ResourceType);
    }
  }, [facility, allowedTypes, selectedType, form]);

  // Sync isMovable defaults based on resource type
  useEffect(() => {
    if (selectedType === 'MEDICAL_EQUIPMENT') {
      form.setValue('isMovable', false);
    } else {
      form.setValue('isMovable', true);
    }
  }, [selectedType, form]);

  const onSubmit = async (data: CreateInventoryForm) => {
    const item = await createItem.mutateAsync({
      resourceType: data.resourceType as ResourceType,
      itemName: data.itemName,
      unit: data.unit as Parameters<typeof createItem.mutateAsync>[0]['unit'],
      metadata: buildMetadata(data),
      price: data.price,
      isMovable: data.isMovable,
    });

    // If opening stock was provided, record a RESTOCK movement immediately
    const qty = Number(data.openingStock);
    if (item.data?.id && qty > 0) {
      await recordMovement.mutateAsync({
        id: item.data.id,
        quantity: qty,
        movementType: 'RESTOCK',
        reason: data.openingStockReason || 'Initial stock',
      });
    }

    navigate(item.data?.id ? `/inventory/${item.data.id}` : '/inventory');
  };

  const isSubmitting = createItem.isPending || recordMovement.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Resource type */}
        <div className="space-y-3">
          <FormLabel>Resource Type</FormLabel>
          <FormField
            control={form.control}
            name="resourceType"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="grid grid-cols-4 gap-3">
                    {filteredResourceTypes.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors text-sm',
                          selectedType === value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border text-muted-foreground hover:border-muted-foreground/50'

                        )}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Basic fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Item Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="itemName"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>
                    Item Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        selectedType === 'BLOOD'
                          ? 'e.g. Whole Blood A+'
                          : selectedType === 'MEDICATION'
                            ? 'e.g. Amoxicillin'
                            : selectedType === 'PPE'
                              ? 'e.g. N95 Respirator Mask'
                              : 'e.g. Portable Defibrillator'
                      }
                      {...field}
                    />
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
                  <FormLabel>
                    Unit <span className="text-destructive">*</span>
                  </FormLabel>
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
                      {UNITS.map((u) => (
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

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Unit Price{' '}
                    <span className="text-muted-foreground text-xs">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isMovable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shareability</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === 'true')}
                    value={field.value ? 'true' : 'false'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Movable (Can be shared)</SelectItem>
                      <SelectItem value="false">Immovable (Stationary)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Dynamic metadata */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">
            {selectedType === 'BLOOD' && 'Blood Details'}
            {selectedType === 'MEDICATION' && 'Medication Details'}
            {selectedType === 'PPE' && 'PPE Details'}
            {selectedType === 'MEDICAL_EQUIPMENT' && 'Equipment Details'}
          </h3>
          {selectedType === 'BLOOD' && <BloodMetadata form={form} />}
          {selectedType === 'MEDICATION' && <MedicationMetadata form={form} />}
          {selectedType === 'PPE' && <PPEMetadata form={form} />}
          {selectedType === 'MEDICAL_EQUIPMENT' && (
            <EquipmentMetadata form={form} />
          )}
        </div>

        <Separator />

        {/* Opening stock */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Opening Stock</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Optionally record the initial quantity. This creates the first
              stock movement.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="openingStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Quantity{' '}
                    <span className="text-muted-foreground text-xs">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {openingStock && Number(openingStock) > 0 && (
              <FormField
                control={form.control}
                name="openingStockReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Reason{' '}
                      <span className="text-muted-foreground text-xs">
                        (optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Initial stock load" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/inventory')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Item'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
