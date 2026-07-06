import { useState } from 'react';
import { RefreshCw, Calendar, MapPin, Check, Plus, AlertCircle, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import {
  useExpiryAlerts,
  useRedistributionOffers,
  useTriggerExpiryCheck,
  useCreateRedistributionOffer,
  useClaimRedistributionOffer,
} from '@/features/inventory/hooks/use-inventory';
import { useAuth } from '@/hooks/use-auth';
import { useRole } from '@/hooks/use-role';
import { useFacility } from '@/features/facilities/hooks/use-facilities';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Haversine formula to compute distance in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

export default function RedistributionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFacilityAdmin, isCoordinationManager } = useRole();
  const { data: userFacility } = useFacility(user?.facilityId ?? '');
  const { data: alerts = [], isLoading: alertsLoading } = useExpiryAlerts();
  const { data: offers = [], isLoading: offersLoading } = useRedistributionOffers();

  const triggerExpiryCheck = useTriggerExpiryCheck();
  const createOffer = useCreateRedistributionOffer();
  const claimOffer = useClaimRedistributionOffer();

  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [postQuantity, setPostQuantity] = useState<string>('');
  const [postPrice, setPostPrice] = useState<string>('0');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handlePostClick = (alert: any) => {
    setSelectedAlert(alert);
    setPostQuantity('1');
    setPostPrice('0');
    setDialogOpen(true);
  };

  const handleCreateOfferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;

    createOffer.mutate(
      {
        inventoryId: selectedAlert.inventoryId,
        quantity: parseInt(postQuantity),
        price: parseFloat(postPrice),
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setSelectedAlert(null);
        },
      }
    );
  };

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Redistribution Marketplace"
        description="Share surplus stocks nearing expiry and claim items to minimize waste across the network."
        action={
          <Button
            onClick={() => triggerExpiryCheck.mutate()}
            disabled={triggerExpiryCheck.isPending}
            variant="outline"
            className="flex items-center gap-1.5 border-dashed border-indigo-500 text-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all duration-200"
          >
            <RefreshCw className={`h-4 w-4 ${triggerExpiryCheck.isPending ? 'animate-spin' : ''}`} />
            Scan Expiry Dates
          </Button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Alerts & Warnings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-red-500/20 bg-red-950/5 dark:bg-red-950/10 shadow-lg backdrop-blur-md">
            <CardHeader className="pb-3 border-b border-red-500/10">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-lg text-red-700 dark:text-red-400">Expiry Warnings</CardTitle>
              </div>
              <CardDescription className="text-red-600/80 dark:text-red-400/60 text-xs">
                Your facility's inventory items flagged for upcoming expiration.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {alertsLoading ? (
                <div className="text-center py-6 text-sm text-muted-foreground">Loading alerts...</div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg border-muted-foreground/20">
                  No active expiry alerts found.
                </div>
              ) : (
                alerts.map((alert: any) => {
                  const severityColors =
                    alert.severity === 'CRITICAL'
                      ? 'bg-red-500/15 text-red-700 border-red-500/30 border'
                      : 'bg-amber-500/15 text-amber-700 border-amber-500/30 border';

                  const isCritical = alert.severity === 'CRITICAL';

                  return (
                    <div
                      key={alert.id}
                      className="p-3.5 rounded-xl border border-muted bg-background/50 hover:bg-background/80 transition-all duration-150 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-sm capitalize">{alert.inventory.itemName}</h4>
                          <p className="text-xs text-muted-foreground capitalize">
                            Type: {alert.inventory.resourceType.toLowerCase().replace('_', ' ')}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-full capitalize ${severityColors}`}>
                          {alert.severity.toLowerCase()}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>Expires: {format(new Date(alert.expiryDate), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="font-medium text-destructive mt-0.5">
                          {alert.daysToExpiry <= 0
                            ? 'EXPIRED'
                            : `${alert.daysToExpiry} day${alert.daysToExpiry > 1 ? 's' : ''} remaining`}
                        </div>
                      </div>

                      {isCritical ? (
                        <div className="text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1.5 rounded-lg border border-emerald-500/20 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          Auto-posted to Marketplace (FREE)
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePostClick(alert)}
                          className="w-full text-xs font-semibold py-1 h-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-900/30 dark:hover:bg-indigo-950/30"
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" /> Post to Marketplace
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Marketplace Section */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Marketplace Offers</h3>
          
          {offersLoading ? (
            <div className="text-center py-20 text-muted-foreground">Loading offers...</div>
          ) : offers.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed rounded-xl py-24 text-center px-4">
              <ShoppingBag className="h-12 w-12 text-slate-400 mb-3" />
              <h4 className="font-semibold text-lg">No Redistribution Offers</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                There are currently no items shared for redistribution. Nearing-expiry stocks will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {offers.map((offer: any) => {
                const distance =
                  userFacility && offer.inventory.facility
                    ? calculateDistance(
                        userFacility.latitude,
                        userFacility.longitude,
                        offer.inventory.facility.latitude,
                        offer.inventory.facility.longitude
                      )
                    : null;

                const isOwnOffer = offer.facilityId === user?.facilityId;
                const isFree = !offer.price || parseFloat(offer.price.toString()) === 0;

                return (
                  <Card
                    key={offer.id}
                    className={`relative overflow-hidden border border-slate-200 dark:border-slate-800/80 shadow-md backdrop-blur-lg transition-all duration-200 hover:shadow-lg ${
                      isOwnOffer ? 'border-dashed border-indigo-500/40 bg-indigo-500/[0.01]' : 'bg-card'
                    }`}
                  >
                    {isOwnOffer && (
                      <div className="absolute top-2 right-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                        Your Offer
                      </div>
                    )}

                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold capitalize">{offer.inventory.itemName}</CardTitle>
                          <span className="text-[10px] font-medium text-slate-400 capitalize">
                            {offer.inventory.resourceType.toLowerCase().replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className={`font-extrabold text-sm ${isFree ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {isFree ? 'FREE' : `GH₵${parseFloat(offer.price.toString()).toFixed(2)}`}
                          </div>
                          <span className="text-[10px] text-muted-foreground">per unit</span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-2 pb-4 space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-xs border-y py-2.5 my-1 border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-muted-foreground text-[10px] block">Offered Stock</span>
                          <span className="font-semibold text-sm">
                            {offer.quantity} {offer.unit.toLowerCase()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px] block">Expires In</span>
                          <span className="font-semibold text-sm text-destructive">
                            {Math.ceil((new Date(offer.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                          <span className="truncate">{offer.inventory.facility.name}</span>
                        </div>
                        {distance !== null && (
                          <div className="text-[10px] text-muted-foreground pl-5 font-semibold">
                            {distance < 1 ? 'Within 1 km' : `${distance.toFixed(1)} km away`}
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => {
                          claimOffer.mutate(offer.id, {
                            onSuccess: () => {
                              navigate('/requests/new', {
                                state: {
                                  supplyingFacilityId: offer.facilityId,
                                  resourceType: offer.inventory.resourceType,
                                  itemName: offer.inventory.itemName,
                                  quantity: offer.quantity,
                                  unit: offer.unit,
                                  description: `Redistribution claim request for: ${offer.inventory.itemName} from ${offer.inventory.facility.name}. (Surplus stock quantity: ${offer.quantity} ${offer.unit.toLowerCase()})`,
                                },
                              });
                            },
                          });
                        }}
                        disabled={claimOffer.isPending || isOwnOffer || !(isFacilityAdmin || isCoordinationManager)}
                        className="w-full text-xs font-bold py-2 mt-2 h-9 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                      >
                        {claimOffer.isPending
                          ? 'Claiming...'
                          : isOwnOffer
                            ? 'Own stock'
                            : !(isFacilityAdmin || isCoordinationManager)
                              ? 'Claims Restricted'
                              : 'Claim Offer'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Manual Redistribution Post Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Post Redistribution Offer</DialogTitle>
            <DialogDescription>
              Submit details to offer this inventory batch for inter-facility redistribution.
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <form onSubmit={handleCreateOfferSubmit} className="space-y-4 py-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block">Item Name</span>
                <span className="font-semibold text-sm capitalize">{selectedAlert.inventory.itemName}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postQuantity">Quantity to Offer</Label>
                  <Input
                    id="postQuantity"
                    type="number"
                    min={1}
                    value={postQuantity}
                    onChange={(e) => setPostQuantity(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postPrice">Price per Unit (GH₵)</Label>
                  <Input
                    id="postPrice"
                    type="number"
                    min={0}
                    step="0.01"
                    value={postPrice}
                    onChange={(e) => setPostPrice(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-muted-foreground block">Set to 0 for donation</span>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createOffer.isPending}>
                  {createOffer.isPending ? 'Posting...' : 'Post Offer'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
