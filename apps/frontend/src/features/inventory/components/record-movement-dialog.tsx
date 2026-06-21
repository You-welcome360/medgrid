import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Loader2 } from 'lucide-react';

import { useRecordMovement } from '@/features/inventory/hooks/use-inventory';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const schema = z.object({
  quantity: z.coerce
    .number()
    .int()
    .refine((v) => v !== 0, 'Cannot be zero'),
  movementType: z.enum([
    'RESTOCK',
    'CONSUMPTION',
    'ADJUSTMENT',
    'EXPIRED_REMOVAL',
    'DAMAGE',
    'TRANSFER_OUT',
    'TRANSFER_IN',
  ]),
  reason: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

const MOVEMENT_TYPES = [
  { value: 'RESTOCK', label: 'Restock (+)' },
  { value: 'CONSUMPTION', label: 'Consumption (−)' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'EXPIRED_REMOVAL', label: 'Expired Removal (−)' },
  { value: 'DAMAGE', label: 'Damage (−)' },
  { value: 'TRANSFER_OUT', label: 'Transfer Out (−)' },
  { value: 'TRANSFER_IN', label: 'Transfer In (+)' },
];

interface RecordMovementDialogProps {
  inventoryId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function RecordMovementDialog({
  inventoryId,
  open,
  onOpenChange,
}: RecordMovementDialogProps) {
  const recordMovement = useRecordMovement();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { movementType: 'RESTOCK', quantity: 1 },
  });

  const onSubmit = async (data: FormValues) => {
    await recordMovement.mutateAsync({
      id: inventoryId,
      quantity: data.quantity,
      movementType: data.movementType as FormValues['movementType'],
      reason: data.reason,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Stock Movement</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="movementType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Movement Type</FormLabel>
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
                      {MOVEMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
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
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Quantity{' '}
                    <span className="text-muted-foreground text-xs">
                      (positive = stock in, negative = stock out)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Reason{' '}
                    <span className="text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Weekly resupply" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={recordMovement.isPending}>
                {recordMovement.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  'Record'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
