import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getFacilityInventory,
  getNetworkResources,
  getResourceFacilities,
  updateBloodStock,
  updateDrugStock,
  updateIcuBeds,
  updateVentilators,
  updateOxygenCylinders,
  updateOperatingTheatres,
  updateSuppliesStock,
  type InventoryItem,
  type NetworkResource,
  type InventoryItemWithFacility,
} from '@/services/inventoryService';
import {
  Plus,
  Loader2,
  Database,
  Search,
  Filter,
} from 'lucide-react';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'local' | 'network'>('local');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [network, setNetwork] = useState<NetworkResource[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Form modals state
  const [activeFormModal, setActiveFormModal] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  // Network Facilities Modal State
  const [selectedNetworkResource, setSelectedNetworkResource] = useState<NetworkResource | null>(null);
  const [networkFacilities, setNetworkFacilities] = useState<InventoryItemWithFacility[]>([]);
  const [fetchingFacilities, setFetchingFacilities] = useState(false);
  const [facilitiesError, setFacilitiesError] = useState<string | null>(null);

  const handleResourceClick = async (resource: NetworkResource) => {
    setSelectedNetworkResource(resource);
    setFetchingFacilities(true);
    setFacilitiesError(null);
    try {
      const data = await getResourceFacilities({
        resourceType: resource.resourceType,
        bloodGroup: resource.bloodGroup || undefined,
        name: resource.name || undefined,
      });
      setNetworkFacilities(data.facilities);
    } catch (err: any) {
      console.error(err);
      setFacilitiesError('Failed to fetch facilities carrying this resource.');
    } finally {
      setFetchingFacilities(false);
    }
  };

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

  const loadData = async () => {
    setFetching(true);
    setError(null);
    try {
      const [invData, netData] = await Promise.all([
        getFacilityInventory(),
        getNetworkResources(),
      ]);
      setInventory(invData.inventory);
      setNetwork(netData.resources);
    } catch (err: any) {
      setError(err.message ?? 'Failed to synchronize workspace logs');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      if (activeFormModal === 'BLOOD') {
        await updateBloodStock({
          bloodGroup,
          quantity: parseInt(quantity, 10),
          expiryDate: new Date(expiryDate).toISOString(),
        });
      } else if (activeFormModal === 'DRUG') {
        await updateDrugStock({
          name,
          quantity: parseInt(quantity, 10),
          price: parseFloat(price),
          expiryDate: new Date(expiryDate).toISOString(),
        });
      } else if (activeFormModal === 'ICU_BED') {
        await updateIcuBeds({
          total: parseInt(total, 10),
          available: parseInt(available, 10),
        });
      } else if (activeFormModal === 'VENTILATOR') {
        await updateVentilators({
          total: parseInt(total, 10),
          available: parseInt(available, 10),
        });
      } else if (activeFormModal === 'OXYGEN') {
        await updateOxygenCylinders({
          total: parseInt(total, 10),
          available: parseInt(available, 10),
        });
      } else if (activeFormModal === 'THEATRE') {
        await updateOperatingTheatres({
          total: parseInt(total, 10),
          available: parseInt(available, 10),
        });
      } else if (activeFormModal === 'SUPPLIES') {
        await updateSuppliesStock({
          name,
          quantity: parseInt(quantity, 10),
          price: parseFloat(price),
          expiryDate: new Date(expiryDate).toISOString(),
          category,
          unitMeasure,
        });
      }

      // Refresh list, close modal
      setActiveFormModal(null);
      resetFormFields();
      await loadData();
    } catch (err: any) {
      setFormError(err.message ?? 'Request failed. Please check inputs.');
    } finally {
      setFormLoading(false);
    }
  };

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

  const canUpdateItem = (item: InventoryItem) => {
    if (item.resourceType === 'BLOOD') return canManageBlood;
    if (item.resourceType === 'DRUG') return canManageDrug;
    if (item.resourceType === 'ICU_BED') return canManageIcu;
    if (item.resourceType === 'VENTILATOR') return canManageVentilator;
    if (item.resourceType === 'OXYGEN_CYLINDER') return canManageOxygen;
    if (item.resourceType === 'OPERATING_THEATRE') return canManageTheatre;
    if (item.resourceType === 'OTHER_SUPPLY') return canManageSupplies;
    return false;
  };

  const handleStartEdit = (item: InventoryItem) => {
    resetFormFields();
    let modalType = '';
    if (item.resourceType === 'BLOOD') {
      modalType = 'BLOOD';
      setBloodGroup(item.bloodGroup || 'A_POS');
      setQuantity(item.quantity !== null ? item.quantity.toString() : '');
      if (item.expiryDate) {
        setExpiryDate(new Date(item.expiryDate).toISOString().split('T')[0]);
      }
    } else if (item.resourceType === 'DRUG') {
      modalType = 'DRUG';
      setName(item.name || '');
      setQuantity(item.quantity !== null ? item.quantity.toString() : '');
      setPrice(item.price !== null ? item.price.toString() : '');
      if (item.expiryDate) {
        setExpiryDate(new Date(item.expiryDate).toISOString().split('T')[0]);
      }
    } else if (item.resourceType === 'ICU_BED') {
      modalType = 'ICU_BED';
      setTotal(item.total !== null ? item.total.toString() : '');
      setAvailable(item.available !== null ? item.available.toString() : '');
    } else if (item.resourceType === 'VENTILATOR') {
      modalType = 'VENTILATOR';
      setTotal(item.total !== null ? item.total.toString() : '');
      setAvailable(item.available !== null ? item.available.toString() : '');
    } else if (item.resourceType === 'OXYGEN_CYLINDER') {
      modalType = 'OXYGEN';
      setTotal(item.total !== null ? item.total.toString() : '');
      setAvailable(item.available !== null ? item.available.toString() : '');
    } else if (item.resourceType === 'OPERATING_THEATRE') {
      modalType = 'THEATRE';
      setTotal(item.total !== null ? item.total.toString() : '');
      setAvailable(item.available !== null ? item.available.toString() : '');
    } else if (item.resourceType === 'OTHER_SUPPLY') {
      modalType = 'SUPPLIES';
      setName(item.name || '');
      setQuantity(item.quantity !== null ? item.quantity.toString() : '');
      setPrice(item.price !== null ? item.price.toString() : '');
      setCategory(item.category || '');
      setUnitMeasure(item.unitMeasure || 'UNITS');
      if (item.expiryDate) {
        setExpiryDate(new Date(item.expiryDate).toISOString().split('T')[0]);
      }
    }

    if (modalType) {
      setActiveFormModal(modalType);
    }
  };

  // Filter lists
  const filteredLocal = inventory.filter((item) => {
    if (categoryFilter !== 'ALL' && item.resourceType !== categoryFilter) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const nameMatch = (item.name || '').toLowerCase().includes(q);
      const typeMatch = item.resourceType.toLowerCase().includes(q);
      const bloodMatch = item.bloodGroup ? item.bloodGroup.toLowerCase().includes(q) : false;
      return nameMatch || typeMatch || bloodMatch;
    }
    return true;
  });

  const filteredNetwork = network.filter((item) => {
    if (categoryFilter !== 'ALL' && item.resourceType !== categoryFilter) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const nameMatch = (item.name || '').toLowerCase().includes(q);
      const typeMatch = item.resourceType.toLowerCase().includes(q);
      const bloodMatch = item.bloodGroup ? item.bloodGroup.toLowerCase().includes(q) : false;
      return nameMatch || typeMatch || bloodMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Database className="h-5 w-5 text-emerald-600" />
          Resource & Ledger Registry
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Synchronize local inventory assets, register new healthcare supplies, and inspect network exchange boards.
        </p>
      </div>

      {/* Quick update controls */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Update Resource Logs
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-emerald-600">
            Node: {facilityType.replace('_', ' ')}
          </span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {canManageBlood && <AddButton onClick={() => setActiveFormModal('BLOOD')} label="Blood Stock" />}
          {canManageDrug && <AddButton onClick={() => setActiveFormModal('DRUG')} label="Drug / Medication" />}
          {canManageIcu && <AddButton onClick={() => setActiveFormModal('ICU_BED')} label="ICU Beds" />}
          {canManageVentilator && <AddButton onClick={() => setActiveFormModal('VENTILATOR')} label="Ventilators" />}
          {canManageOxygen && <AddButton onClick={() => setActiveFormModal('OXYGEN')} label="Oxygen Cylinders" />}
          {canManageTheatre && <AddButton onClick={() => setActiveFormModal('THEATRE')} label="Operating Theatres" />}
          {canManageSupplies && <AddButton onClick={() => setActiveFormModal('SUPPLIES')} label="Medical Supplies" />}
          
          {!canManageBlood && !canManageDrug && !canManageIcu && !canManageVentilator && !canManageOxygen && !canManageTheatre && !canManageSupplies && (
            <p className="text-xs font-semibold text-slate-400">
              This node classification is read-only. Updates are disabled.
            </p>
          )}
        </div>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-450" />
          <input
            type="text"
            placeholder="Search resources by name, type, or group..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-450 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-750 outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer shadow-inner"
          >
            <option value="ALL">All Categories</option>
            <option value="BLOOD">Blood packs</option>
            <option value="DRUG">Medications</option>
            <option value="ICU_BED">ICU Beds</option>
            <option value="VENTILATOR">Ventilators</option>
            <option value="OXYGEN_CYLINDER">Oxygen Cylinders</option>
            <option value="OPERATING_THEATRE">Operating Theatres</option>
            <option value="OTHER_SUPPLY">Other Supplies</option>
          </select>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex border-b border-slate-200/80">
        <button
          onClick={() => setActiveTab('local')}
          className={`px-6 py-3.5 text-sm font-semibold tracking-wide border-b-2 transition-all duration-150 cursor-pointer ${
            activeTab === 'local'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Local Resource Registry
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={`px-6 py-3.5 text-sm font-semibold tracking-wide border-b-2 transition-all duration-150 cursor-pointer ${
            activeTab === 'network'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Network Exchange Board
        </button>
      </div>

      {/* Main View */}
      {fetching ? (
        <div className="p-12 flex items-center justify-center gap-2 text-slate-400 font-medium">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          Synchronizing ledger...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-sm bg-red-50 border border-red-100 text-red-650 rounded-2xl font-medium">
          {error}
        </div>
      ) : activeTab === 'local' ? (
        <div className="space-y-6">
          {/* Local items list */}
          <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Local Inventory Records
              </h3>
              <span className="text-xs font-semibold text-slate-500 bg-slate-200/85 px-2 py-0.5 rounded-full">
                {filteredLocal.length} resource types logged
              </span>
            </div>
            {filteredLocal.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400 font-medium">
                No items matching filter criteria. Click one of the resource buttons above to register stock.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                      <th className="px-6 py-3.5">Resource Name / Type</th>
                      <th className="px-6 py-3.5">Details</th>
                      <th className="px-6 py-3.5">Volume (Qty / Total)</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Expiries</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLocal.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          <Link 
                            to={`/inventory/${item.resourceType}`}
                            className="hover:underline text-[#0d7885] hover:text-[#0a5e68] transition-colors cursor-pointer"
                          >
                            {item.resourceType === 'BLOOD' && item.bloodGroup && `Blood Packet: ${item.bloodGroup.replace('_', ' ')}`}
                            {item.resourceType === 'DRUG' && item.name}
                            {item.resourceType === 'ICU_BED' && 'ICU Beds'}
                            {item.resourceType === 'VENTILATOR' && 'Ventilators'}
                            {item.resourceType === 'OXYGEN_CYLINDER' && 'Oxygen Cylinders'}
                            {item.resourceType === 'OPERATING_THEATRE' && 'Operating Theatres'}
                            {item.resourceType === 'OTHER_SUPPLY' && item.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span className={`inline-block px-2.5 py-0.5 rounded font-bold uppercase tracking-widest text-[9px] border ${
                            item.resourceType === 'BLOOD'
                              ? 'bg-red-50 text-red-650 border-red-200/40'
                              : item.resourceType === 'DRUG'
                              ? 'bg-blue-50 text-blue-650 border-blue-200/40'
                              : 'bg-slate-100 text-slate-650 border-slate-200'
                          }`}>
                            {item.resourceType}
                          </span>
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
                        <td className="px-6 py-4 text-xs">
                          {item.isMovable ? (
                            <span className="text-emerald-650 font-bold uppercase tracking-wider text-[9px] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                              Sync Active
                            </span>
                          ) : (
                            <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                              Fixed Asset
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                          {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right text-xs">
                          {canUpdateItem(item) ? (
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="text-xs font-bold text-[#0d7885] hover:text-[#0a5e68] bg-[#d7f7f9]/50 hover:bg-[#d7f7f9] px-2.5 py-1.5 rounded-lg border border-[#0d7885]/20 transition-all cursor-pointer"
                            >
                              Update
                            </button>
                          ) : (
                            <span className="text-slate-400 font-semibold italic text-[11px]">
                              Read-Only
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Network Exchange board view */
        <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Shared Network Resources
            </h3>
          </div>
          {filteredNetwork.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400 font-medium">
              No shared resources reported across other network facilities matching criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                    <th className="px-6 py-3.5">Resource Name / Class</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNetwork.map((res, i) => (
                    <tr
                      key={i}
                      className="hover:bg-slate-100/65 transition-colors cursor-pointer"
                      onClick={() => handleResourceClick(res)}
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {res.resourceType === 'BLOOD' && res.bloodGroup && `Blood Packs (${res.bloodGroup.replace('_', ' ')})`}
                        {res.resourceType !== 'BLOOD' && (res.name || res.resourceType.replace('_', ' '))}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="inline-block px-2.5 py-0.5 rounded font-bold uppercase tracking-widest text-[9px] bg-slate-105 border border-slate-200 text-slate-650">
                          {res.resourceType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {res.isMovable ? (
                          <span className="text-indigo-650 font-bold uppercase tracking-wider text-[9px] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                            Exchange Eligible
                          </span>
                        ) : (
                          <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            Fixed Node Property
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Network Resource Facilities Modal */}
      {selectedNetworkResource && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-800 animate-in zoom-in-95 duration-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                Network Facilities carrying: {selectedNetworkResource.resourceType === 'BLOOD' && selectedNetworkResource.bloodGroup ? `Blood (${selectedNetworkResource.bloodGroup.replace('_', ' ')})` : (selectedNetworkResource.name || selectedNetworkResource.resourceType.replace('_', ' '))}
              </h3>
              <button
                onClick={() => {
                  setSelectedNetworkResource(null);
                  setNetworkFacilities([]);
                }}
                className="text-slate-450 hover:text-slate-650 font-semibold text-xs uppercase tracking-wider transition-colors"
              >
                Close
              </button>
            </div>

            {fetchingFacilities ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                <span className="text-sm text-slate-500 font-medium">Querying network facilities...</span>
              </div>
            ) : facilitiesError ? (
              <div className="p-6 text-center text-sm text-red-650 bg-red-50 border border-red-105 rounded-xl font-medium">
                {facilitiesError}
              </div>
            ) : networkFacilities.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400 font-medium">
                No active facilities reporting stock for this resource at this time.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-slate-200/60 rounded-xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                      <th className="px-4 py-3">Facility Name</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3 text-right">Available Stock</th>
                      <th className="px-4 py-3">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {networkFacilities.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-slate-900">
                          {item.facility.name}
                        </td>
                        <td className="px-4 py-3.5 text-xs">
                          <span className="inline-block px-2 py-0.5 rounded font-bold uppercase tracking-widest text-[9px] bg-slate-100 border border-slate-200 text-slate-650">
                            {item.facility.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 font-medium">
                          {item.facility.location}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-850">
                          {item.resourceType === 'BLOOD' || item.resourceType === 'DRUG' || item.resourceType === 'OTHER_SUPPLY' ? (
                            <span>{item.quantity} units</span>
                          ) : (
                            <span>{item.available} / {item.total} available</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {item.facility.phone || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Forms Modals */}
      {activeFormModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-800 animate-in zoom-in-95 duration-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">
              Update {activeFormModal.replace('_', ' ')} Registry
            </h3>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-650 text-xs px-3 py-2.5 rounded-xl font-medium animate-shake">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Conditional Inputs */}
              {activeFormModal === 'BLOOD' && (
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
                  <QuantityInput value={quantity} onChange={setQuantity} />
                  <ExpiryInput value={expiryDate} onChange={setExpiryDate} />
                </>
              )}

              {activeFormModal === 'DRUG' && (
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-850 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                    />
                  </div>
                  <QuantityInput value={quantity} onChange={setQuantity} />
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-850 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                    />
                  </div>
                  <ExpiryInput value={expiryDate} onChange={setExpiryDate} />
                </>
              )}

              {(activeFormModal === 'ICU_BED' ||
                activeFormModal === 'VENTILATOR' ||
                activeFormModal === 'OXYGEN' ||
                activeFormModal === 'THEATRE') && (
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-850 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-850 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeFormModal === 'SUPPLIES' && (
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-850 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <QuantityInput value={quantity} onChange={setQuantity} />
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-850 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-850 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Unit of Measure
                      </label>
                      <select
                        value={unitMeasure}
                        onChange={(e) => setUnitMeasure(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-850 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                      >
                        {['UNITS', 'BOXES', 'PACKS', 'PIECES', 'BOTTLES'].map((unit) => (
                          <option key={unit} value={unit} className="bg-white text-slate-800">
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <ExpiryInput value={expiryDate} onChange={setExpiryDate} />
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setActiveFormModal(null);
                    resetFormFields();
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-xl text-sm transition-all duration-150 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 active:translate-y-[1px] disabled:opacity-50"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      Saving...
                    </>
                  ) : (
                    'Save Stock'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Mini Helpers
function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 hover:border-emerald-500/30 bg-slate-50 hover:bg-emerald-50/50 text-slate-650 hover:text-emerald-650 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer shadow-sm active:translate-y-[1px]"
    >
      <Plus className="h-3.5 w-3.5 text-emerald-600" />
      {label}
    </button>
  );
}

function QuantityInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
        Quantity Packets / Units
      </label>
      <input
        type="number"
        placeholder="e.g. 50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-850 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
      />
    </div>
  );
}

function ExpiryInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
        Expiry Date
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-850 outline-none focus:border-emerald-500 focus:bg-white shadow-inner [color-scheme:light]"
      />
    </div>
  );
}
