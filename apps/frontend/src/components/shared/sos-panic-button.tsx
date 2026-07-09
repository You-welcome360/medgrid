import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Radio, Flame, Loader2 } from 'lucide-react';

import { useCreateRequest } from '@/features/requests/hooks/use-requests';
import { useNetworkResources } from '@/features/inventory/hooks/use-inventory';
import type { ResourceType, InventoryUnit } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SOSFormValues {
  resourceType: ResourceType;
  itemName: string;
  quantity: number;
  unit: InventoryUnit;
  description: string;
  maxRadiusKm: number;
  patientCondition?: string;
  patientBloodType?: string;
}

export function SOSPanicButton() {
  const [open, setOpen] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const createRequestMutation = useCreateRequest();

  const { data: networkResources = [], isLoading: networkResourcesLoading } = useNetworkResources();

  const { register, handleSubmit, setValue, watch, reset } = useForm<SOSFormValues>({
    defaultValues: {
      resourceType: 'MEDICATION',
      unit: 'PIECES',
      quantity: 1,
      maxRadiusKm: 50,
      description: 'Urgent emergency request: medical supplies needed immediately.',
    },
  });

  const selectedType = watch('resourceType');
  const selectedUnit = watch('unit');

  // Reset itemName when resource type changes
  useEffect(() => {
    setValue('itemName', '');
  }, [selectedType, setValue]);

  const itemNameValue = watch('itemName') || '';
  const filteredResources = networkResources.filter(
    (item) =>
      item.resourceType === selectedType &&
      item.itemName.toLowerCase().includes(itemNameValue.toLowerCase())
  );

  const onSubmit = (values: SOSFormValues) => {
    createRequestMutation.mutate(
      {
        resourceType: values.resourceType,
        itemName: values.itemName,
        quantity: Number(values.quantity),
        unit: values.unit,
        description: values.description,
        isEmergency: true,
        isBroadcast: true,
        maxRadiusKm: Number(values.maxRadiusKm),
        priority: 'CRITICAL',
        patient: values.patientCondition || values.patientBloodType
          ? {
            name: 'Emergency Trauma Patient',
            age: 0,
            emergencyNotes: `Condition: ${values.patientCondition || 'Critical'}. Blood Type: ${values.patientBloodType || 'Unknown'}`,
          }
          : undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          reset();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.6)] hover:shadow-[0_0_30px_rgba(220,38,38,0.8)] border border-red-500/30 z-50 transition-all duration-300 flex items-center justify-center p-0 group"
          size="icon"
        >
          <Radio className="h-6 w-6 animate-pulse group-hover:scale-110 transition-transform" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto bg-card text-card-foreground border border-border shadow-2xl">
        <DialogHeader className="pt-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-655/95">
            <Flame className="h-5.5 w-5.5 animate-bounce text-red-500" />
            ACTIVATE NETWORK SOS BROADCAST
          </DialogTitle>
          {/* <DialogDescription className="text-muted-foreground text-sm">
            Publish an emergency distress call matching nearby facilities within range.
          </DialogDescription> */}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4 pt-2">
          {/* Resource Type */}
          <div className="space-y-1.5">
            <Label htmlFor="resourceType" className="text-foreground">Resource Category</Label>
            <Select
              value={selectedType}
              onValueChange={(val: ResourceType) => setValue('resourceType', val)}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Select resource type" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="BLOOD">Blood Products</SelectItem>
                <SelectItem value="MEDICATION">Medication & Drugs</SelectItem>
                <SelectItem value="PPE">Personal Protective Equipment</SelectItem>
                <SelectItem value="MEDICAL_EQUIPMENT">Medical Equipment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Item Name */}
          <div className="space-y-1.5 relative">
            <Label htmlFor="itemName" className="text-foreground">Item Name / Specification</Label>
            <div className="relative">
              <Input
                id="itemName"
                required
                placeholder="Type or select a resource..."
                className="bg-background border-border text-foreground focus:border-red-500"
                {...register('itemName')}
                onFocus={() => setIsSuggestionsOpen(true)}
                onBlur={() => setIsSuggestionsOpen(false)}
                autoComplete="off"
              />
              {isSuggestionsOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-card p-1 text-foreground shadow-lg ring-1 ring-red-100">
                  {networkResourcesLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                    </div>
                  ) : filteredResources.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No matching network items found
                    </div>
                  ) : (
                    filteredResources.map((item, index) => (
                      <button
                        key={`${item.itemName}-${index}`}
                        type="button"
                        className="flex w-full items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-sm text-left outline-none hover:bg-red-50 hover:text-red-700 cursor-pointer select-none transition-colors border-b border-border last:border-0"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setValue('itemName', item.itemName);
                          setIsSuggestionsOpen(false);
                        }}
                      >
                        <span>{item.itemName}</span>
                        {item.isMovable && (
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                            Movable
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div className="space-y-1.5">
              <Label htmlFor="quantity" className="text-foreground">Quantity Needed</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                required
                className="bg-background border-border text-foreground focus:border-red-500"
                {...register('quantity')}
              />
            </div>

            {/* Unit */}
            <div className="space-y-1.5">
              <Label htmlFor="unit" className="text-foreground">Unit</Label>
              <Select
                value={selectedUnit}
                onValueChange={(val: InventoryUnit) => setValue('unit', val)}
              >
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="BOXES">Boxes</SelectItem>
                  <SelectItem value="PACKS">Packs</SelectItem>
                  <SelectItem value="UNITS">Units</SelectItem>
                  <SelectItem value="PIECES">Pieces</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Broadcast Radius */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-sm text-foreground">
              <Label htmlFor="maxRadiusKm">Broadcast Radius Limit</Label>
              <span className="font-semibold text-red-600">{watch('maxRadiusKm')} km</span>
            </div>
            <Input
              id="maxRadiusKm"
              type="range"
              min="5"
              max="150"
              step="5"
              className="w-full accent-red-600 bg-muted"
              {...register('maxRadiusKm')}
            />
          </div>

          {/* Patient Context */}
          {/* <div className="p-3 bg-red-50/50 border border-red-100 rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-red-600">
              <AlertCircle className="h-4 w-4" />
              Optional Patient Context
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="patientCondition" className="text-[10px] text-muted-foreground uppercase">Condition</Label>
                <Input
                  id="patientCondition"
                  placeholder="e.g. Active Hemorrhage"
                  className="bg-background border-border h-8 text-xs text-foreground"
                  {...register('patientCondition')}
                />
              </div>
              <div>
                <Label htmlFor="patientBloodType" className="text-[10px] text-muted-foreground uppercase">Blood Type</Label>
                <Input
                  id="patientBloodType"
                  placeholder="e.g. O-"
                  className="bg-background border-border h-8 text-xs text-foreground"
                  {...register('patientBloodType')}
                />
              </div>
            </div>
          </div> */}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-foreground">Brief Description</Label>
            <Input
              id="description"
              className="bg-background border-border text-foreground focus:border-red-500"
              {...register('description')}
            />
          </div>

          <Button
            type="submit"
            disabled={createRequestMutation.isPending}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-colors"
          >
            {createRequestMutation.isPending ? 'Broadcasting SOS Signal...' : 'BROADCAST SOS SIGNAL NOW'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
