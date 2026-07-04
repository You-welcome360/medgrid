import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getFacilityInventory,
  updateBloodStock,
  updateDrugStock,
  updateIcuBeds,
  updateVentilators,
  updateOxygenCylinders,
  updateOperatingTheatres,
  updateSuppliesStock,
  type InventoryItem,
} from '@/services/inventoryService';
import {
  ArrowLeft,
  Loader2,
  Database,
  Calendar,
  Layers,
  History,
  CheckCircle,
} from 'lucide-react';

export default function ResourceTypePage() {
  const { resourceType } = useParams<{ resourceType: string }>();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form field states
  const [bloodGroup, setBloodGroup] = useState('A_POS');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [total, setTotal] = useState('');
  const [available, setAvailable] = useState('');
  const [category, setCategory] = useState('');
  const [unitMeasure, setUnitMeasure] = useState('UNITS');

  const userStr = localStorage.getItem('medgrid_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const facilityType = user?.facility_type || 'HOSPITAL';

  const canManageBlood = facilityType === 'HOSPITAL' || facilityType === 'BLOOD_BANK' || facilityType === 'SUPPLIER';
  const canManageDrug = facilityType === 'HOSPITAL' || facilityType === 'PHARMACY' || facilityType === 'SUPPLIER';
  const canManageIcu = facilityType === 'HOSPITAL' || facilityType === 'SUPPLIER';
  const canManageVentilator = facilityType === 'HOSPITAL' || facilityType === 'SUPPLIER';
  const canManageOxygen = facilityType === 'HOSPITAL' || facilityType === 'SUPPLIER';
  const canManageTheatre = facilityType === 'HOSPITAL' || facilityType === 'SUPPLIER';
  const canManageSupplies = facilityType === 'SUPPLIER';

  const isWriteAllowed = () => {
    if (resourceType === 'BLOOD') return canManageBlood;
    if (resourceType === 'DRUG') return canManageDrug;
    if (resourceType === 'ICU_BED') return canManageIcu;
    if (resourceType === 'VENTILATOR') return canManageVentilator;
    if (resourceType === 'OXYGEN_CYLINDER') return canManageOxygen;
    if (resourceType === 'OPERATING_THEATRE') return canManageTheatre;
    if (resourceType === 'OTHER_SUPPLY') return canManageSupplies;
    return false;
  };

  const loadData = async () => {
    setFetching(true);
    setError(null);
    try {
      const invData = await getFacilityInventory();
      setInventory(invData.inventory);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load ledger records');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [resourceType]);

  // Filter items matching the current type
  const items = inventory.filter((item) => item.resourceType === resourceType);

  // Group items by unique descriptor to show "Current Status" vs "Previous Audits/Updates"
  // For BLOOD: grouped by bloodGroup
  // For DRUG and OTHER_SUPPLY: grouped by name
  // For fixed assets: just one item
  const getUniqueKey = (item: InventoryItem) => {
    if (item.resourceType === 'BLOOD') return item.bloodGroup || '';
    if (item.resourceType === 'DRUG' || item.resourceType === 'OTHER_SUPPLY') return item.name || '';
    return 'fixed-asset';
  };

  // Get most recent record for each unique item key
  const uniqueItemsMap: Record<string, InventoryItem> = {};
  items.forEach((item) => {
    const key = getUniqueKey(item);
    if (!uniqueItemsMap[key]) {
      uniqueItemsMap[key] = item; // Since items are ordered desc by createdAt, first is most recent
    }
  });
  const currentStatusList = Object.values(uniqueItemsMap);

  const resetFormFields = () => {
    setBloodGroup('A_POS');
    setQuantity('');
    setExpiryDate('');
    setName('');
    setPrice('');
    setTotal('');
    setAvailable('');
    setCategory('');
    setUnitMeasure('UNITS');
  };

  const handleStartEdit = (item: InventoryItem) => {
    setFormError(null);
    setSuccessMsg(null);
    if (item.resourceType === 'BLOOD') {
      setBloodGroup(item.bloodGroup || 'A_POS');
      setQuantity(item.quantity !== null ? item.quantity.toString() : '');
      if (item.expiryDate) {
        setExpiryDate(new Date(item.expiryDate).toISOString().split('T')[0]);
      }
    } else if (item.resourceType === 'DRUG') {
      setName(item.name || '');
      setQuantity(item.quantity !== null ? item.quantity.toString() : '');
      setPrice(item.price !== null ? item.price.toString() : '');
      if (item.expiryDate) {
        setExpiryDate(new Date(item.expiryDate).toISOString().split('T')[0]);
      }
    } else if (item.resourceType === 'ICU_BED' || item.resourceType === 'VENTILATOR' || item.resourceType === 'OXYGEN_CYLINDER' || item.resourceType === 'OPERATING_THEATRE') {
      setTotal(item.total !== null ? item.total.toString() : '');
      setAvailable(item.available !== null ? item.available.toString() : '');
    } else if (item.resourceType === 'OTHER_SUPPLY') {
      setName(item.name || '');
      setQuantity(item.quantity !== null ? item.quantity.toString() : '');
      setPrice(item.price !== null ? item.price.toString() : '');
      setCategory(item.category || '');
      setUnitMeasure(item.unitMeasure || 'UNITS');
      if (item.expiryDate) {
        setExpiryDate(new Date(item.expiryDate).toISOString().split('T')[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setSuccessMsg(null);

    try {
      if (resourceType === 'BLOOD') {
        await updateBloodStock({
          bloodGroup,
          quantity: parseInt(quantity, 10),
          expiryDate: new Date(expiryDate).toISOString(),
        });
      } else if (resourceType === 'DRUG') {
        await updateDrugStock({
          name,
          quantity: parseInt(quantity, 10),
          price: parseFloat(price),
          expiryDate: new Date(expiryDate).toISOString(),
        });
      } else if (resourceType === 'ICU_BED') {
        await updateIcuBeds({
          total: parseInt(total, 10),
          available: parseInt(available, 10),
        });
      } else if (resourceType === 'VENTILATOR') {
        await updateVentilators({
          total: parseInt(total, 10),
          available: parseInt(available, 10),
        });
      } else if (resourceType === 'OXYGEN_CYLINDER') {
        await updateOxygenCylinders({
          total: parseInt(total, 10),
          available: parseInt(available, 10),
        });
      } else if (resourceType === 'OPERATING_THEATRE') {
        await updateOperatingTheatres({
          total: parseInt(total, 10),
          available: parseInt(available, 10),
        });
      } else if (resourceType === 'OTHER_SUPPLY') {
        await updateSuppliesStock({
          name,
          quantity: parseInt(quantity, 10),
          price: parseFloat(price),
          expiryDate: new Date(expiryDate).toISOString(),
          category,
          unitMeasure,
        });
      }

      setSuccessMsg('Ledger entry updated successfully');
      resetFormFields();
      await loadData();
    } catch (err: any) {
      setFormError(err.message ?? 'Update failed. Check your inputs.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-3">
        <Link
          to="/inventory"
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-600" />
            {resourceType?.replace('_', ' ')} Stock Desk
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Detailed ledger history and operational inventory updates for this resource type.
          </p>
        </div>
      </div>

      {fetching ? (
        <div className="p-12 flex items-center justify-center gap-2 text-slate-400 font-medium">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          Synchronizing ledger records...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-sm bg-red-50 border border-red-100 text-red-655 rounded-2xl font-medium">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Detailed Resource Overview & Table */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current State List */}
            <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-emerald-500" /> Current Stock Levels
                </h3>
                <span className="text-xs font-semibold text-slate-500 bg-slate-200/85 px-2 py-0.5 rounded-full">
                  {currentStatusList.length} distinct records
                </span>
              </div>
              {currentStatusList.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400 font-medium">
                  No records registered. Use the panel on the right to log new stock.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                        <th className="px-6 py-3.5">Item Name/Spec</th>
                        <th className="px-6 py-3.5">Details</th>
                        <th className="px-6 py-3.5">Volume</th>
                        <th className="px-6 py-3.5">Updated</th>
                        {isWriteAllowed() && <th className="px-6 py-3.5 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentStatusList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {item.resourceType === 'BLOOD' && item.bloodGroup && `Blood Group: ${item.bloodGroup.replace('_', ' ')}`}
                            {item.resourceType === 'DRUG' && item.name}
                            {item.resourceType === 'ICU_BED' && 'ICU Beds'}
                            {item.resourceType === 'VENTILATOR' && 'Ventilators'}
                            {item.resourceType === 'OXYGEN_CYLINDER' && 'Oxygen Cylinders'}
                            {item.resourceType === 'OPERATING_THEATRE' && 'Operating Theatres'}
                            {item.resourceType === 'OTHER_SUPPLY' && item.name}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                            {item.price !== null && `Price: $${item.price}`}
                            {item.expiryDate && `Expiry: ${new Date(item.expiryDate).toLocaleDateString()}`}
                            {!item.price && !item.expiryDate && (item.isMovable ? 'Sync Active' : 'Fixed Asset')}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-700">
                            {item.quantity !== null && (
                              <span className="font-bold text-slate-800 text-sm">
                                {item.quantity} units
                              </span>
                            )}
                            {item.total !== null && (
                              <span className="font-bold text-slate-800 text-sm">
                                {item.available} / {item.total} free
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 font-semibold">
                            {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                          </td>
                          {isWriteAllowed() && (
                            <td className="px-6 py-4 text-right text-xs">
                              <button
                                onClick={() => handleStartEdit(item)}
                                className="text-xs font-bold text-[#0d7885] hover:text-[#0a5e68] bg-[#d7f7f9]/50 hover:bg-[#d7f7f9] px-2.5 py-1.5 rounded-lg border border-[#0d7885]/20 transition-all cursor-pointer"
                              >
                                Edit
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Ledger Audit / History Log */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <History className="h-4 w-4 text-slate-400" /> Historical Ledger Log
              </h3>
              {items.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No update logs recorded on this node.</p>
              ) : (
                <div className="relative pl-6 border-l-2 border-slate-100 space-y-6">
                  {items.map((log) => (
                    <div key={log.id} className="relative group">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-slate-150 border-4 border-white group-hover:bg-emerald-500 transition-colors" />
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-2 text-slate-450 font-bold">
                          <Calendar className="h-3 w-3" />
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                        <p className="text-sm text-slate-800 font-semibold">
                          {log.resourceType === 'BLOOD' && log.bloodGroup && `Registered ${log.quantity} units of Blood: ${log.bloodGroup.replace('_', ' ')}`}
                          {log.resourceType === 'DRUG' && `Updated ${log.name}: ${log.quantity} units available`}
                          {log.resourceType === 'ICU_BED' && `Modified ICU Beds count: ${log.available} available / ${log.total} total`}
                          {log.resourceType === 'VENTILATOR' && `Modified Ventilators count: ${log.available} available / ${log.total} total`}
                          {log.resourceType === 'OXYGEN_CYLINDER' && `Modified Oxygen Cylinders count: ${log.available} available / ${log.total} total`}
                          {log.resourceType === 'OPERATING_THEATRE' && `Modified Operating Theatres count: ${log.available} available / ${log.total} total`}
                          {log.resourceType === 'OTHER_SUPPLY' && `Logged Supply update ${log.name}: ${log.quantity} units`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Inline Update Form */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-md space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">
                Update Registry
              </h3>

              {!isWriteAllowed() ? (
                <div className="p-4 text-center text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-xl">
                  This facility node is read-only for {resourceType?.replace('_', ' ')}.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-655 text-xs px-3 py-2.5 rounded-xl font-medium">
                      {formError}
                    </div>
                  )}

                  {successMsg && (
                    <div className="bg-emerald-50 border border-emerald-250 text-emerald-700 text-xs px-3 py-2.5 rounded-xl font-semibold flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      {successMsg}
                    </div>
                  )}

                  {/* BLOOD Form */}
                  {resourceType === 'BLOOD' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Blood Group
                        </label>
                        <select
                          value={bloodGroup}
                          onChange={(e) => setBloodGroup(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                        >
                          {['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'].map((bg) => (
                            <option key={bg} value={bg} className="bg-white text-slate-800">
                              {bg.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Quantity (Units)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 10"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-855 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-855 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* DRUG Form */}
                  {resourceType === 'DRUG' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Medication Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Paracetamol 500mg"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-855 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Quantity
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 100"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-855 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Price per Unit ($)
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 5.99"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-855 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-855 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Bed/Theatre/Ventilator/Oxygen forms */}
                  {(resourceType === 'ICU_BED' ||
                    resourceType === 'VENTILATOR' ||
                    resourceType === 'OXYGEN_CYLINDER' ||
                    resourceType === 'OPERATING_THEATRE') && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Total Units
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 25"
                            value={total}
                            onChange={(e) => setTotal(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-855 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Available Units
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 8"
                            value={available}
                            onChange={(e) => setAvailable(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-855 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* SUPPLIES Form */}
                  {resourceType === 'OTHER_SUPPLY' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Supply Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Disposable N95 Masks"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-855 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Quantity
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 200"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-855 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Price ($)
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="e.g. 1.20"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-855 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Category
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. PPE"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-855 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Unit of Measure
                          </label>
                          <select
                            value={unitMeasure}
                            onChange={(e) => setUnitMeasure(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-855 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                          >
                            {['UNITS', 'BOXES', 'PACKS', 'PIECES', 'BOTTLES'].map((unit) => (
                              <option key={unit} value={unit} className="bg-white text-slate-800">
                                {unit}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-855 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                          required
                        />
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    {formLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        Writing to Ledger...
                      </>
                    ) : (
                      'Commit Log Entry'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
