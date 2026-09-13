import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  QrCode,
  Users,
  Settings as SettingsIcon,
  Sparkles,
  Search,
  ExternalLink,
  MessageCircle,
  Eye,
  Trash2,
  Award,
  RefreshCw,
  Copy,
  Plus,
  Store,
  Car,
  FileCheck,
  FileText,
  Phone,
  MapPin,
  ShieldCheck,
  Bike,
  Truck,
  ShoppingBag,
  CreditCard,
  Image as ImageIcon,
  DollarSign,
  AlertTriangle,
  Briefcase,
  Wrench,
  UserCheck,
  UserX,
  Megaphone,
  X,
  Tag,
} from 'lucide-react';
import {
  Listing,
  RechargeRequest,
  UserProfile,
  AdminSetting,
  ShopRegistration,
  VehicleRegistration,
  ServiceRegistration,
  DeliveryOrder,
  BannerAd,
  PayoutRequest,
  formatPrice,
  getListingPrimaryImage,
  getListingImages,
} from '../types';
import { supabase } from '../lib/supabase';
import { formatWhatsAppUrl } from './ListingDetailModal';
import { AdminBannerAdsManager } from './AdminBannerAdsManager';

interface AdminControlRoomProps {
  listings: Listing[];
  rechargeRequests: RechargeRequest[];
  profiles: UserProfile[];
  settings: AdminSetting[];
  shopRegistrations?: ShopRegistration[];
  vehicleRegistrations?: VehicleRegistration[];
  serviceRegistrations?: ServiceRegistration[];
  deliveryOrders?: DeliveryOrder[];
  bannerAds?: BannerAd[];
  payoutRequests?: PayoutRequest[];
  onRefresh: () => void;
  onViewListing: (listing: Listing) => void;
  onUpdateListingStatus: (id: string, status: string, isFeatured?: boolean, isPro?: boolean) => void;
  onApproveRecharge: (req: RechargeRequest) => void;
  onRejectRecharge: (id: string) => void;
  onToggleUserPro: (profile: UserProfile) => void;
  onUpdateUserRole: (id: string, newRole: string) => void;
  onUpdateDeliveryPartner?: (
    userId: string,
    isDeliveryPartner: boolean,
    partnerStatus: string,
    vehicleType?: string,
    vehicleNumber?: string
  ) => void;
  onSaveSetting: (key: string, value: string) => void;
  onApproveShopRegistration?: (id: string) => void;
  onRejectShopRegistration?: (id: string, reason?: string) => void;
  onApproveVehicleRegistration?: (id: string) => void;
  onRejectVehicleRegistration?: (id: string, reason?: string) => void;
  onApproveServiceRegistration?: (id: string) => void;
  onRejectServiceRegistration?: (id: string, reason?: string) => void;
  onVerifyOrderPayment?: (orderId: string, isApproved: boolean) => void;
  onCreateBannerAd?: (banner: Omit<BannerAd, 'id' | 'created_at'>) => Promise<void> | void;
  onUpdateBannerAd?: (id: string, updates: Partial<BannerAd>) => Promise<void> | void;
  onDeleteBannerAd?: (id: string) => Promise<void> | void;
  onToggleBannerAd?: (id: string, currentStatus: boolean) => Promise<void> | void;
  onToggleProfileApproval?: (profile: UserProfile, approved: boolean) => void;
  onApprovePayout?: (id: string) => Promise<void> | void;
  onRejectPayout?: (id: string, reason?: string) => Promise<void> | void;
}

export const AdminControlRoom: React.FC<AdminControlRoomProps> = ({
  listings,
  rechargeRequests,
  profiles,
  settings,
  shopRegistrations = [],
  vehicleRegistrations = [],
  serviceRegistrations = [],
  deliveryOrders = [],
  bannerAds = [],
  payoutRequests = [],
  onRefresh,
  onViewListing,
  onUpdateListingStatus,
  onApproveRecharge,
  onRejectRecharge,
  onToggleUserPro,
  onUpdateUserRole,
  onUpdateDeliveryPartner,
  onSaveSetting,
  onApproveShopRegistration,
  onRejectShopRegistration,
  onApproveVehicleRegistration,
  onRejectVehicleRegistration,
  onApproveServiceRegistration,
  onRejectServiceRegistration,
  onVerifyOrderPayment,
  onCreateBannerAd,
  onUpdateBannerAd,
  onDeleteBannerAd,
  onToggleBannerAd,
  onToggleProfileApproval,
  onApprovePayout,
  onRejectPayout,
}) => {
  const [adminTab, setAdminTab] = useState<
    | 'listings'
    | 'orders_verification'
    | 'registrations'
    | 'recharges'
    | 'members'
    | 'banner_ads'
    | 'settings'
    | 'services_jobs'
    | 'withdrawals'
  >('orders_verification');
  const [listingFilter, setListingFilter] = useState<'all' | 'pending' | 'active' | 'rejected'>('pending');
  const [orderFilter, setOrderFilter] = useState<
    'all' | 'pending_verification' | 'verified' | 'delivered_by_boy' | 'delivered' | 'rejected'
  >('pending_verification');
  const [rechargeFilter, setRechargeFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [regFilter, setRegFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [regTypeFilter, setRegTypeFilter] = useState<'all' | 'shops' | 'vehicles'>('all');
  const [regSearch, setRegSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [inspectDocUrl, setInspectDocUrl] = useState<string | null>(null);
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'users' | 'delivery_partners' | 'admins'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [serviceSearch, setServiceSearch] = useState('');
  const [payoutFilter, setPayoutFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('pending');
  const [payoutSearch, setPayoutSearch] = useState('');
  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);

  // Local settings editor state
  const upiSetting =
    settings.find((s) => s.key === 'upi_id' || s.key === 'admin_upi_id')?.value ||
    'merilocalbazaar@oksbi';
  const qrSetting =
    settings.find((s) => s.key === 'qr_code_url' || s.key === 'admin_qr_url')?.value ||
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${upiSetting}`;
  const appAlertSetting =
    settings.find((s) => s.key === 'app_broadcast_alert')?.value ||
    'Welcome to Meri Local Bazaar Admin Verified Platform';

  const [editUpi, setEditUpi] = useState(upiSetting);
  const [editQr, setEditQr] = useState(qrSetting);
  const [editAlert, setEditAlert] = useState(appAlertSetting);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  // Filtered Listings
  const filteredListings = listings.filter((l) => {
    if (listingFilter === 'all') return true;
    return l.status === listingFilter;
  });

  const pendingListingsCount = listings.filter((l) => l.status === 'pending').length;
  const pendingOrdersCount = deliveryOrders.filter(
    (o) => o.payment_status === 'pending_verification' || o.status === 'pending_verification'
  ).length;
  const pendingRechargesCount = rechargeRequests.filter((r) => r.status === 'pending').length;
  const pendingShopsCount = shopRegistrations.filter((s) => s.status === 'pending').length;
  const pendingVehiclesCount = vehicleRegistrations.filter((v) => v.status === 'pending').length;
  const totalPendingRegistrations = pendingShopsCount + pendingVehiclesCount;
  const pendingServicesCount = serviceRegistrations.filter(
    (s) => !s.is_approved && s.status !== 'rejected'
  ).length;
  const pendingPayoutsCount = payoutRequests.filter((p) => p.status === 'pending').length;

  // Filtered Payout Requests
  const filteredPayouts = payoutRequests.filter((p) => {
    if (payoutFilter !== 'all') {
      if (p.status !== payoutFilter) return false;
    }
    if (payoutSearch.trim()) {
      const q = payoutSearch.toLowerCase();
      return (
        p.user_name?.toLowerCase().includes(q) ||
        p.user_phone?.includes(q) ||
        p.upi_id?.toLowerCase().includes(q) ||
        p.user_role?.toLowerCase().includes(q) ||
        p.bank_name?.toLowerCase().includes(q) ||
        p.account_no?.includes(q) ||
        p.ifsc_code?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Services & Jobs Profiles
  const filteredServices = serviceRegistrations.filter((s) => {
    if (serviceFilter !== 'all') {
      if (serviceFilter === 'pending') {
        if (s.is_approved || s.status === 'rejected') return false;
      } else if (serviceFilter === 'approved') {
        if (!s.is_approved && s.status !== 'approved') return false;
      } else if (serviceFilter === 'rejected') {
        if (s.status !== 'rejected') return false;
      }
    }

    if (serviceSearch.trim()) {
      const q = serviceSearch.toLowerCase();
      return (
        s.full_name?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.experience?.toLowerCase().includes(q) ||
        s.city_locality?.toLowerCase().includes(q) ||
        s.service_address?.toLowerCase().includes(q) ||
        s.aadhaar_or_voter_no?.toLowerCase().includes(q) ||
        s.bio_skills?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Orders
  const filteredOrders = deliveryOrders.filter((o) => {
    if (orderFilter !== 'all') {
      if (orderFilter === 'pending_verification') {
        if (o.payment_status !== 'pending_verification' && o.status !== 'pending_verification')
          return false;
      } else if (orderFilter === 'verified') {
        if (
          o.payment_status !== 'verified' &&
          o.status !== 'pending' &&
          o.status !== 'out_for_delivery'
        )
          return false;
      } else if (orderFilter === 'delivered_by_boy') {
        if (o.status !== 'delivered_by_boy') return false;
      } else if (orderFilter === 'delivered') {
        if (o.status !== 'success' && o.status !== 'delivered') return false;
      } else if (orderFilter === 'rejected') {
        if (o.status !== 'rejected' && o.payment_status !== 'rejected') return false;
      }
    }

    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      return (
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q) ||
        o.transaction_id?.toLowerCase().includes(q) ||
        o.item_description?.toLowerCase().includes(q) ||
        o.pickup_address?.toLowerCase().includes(q) ||
        o.delivery_address?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Recharges
  const filteredRecharges = rechargeRequests.filter((r) => {
    if (rechargeFilter === 'all') return true;
    return r.status === rechargeFilter;
  });

  // Filtered Registrations (Shops & Vehicles)
  const filteredShops = shopRegistrations.filter((s) => {
    if (regFilter !== 'all' && s.status !== regFilter) return false;
    if (regSearch) {
      const q = regSearch.toLowerCase();
      return (
        s.shop_name.toLowerCase().includes(q) ||
        s.owner_name.toLowerCase().includes(q) ||
        s.shop_id_no.toLowerCase().includes(q) ||
        s.user_phone.includes(q)
      );
    }
    return true;
  });

  const filteredVehicles = vehicleRegistrations.filter((v) => {
    if (regFilter !== 'all' && v.status !== regFilter) return false;
    if (regSearch) {
      const q = regSearch.toLowerCase();
      const vehNo = (v.vehicle_reg_no || v.vehicle_number || '').toLowerCase();
      const driverName = (v.driver_name || '').toLowerCase();
      const dlNo = (v.driving_license_no || '').toLowerCase();
      const phone = (v.driver_phone || '').toLowerCase();
      const model = (v.vehicle_model || v.vehicle_type || '').toLowerCase();
      return (
        vehNo.includes(q) ||
        driverName.includes(q) ||
        dlNo.includes(q) ||
        phone.includes(q) ||
        model.includes(q)
      );
    }
    return true;
  });

  // Filtered Profiles
  const filteredProfiles = profiles.filter((p) => {
    if (
      userRoleFilter === 'users' &&
      (p.role === 'admin' ||
        p.role === 'super_admin' ||
        p.role === 'delivery_partner' ||
        p.is_delivery_partner)
    )
      return false;
    if (userRoleFilter === 'admins' && p.role !== 'admin' && p.role !== 'super_admin') return false;
    if (
      userRoleFilter === 'delivery_partners' &&
      p.role !== 'delivery_partner' &&
      !p.is_delivery_partner &&
      !p.vehicle_number &&
      !p.partner_status
    )
      return false;

    const q = userSearch.toLowerCase();
    return (
      (p.full_name && p.full_name.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.vehicle_number && p.vehicle_number.toLowerCase().includes(q)) ||
      (p.vehicle_type && p.vehicle_type.toLowerCase().includes(q)) ||
      (p.payout_upi_id && p.payout_upi_id.toLowerCase().includes(q))
    );
  });

  const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await onSaveSetting('upi_id', editUpi);
      await onSaveSetting('admin_upi_id', editUpi);
      await onSaveSetting('qr_code_url', editQr);
      await onSaveSetting('admin_qr_url', editQr);
      await onSaveSetting('app_broadcast_alert', editAlert);
      setSettingsSavedSuccess(true);
      setTimeout(() => setSettingsSavedSuccess(false), 3000);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Dashboard Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight">Admin Control Room</h2>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  100% Prepaid Protocol
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized moderation & authorization hub for Meri Local Bazaar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onRefresh}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync DB
            </button>
          </div>
        </div>

        {/* Core Admin Tabs Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-9 gap-2 mt-6 pt-6 border-t border-slate-800">
          <button
            onClick={() => setAdminTab('orders_verification')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'orders_verification'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" /> Orders Pay
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">{deliveryOrders.length} Orders</div>
            </div>
            {pendingOrdersCount > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full animate-pulse">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('listings')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'listings'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>1. Listings</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">{listings.length} Listings</div>
            </div>
            {pendingListingsCount > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full">
                {pendingListingsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('registrations')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'registrations'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" />
                <span>2. Regs</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {shopRegistrations.length + vehicleRegistrations.length} Shops
              </div>
            </div>
            {totalPendingRegistrations > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full">
                {totalPendingRegistrations}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('recharges')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'recharges'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>3. Recharge</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">{rechargeRequests.length} Pay</div>
            </div>
            {pendingRechargesCount > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full">
                {pendingRechargesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('members')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'members'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>4. Accounts</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">{profiles.length} Users</div>
            </div>
            <Users className="w-4 h-4 opacity-70" />
          </button>

          <button
            onClick={() => setAdminTab('banner_ads')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'banner_ads'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5" />
                <span>5. Banner Ads</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {bannerAds.filter((b) => b.is_active).length} Active
              </div>
            </div>
            <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full">
              {bannerAds.length}
            </span>
          </button>

          <button
            onClick={() => setAdminTab('settings')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'settings'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" />
                <span>6. QR & UPI</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">Settings</div>
            </div>
            <SettingsIcon className="w-4 h-4 opacity-70" />
          </button>

          <button
            onClick={() => setAdminTab('services_jobs')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'services_jobs'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" />
                <span>7. Local Services</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {pendingServicesCount > 0 ? (
                  <span className="text-amber-400 font-bold">{pendingServicesCount} Pending</span>
                ) : (
                  <span>{serviceRegistrations.length} Profiles</span>
                )}
              </div>
            </div>
            {pendingServicesCount > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full">
                {pendingServicesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('withdrawals')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'withdrawals'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>8. Withdrawal Requests</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {pendingPayoutsCount > 0 ? (
                  <span className="text-amber-400 font-bold">{pendingPayoutsCount} Pending</span>
                ) : (
                  <span>{payoutRequests.length} Requests</span>
                )}
              </div>
            </div>
            {pendingPayoutsCount > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full animate-pulse">
                {pendingPayoutsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* FULL DOCUMENT / PAYMENT SCREENSHOT INSPECT MODAL */}
      {inspectDocUrl && (
        <div
          onClick={() => setInspectDocUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-4 max-w-2xl w-full max-h-[90vh] flex flex-col space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" /> Payment & Verification Proof Inspector
              </span>
              <button
                onClick={() => setInspectDocUrl(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-950 rounded-2xl p-2 flex items-center justify-center">
              <img
                src={inspectDocUrl}
                alt="Document proof inspection"
                className="max-h-[70vh] object-contain rounded-xl"
              />
            </div>
            <div className="text-center">
              <a
                href={inspectDocUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-orange-600 hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open original image in new tab
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 0: ORDER & ADVANCE PAYMENT VERIFICATION PANEL (NEW PART 1 & 3) */}
      {/* ========================================================================= */}
      {adminTab === 'orders_verification' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-600" />
                Customer Order Advance Payment Verification
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect Buyer Transaction ID (UTR) and Payment Screenshot before verifying orders for Delivery Partner dispatch.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
              {(
                [
                  { id: 'pending_verification', label: 'Pending Verif' },
                  { id: 'verified', label: 'Active / In-Transit' },
                  { id: 'delivered_by_boy', label: 'Delivered by Driver' },
                  { id: 'delivered', label: 'Delivered Successfully' },
                  { id: 'rejected', label: 'Rejected' },
                  { id: 'all', label: 'All Orders' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setOrderFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    orderFilter === f.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by Order No (ORD-...), Customer Name, Phone, Transaction ID / UTR, Address..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-600">No orders found</div>
              <p className="text-xs text-slate-400 mt-0.5">
                {orderFilter === 'pending_verification'
                  ? 'All customer prepaid advance payments have been verified!'
                  : 'Try selecting a different filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((ord) => {
                const isPendingVerif =
                  ord.payment_status === 'pending_verification' || ord.status === 'pending_verification';

                return (
                  <div
                    key={ord.id}
                    className={`border rounded-2xl p-4 sm:p-5 transition shadow-xs ${
                      isPendingVerif
                        ? 'bg-amber-50/50 border-amber-300/80 ring-2 ring-amber-400/20'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Order & Customer Details */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded-md">
                            {ord.order_number}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                              ord.payment_status === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.payment_status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}
                          >
                            Payment: {ord.payment_status || 'pending_verification'}
                          </span>

                          {ord.status === 'success' || (ord.status === 'delivered' && ord.buyer_confirmed) ? (
                            <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3" /> Delivered Successfully
                            </span>
                          ) : ord.status === 'delivered_by_boy' ? (
                            <span className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Delivered by Driver (Awaiting Buyer Confirmation)
                            </span>
                          ) : ord.status === 'out_for_delivery' ? (
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Truck className="w-3 h-3" /> Out for Delivery
                            </span>
                          ) : (
                            <span className="bg-slate-800 text-slate-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Status: {ord.status}
                            </span>
                          )}

                          {ord.fulfillment_type === 'self_pickup' && (
                            <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Self-Pickup
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-slate-900 text-base">
                          {ord.item_description}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                          <div>
                            <span className="font-bold text-slate-800">Customer:</span>{' '}
                            <span>{ord.customer_name}</span> ({ord.customer_phone})
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">Delivery Fare:</span>{' '}
                            <span className="font-mono font-black text-emerald-600">₹{ord.total_fare}</span>{' '}
                            <span className="text-[10px] text-slate-400">
                              (Rider: ₹{ord.partner_earning} / App: ₹{ord.app_commission})
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">Route:</span>{' '}
                            <span className="truncate">{ord.pickup_address} ➔ {ord.delivery_address}</span>
                          </div>
                        </div>

                        {/* Transaction ID & Screenshot */}
                        <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">Bank UTR / Trans ID:</span>
                            <span className="font-mono font-black text-orange-600 bg-white px-2 py-0.5 rounded border border-slate-200 select-all">
                              {ord.transaction_id || 'Not provided'}
                            </span>
                          </div>

                          {ord.payment_screenshot_url && (
                            <button
                              onClick={() => setInspectDocUrl(ord.payment_screenshot_url || null)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 transition flex items-center gap-1.5 shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-orange-600" />
                              Inspect Payment Screenshot
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right: Verification Buttons */}
                      <div className="flex lg:flex-col items-center justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        {isPendingVerif ? (
                          <>
                            <button
                              onClick={() => onVerifyOrderPayment?.(ord.id, true)}
                              className="flex-1 lg:w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              ✓ Approve & Verify
                            </button>
                            <button
                              onClick={() => onVerifyOrderPayment?.(ord.id, false)}
                              className="flex-1 lg:w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <XCircle className="w-4 h-4" />
                              ✕ Reject Payment
                            </button>
                          </>
                        ) : (
                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl">
                              ✓ Verified by Admin
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: LISTINGS MODERATION */}
      {/* ========================================================================= */}
      {adminTab === 'listings' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Marketplace Classifieds Listings</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and approve community posts before they appear on the public feed.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['pending', 'active', 'rejected', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setListingFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                    listingFilter === f
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredListings.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-white">
                    <img
                      src={getListingPrimaryImage(item)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {getListingImages(item).length > 1 && (
                      <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] font-bold px-1 rounded">
                        {getListingImages(item).length}p
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                        {item.title}
                      </h4>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          item.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.is_featured && (
                        <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded shadow-2xs">
                          ⭐ FEATURED
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-black text-emerald-600">₹{formatPrice(item.price)}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>Seller: {item.seller_name || 'Anonymous'}</span>
                      <span>•</span>
                      <span>{item.location_name || 'Meghalaya'}</span>
                      <span>•</span>
                      <span>Cat: {item.category_name}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onViewListing(item)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition"
                  >
                    View Details
                  </button>
                  {item.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onUpdateListingStatus(item.id, 'active')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => onUpdateListingStatus(item.id, 'rejected')}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition"
                      >
                        ✕ Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SHOPS & VEHICLE REGISTRATIONS */}
      {/* ========================================================================= */}
      {adminTab === 'registrations' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Business & Fleet Verification Requests
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect Shop Trade Licenses, GSTIN, and Driver Driving Licenses (DL & RC).
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setRegTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    regTypeFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({shopRegistrations.length + vehicleRegistrations.length})
                </button>
                <button
                  onClick={() => setRegTypeFilter('shops')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    regTypeFilter === 'shops'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Shops ({shopRegistrations.length})
                </button>
                <button
                  onClick={() => setRegTypeFilter('vehicles')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    regTypeFilter === 'vehicles'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Vehicles ({vehicleRegistrations.length})
                </button>
              </div>
            </div>
          </div>

          {/* Registrations List */}
          <div className="space-y-4">
            {filteredShops.map((shop) => (
              <div
                key={shop.id}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-base">{shop.shop_name}</span>
                      <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Shop: {shop.category}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          shop.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : shop.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {shop.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <strong>License ({shop.shop_id_proof_type}):</strong>{' '}
                        <span className="font-mono text-orange-700 font-bold">{shop.shop_id_no}</span>
                      </div>
                      <div>
                        <strong>Owner ({shop.owner_id_type}):</strong>{' '}
                        <span>{shop.owner_name}</span> ({shop.user_phone})
                      </div>
                      <div>
                        <strong>Address:</strong> <span>{shop.shop_address}</span>
                      </div>
                      <div>
                        <strong>Payout UPI:</strong>{' '}
                        <span className="font-mono text-emerald-700 font-bold">
                          {shop.payout_upi_id || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {shop.owner_id_proof_url && (
                    <button
                      onClick={() => setInspectDocUrl(shop.owner_id_proof_url || null)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-orange-600" />
                      Doc Proof
                    </button>
                  )}
                  {shop.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => onApproveShopRegistration?.(shop.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept & Approve Shop
                      </button>
                      <button
                        onClick={() => onRejectShopRegistration?.(shop.id)}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject Shop
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onApproveShopRegistration?.(shop.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                          shop.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700'
                        }`}
                      >
                        {shop.status === 'approved' ? '✓ Approved' : 'Set Approved'}
                      </button>
                      <button
                        onClick={() => onRejectShopRegistration?.(shop.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                          shop.status === 'rejected'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700'
                        }`}
                      >
                        {shop.status === 'rejected' ? '✕ Rejected' : 'Set Rejected'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredVehicles.map((veh) => (
              <div
                key={veh.id}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-base">
                        {veh.vehicle_model} ({veh.vehicle_reg_no || veh.vehicle_number || 'Registered'})
                      </span>
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {veh.vehicle_type}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          veh.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : veh.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {veh.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <strong>Driver:</strong> <span>{veh.driver_name}</span> ({veh.driver_phone})
                      </div>
                      <div>
                        <strong>DL No:</strong>{' '}
                        <span className="font-mono text-blue-700 font-bold">{veh.driving_license_no}</span>
                      </div>
                      <div>
                        <strong>Route:</strong> <span>{veh.operational_route}</span>
                      </div>
                      <div>
                        <strong>Payout UPI:</strong>{' '}
                        <span className="font-mono text-emerald-700 font-bold">
                          {veh.payout_upi_id || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {veh.driving_license_proof_url && (
                    <button
                      onClick={() => setInspectDocUrl(veh.driving_license_proof_url || null)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      DL Proof
                    </button>
                  )}
                  {veh.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => onApproveVehicleRegistration?.(veh.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept & Approve Vehicle
                      </button>
                      <button
                        onClick={() => onRejectVehicleRegistration?.(veh.id)}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject Vehicle
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onApproveVehicleRegistration?.(veh.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                          veh.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700'
                        }`}
                      >
                        {veh.status === 'approved' ? '✓ Approved' : 'Set Approved'}
                      </button>
                      <button
                        onClick={() => onRejectVehicleRegistration?.(veh.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                          veh.status === 'rejected'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700'
                        }`}
                      >
                        {veh.status === 'rejected' ? '✕ Rejected' : 'Set Rejected'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RECHARGE REQUESTS */}
      {/* ========================================================================= */}
      {adminTab === 'recharges' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">VIP PRO Membership Upgrades</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify customer UTR payments for VIP badge & featured ad boosts.
              </p>
            </div>

            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setRechargeFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                    rechargeFilter === f
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredRecharges.map((req) => (
              <div
                key={req.id}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">{req.user_name}</span>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      ({req.user_phone})
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-3">
                    <span>Plan: <strong>{req.plan_name}</strong></span>
                    <span>•</span>
                    <span className="text-emerald-600 font-bold font-mono">₹{req.amount}</span>
                    <span>•</span>
                    <span>UTR: <strong className="font-mono text-orange-600 select-all">{req.utr}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {req.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => onApproveRecharge(req)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept & Activate PRO
                      </button>
                      <button
                        onClick={() => onRejectRecharge(req.id)}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject Request
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onApproveRecharge(req)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                          req.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700'
                        }`}
                      >
                        {req.status === 'approved' ? '✓ PRO Active' : 'Activate PRO'}
                      </button>
                      <button
                        onClick={() => onRejectRecharge(req.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                          req.status === 'rejected'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700'
                        }`}
                      >
                        {req.status === 'rejected' ? '✕ Rejected' : 'Set Rejected'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PARTNERS & USERS DIRECTORY */}
      {/* ========================================================================= */}
      {adminTab === 'members' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Community Members & Delivery Partner Fleet Directory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect registered users, riders, bank payout UPI accounts, and assign permissions.
              </p>
            </div>

            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'delivery_partners', label: 'Delivery Fleet' },
                  { id: 'users', label: 'Users' },
                  { id: 'admins', label: 'Admins' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setUserRoleFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    userRoleFilter === f.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredProfiles.map((p) => {
              const isPartner = p.is_delivery_partner || p.role === 'delivery_partner';
              const dlNumber = p.driving_license || p.driving_license_no;
              const vehPlate = p.vehicle_number || p.vehicle_rc_no;
              const isApproved = !!p.is_approved_by_admin;

              return (
                <div
                  key={p.id}
                  className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-base">
                        {p.full_name || 'Anonymous User'}
                      </span>
                      {p.is_pro && (
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> PRO Member
                        </span>
                      )}
                      {isPartner && (
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Truck className="w-3 h-3" /> Rider: {p.vehicle_type || 'Bike'} ({p.partner_status})
                        </span>
                      )}
                      {p.shop_name && (
                        <span className="bg-orange-100 text-orange-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Store className="w-3 h-3" /> Shop: {p.shop_name}
                        </span>
                      )}
                      {/* is_approved_by_admin Badge */}
                      {isApproved ? (
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Admin Approved
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" /> Pending Admin Approval
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1">
                      <div>
                        <strong>Phone:</strong> {p.phone || 'N/A'} • <strong>Email:</strong> {p.email || 'N/A'}
                      </div>
                      <div>
                        <strong>Payout UPI:</strong>{' '}
                        <span className="font-mono text-emerald-700 font-bold">
                          {p.payout_upi_id || 'Not registered'}
                        </span>
                      </div>
                      {dlNumber && (
                        <div>
                          <strong>Driving License:</strong>{' '}
                          <span className="font-mono text-blue-700 font-bold">{dlNumber}</span>
                        </div>
                      )}
                      {vehPlate && (
                        <div>
                          <strong>Vehicle / RC:</strong>{' '}
                          <span className="font-mono text-slate-800 font-bold">{vehPlate}</span>{' '}
                          {p.vehicle_model && <span>({p.vehicle_model})</span>}
                        </div>
                      )}
                      {p.shop_name && (
                        <div>
                          <strong>Shop Details:</strong> {p.shop_name} • {p.shop_category || 'General'} • {p.shop_address || p.city_locality || 'Tura'}
                        </div>
                      )}
                      {p.payout_bank_name && (
                        <div>
                          <strong>Bank:</strong> {p.payout_bank_name} • <strong>A/C:</strong>{' '}
                          {p.payout_account_no} • <strong>IFSC:</strong> {p.payout_ifsc_code}
                        </div>
                      )}
                    </div>

                    {/* Rider Verification ID Proof Document Links */}
                    {isPartner && (
                      <div className="pt-2 mt-2 border-t border-slate-200/80 flex items-center gap-2.5 flex-wrap">
                        <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                          <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                          Driver ID Verification:
                        </span>

                        {/* 1. Aadhaar Proof Link */}
                        {(p.identity_url || p.aadhaar_url || p.aadhaar_proof_url || p.owner_id_proof_url) ? (
                          <a
                            href={p.identity_url || p.aadhaar_url || p.aadhaar_proof_url || p.owner_id_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition shadow-2xs hover:shadow-xs cursor-pointer"
                            title="Open full-size Aadhaar proof in a new browser tab"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-700" />
                            <span>View Aadhaar Proof</span>
                            <ExternalLink className="w-3 h-3 text-amber-700 opacity-80" />
                          </a>
                        ) : p.aadhaar_number || p.owner_id_no ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-mono font-bold">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            Aadhaar: {p.aadhaar_number || p.owner_id_no}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-[11px]">
                            <FileText className="w-3 h-3 text-slate-400" />
                            Aadhaar Not Uploaded
                          </span>
                        )}

                        {/* 2. Driving License Link */}
                        {(p.driving_license_url || p.driving_license_proof_url) ? (
                          <a
                            href={p.driving_license_url || p.driving_license_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-xl text-xs font-bold transition shadow-2xs hover:shadow-xs cursor-pointer"
                            title="Open full-size Driving License in a new browser tab"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-blue-700" />
                            <span>View Driving License</span>
                            <ExternalLink className="w-3 h-3 text-blue-700 opacity-80" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-[11px]">
                            <FileCheck className="w-3 h-3 text-slate-400" />
                            Driving License Not Uploaded
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-2 shrink-0">
                    {(p.driving_license_proof_url || p.owner_id_proof_url) && (
                      <button
                        onClick={() => setInspectDocUrl(p.driving_license_proof_url || p.owner_id_proof_url || null)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        Doc Proof
                      </button>
                    )}

                    {/* Toggle is_approved_by_admin Button */}
                    <button
                      onClick={() => onToggleProfileApproval?.(p, !isApproved)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs cursor-pointer ${
                        isApproved
                          ? 'bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                      title={isApproved ? 'Click to revoke admin verification' : 'Click to grant official admin verified status'}
                    >
                      {isApproved ? (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          Revoke Approval
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve Profile
                        </>
                      )}
                    </button>

                    {/* Delivery Partner specific actions */}
                    {isPartner && (
                      p.partner_status === 'pending' ? (
                        <>
                          <button
                            onClick={() =>
                              onUpdateDeliveryPartner?.(
                                p.id,
                                true,
                                'approved',
                                p.vehicle_type,
                                p.vehicle_number
                              )
                            }
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Accept & Approve Rider
                          </button>
                          <button
                            onClick={() =>
                              onUpdateDeliveryPartner?.(
                                p.id,
                                false,
                                'rejected',
                                p.vehicle_type,
                                p.vehicle_number
                              )
                            }
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject Rider
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              onUpdateDeliveryPartner?.(
                                p.id,
                                p.partner_status !== 'approved',
                                p.partner_status === 'approved' ? 'suspended' : 'approved',
                                p.vehicle_type,
                                p.vehicle_number
                              )
                            }
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                              p.partner_status === 'approved'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-blue-50'
                            }`}
                          >
                            {p.partner_status === 'approved' ? '✓ Rider Active' : 'Activate Rider'}
                          </button>
                        </div>
                      )
                    )}
                    <button
                      onClick={() => onToggleUserPro(p)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition"
                    >
                      {p.is_pro ? 'Remove PRO' : 'Grant PRO'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ADMIN CONFIGURATION & QR */}
      {/* ========================================================================= */}
      {adminTab === 'settings' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900">Admin Payment & QR Configuration</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Set the centralized Admin UPI ID and Dynamic QR Code used for customer advance checkout payments & PRO recharges.
            </p>
          </div>

          <form onSubmit={handleSaveAllSettings} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Central Admin UPI ID *
              </label>
              <input
                type="text"
                required
                value={editUpi}
                onChange={(e) => setEditUpi(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Dynamic UPI Payment QR Code Image URL *
              </label>
              <input
                type="text"
                required
                value={editQr}
                onChange={(e) => setEditQr(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            {/* QR Preview */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
              <img
                src={
                  editQr ||
                  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${editUpi}`
                }
                alt="QR Preview"
                className="w-24 h-24 bg-white p-2 rounded-xl border border-slate-200 object-contain"
              />
              <div>
                <div className="text-xs font-bold text-slate-800">Live QR Preview</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Payable to: <span className="font-mono text-orange-600 font-bold">{editUpi}</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center gap-2"
              >
                <SettingsIcon className="w-4 h-4" />
                {savingSettings ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>

          {/* Banner Ads Management Section inside Settings */}
          <div className="pt-8 border-t border-slate-200">
            <AdminBannerAdsManager
              bannerAds={bannerAds}
              onCreateBanner={onCreateBannerAd || (async () => {})}
              onUpdateBanner={onUpdateBannerAd || (async () => {})}
              onDeleteBanner={onDeleteBannerAd || (async () => {})}
              onToggleActive={onToggleBannerAd || (async () => {})}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: DEDICATED BANNER ADS MANAGEMENT */}
      {/* ========================================================================= */}
      {adminTab === 'banner_ads' && (
        <AdminBannerAdsManager
          bannerAds={bannerAds}
          onCreateBanner={onCreateBannerAd || (async () => {})}
          onUpdateBanner={onUpdateBannerAd || (async () => {})}
          onDeleteBanner={onDeleteBannerAd || (async () => {})}
          onToggleActive={onToggleBannerAd || (async () => {})}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 7: LOCAL SERVICES & JOBS VERIFICATION PANEL */}
      {/* ========================================================================= */}
      {adminTab === 'services_jobs' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                <Briefcase className="w-3.5 h-3.5 text-orange-600" /> Admin Verification Panel
              </div>
              <h3 className="text-xl font-black text-slate-900">Local Services & Jobs Verification</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review submitted profiles from technicians, skilled workers, mechanics, and job applicants. Verify identity proof before granting official approval.
              </p>
            </div>

            {/* Quick Status Stats */}
            <div className="flex items-center gap-2">
              <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                <div className="text-[10px] font-bold text-amber-700 uppercase">Pending</div>
                <div className="text-base font-black text-amber-900">{pendingServicesCount}</div>
              </div>
              <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Approved</div>
                <div className="text-base font-black text-emerald-900">
                  {serviceRegistrations.filter((s) => s.is_approved || s.status === 'approved').length}
                </div>
              </div>
              <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <div className="text-[10px] font-bold text-slate-600 uppercase">Total</div>
                <div className="text-base font-black text-slate-900">{serviceRegistrations.length}</div>
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
              <button
                onClick={() => setServiceFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  serviceFilter === 'pending'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Pending Verification ({pendingServicesCount})
              </button>
              <button
                onClick={() => setServiceFilter('approved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  serviceFilter === 'approved'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approved Profiles
              </button>
              <button
                onClick={() => setServiceFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  serviceFilter === 'rejected'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                Rejected
              </button>
              <button
                onClick={() => setServiceFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  serviceFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Submissions ({serviceRegistrations.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, phone, category..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
              {serviceSearch && (
                <button
                  onClick={() => setServiceSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* List of Submissions */}
          {filteredServices.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-700">No profile submission requests found</p>
              <p className="text-xs text-slate-500">
                {serviceFilter === 'pending'
                  ? 'All local services and job applicants have been reviewed.'
                  : 'Try clearing your search query or switching tabs.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredServices.map((item) => {
                const isApproved = item.is_approved || item.status === 'approved';
                const isRejected = item.status === 'rejected';

                return (
                  <div
                    key={item.id}
                    className={`p-5 sm:p-6 rounded-3xl border transition shadow-2xs ${
                      isApproved
                        ? 'bg-emerald-50/20 border-emerald-200'
                        : isRejected
                        ? 'bg-red-50/20 border-red-200'
                        : 'bg-white border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                      {/* Profile Primary Info */}
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base sm:text-lg font-black text-slate-900">
                            {item.full_name}
                          </h4>

                          {/* Category Badge */}
                          <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200 flex items-center gap-1">
                            <Wrench className="w-3 h-3 text-orange-600" />
                            {item.category}
                          </span>

                          {/* Experience Badge */}
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 flex items-center gap-1">
                            <Award className="w-3 h-3 text-blue-600" />
                            {item.experience} Experience
                          </span>

                          {/* Status Badge */}
                          {isApproved ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Approved Profile
                            </span>
                          ) : isRejected ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-black border border-red-200 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              Rejected
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-300 flex items-center gap-1 animate-pulse">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              Pending Verification
                            </span>
                          )}
                        </div>

                        {/* Detail Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 font-medium block">Phone / Contact:</span>
                            <span className="font-bold text-slate-800 font-mono">{item.phone}</span>
                          </div>

                          <div>
                            <span className="text-slate-400 font-medium block">Category / Trade:</span>
                            <span className="font-bold text-slate-800">{item.category}</span>
                          </div>

                          <div>
                            <span className="text-slate-400 font-medium block">Total Experience:</span>
                            <span className="font-bold text-slate-800">{item.experience}</span>
                          </div>

                          {item.city_locality && (
                            <div>
                              <span className="text-slate-400 font-medium block">Locality / City:</span>
                              <span className="font-bold text-slate-800 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {item.city_locality}
                              </span>
                            </div>
                          )}

                          {item.service_address && (
                            <div>
                              <span className="text-slate-400 font-medium block">Service Address:</span>
                              <span className="font-bold text-slate-800">{item.service_address}</span>
                            </div>
                          )}

                          {item.hourly_or_daily_rate && (
                            <div>
                              <span className="text-slate-400 font-medium block">Expected Rate:</span>
                              <span className="font-bold text-emerald-700">{item.hourly_or_daily_rate}</span>
                            </div>
                          )}

                          {item.aadhaar_or_voter_no && (
                            <div>
                              <span className="text-slate-400 font-medium block">ID Proof Number:</span>
                              <span className="font-mono font-bold text-slate-800">{item.aadhaar_or_voter_no}</span>
                            </div>
                          )}

                          {item.payout_upi_id && (
                            <div>
                              <span className="text-slate-400 font-medium block">Payout UPI:</span>
                              <span className="font-mono font-bold text-orange-600">{item.payout_upi_id}</span>
                            </div>
                          )}

                          <div>
                            <span className="text-slate-400 font-medium block">Submitted Date:</span>
                            <span className="font-medium text-slate-600">
                              {new Date(item.created_at).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Bio / Skills Description */}
                        {item.bio_skills && (
                          <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                            <span className="font-bold text-slate-700 block mb-0.5">Skills & Profile Bio:</span>
                            <p className="leading-relaxed">{item.bio_skills}</p>
                          </div>
                        )}

                        {/* IDENTITY PROOF DOCUMENT IMAGE FROM SUPABASE STORAGE */}
                        <div className="pt-2">
                          <span className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                            <FileCheck className="w-4 h-4 text-emerald-600" /> Identity Proof Document Image:
                          </span>

                          {item.identity_proof_url ? (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                              <img
                                src={item.identity_proof_url}
                                alt={`Identity Proof - ${item.full_name}`}
                                onClick={() => setInspectDocUrl(item.identity_proof_url || null)}
                                className="w-20 h-16 object-cover rounded-xl border border-slate-300 shadow-xs cursor-pointer hover:opacity-90 transition"
                              />

                              <div className="space-y-1">
                                <a
                                  href={item.identity_proof_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-black text-orange-600 hover:text-orange-700 underline inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  View Identity Proof Document Image (Supabase Storage)
                                </a>
                                <p className="text-[11px] text-slate-500">
                                  Click the text link or image preview to view the full resolution document in a new tab.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              No identity proof document URL uploaded for this profile.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Control Panel */}
                      <div className="flex lg:flex-col items-center justify-end gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200 shrink-0">
                        {/* Direct Contact Links */}
                        <div className="flex items-center gap-1.5 w-full">
                          <a
                            href={`tel:${item.phone}`}
                            className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </a>
                          {(() => {
                            const rawPhone = (item.whatsapp || item.phone || '').replace(/\D/g, '');
                            const formattedPhone = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
                            const waText = encodeURIComponent(
                              `Hello ${item.full_name}, regarding your Local Services & Jobs profile verification on Meri Local Bazaar:`
                            );
                            return (
                              <a
                                href={`https://wa.me/${formattedPhone}?text=${waText}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                              >
                                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                              </a>
                            );
                          })()}
                        </div>

                        {/* Approve Profile Button */}
                        <button
                          type="button"
                          onClick={() => onApproveServiceRegistration?.(item.id)}
                          className={`w-full px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {isApproved ? 'Approved (Click to Re-verify)' : 'Approve Profile'}
                        </button>

                        {/* Reject Profile Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const reason = window.prompt(
                              'Please enter reason for rejection (optional):',
                              'Identity proof document unclear or details could not be verified.'
                            );
                            if (reason !== null) {
                              onRejectServiceRegistration?.(item.id, reason);
                            }
                          }}
                          className={`w-full px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            isRejected
                              ? 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
                              : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          {isRejected ? 'Rejected (Click to Update)' : 'Reject Profile'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. WITHDRAWAL & PAYOUT REQUESTS PANEL */}
      {/* ========================================================================= */}
      {adminTab === 'withdrawals' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Settlement & Payout Hub
              </div>
              <h3 className="text-xl font-black text-slate-900">8. Withdrawal & Payout Requests</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage earnings withdrawal requests from Delivery Riders and Shopkeeper Merchants. Verify UPI ID or Bank details and confirm settlement status.
              </p>
            </div>

            {/* Status Statistics */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-center min-w-[85px]">
                <div className="text-[10px] font-bold text-amber-700 uppercase">Pending</div>
                <div className="text-base font-black text-amber-900">{pendingPayoutsCount}</div>
              </div>
              <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-center min-w-[85px]">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Completed</div>
                <div className="text-base font-black text-emerald-900">
                  {payoutRequests.filter((p) => p.status === 'completed').length}
                </div>
              </div>
              <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-center min-w-[95px]">
                <div className="text-[10px] font-bold text-slate-600 uppercase">Pending Total</div>
                <div className="text-base font-black text-slate-900">
                  ₹{formatPrice(
                    payoutRequests
                      .filter((p) => p.status === 'pending')
                      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
              <button
                onClick={() => setPayoutFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  payoutFilter === 'pending'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Pending ({pendingPayoutsCount})
              </button>
              <button
                onClick={() => setPayoutFilter('completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  payoutFilter === 'completed'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </button>
              <button
                onClick={() => setPayoutFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  payoutFilter === 'rejected'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                Rejected
              </button>
              <button
                onClick={() => setPayoutFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  payoutFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Requests ({payoutRequests.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search rider, phone, UPI..."
                value={payoutSearch}
                onChange={(e) => setPayoutSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
              {payoutSearch && (
                <button
                  onClick={() => setPayoutSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* List of Payout Requests */}
          {filteredPayouts.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-2">
              <DollarSign className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">No Payout Requests Found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {payoutSearch
                  ? 'No withdrawal requests match your search filter.'
                  : `There are currently no ${payoutFilter !== 'all' ? payoutFilter : ''} payout requests in the database.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayouts.map((req) => {
                const isPending = req.status === 'pending';
                const isCompleted = req.status === 'completed';
                const isRejected = req.status === 'rejected';

                const rawPhone = (req.user_phone || '').replace(/\D/g, '');
                const formattedPhone = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;

                return (
                  <div
                    key={req.id}
                    className={`p-5 rounded-3xl border transition ${
                      isPending
                        ? 'bg-amber-50/40 border-amber-200 shadow-sm'
                        : isCompleted
                        ? 'bg-emerald-50/20 border-emerald-200'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      {/* Left: Driver / Merchant Info & Amount */}
                      <div className="space-y-3 flex-1">
                        <div className="flex items-start justify-between sm:justify-start sm:items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
                            {req.user_name ? req.user_name.charAt(0).toUpperCase() : 'U'}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-base font-black text-slate-900">{req.user_name || 'Driver / Merchant'}</h4>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                                {req.user_role || 'Delivery Partner'}
                              </span>

                              {/* Status Badge */}
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  isPending
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                    : isCompleted
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-red-100 text-red-800 border border-red-300'
                                }`}
                              >
                                {req.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                              <span className="flex items-center gap-1 font-medium text-slate-700">
                                <Phone className="w-3 h-3 text-slate-400" /> {req.user_phone}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {new Date(req.created_at).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Amount & Destination Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {/* Requested Amount Card */}
                          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Withdrawal Amount
                              </div>
                              <div className="text-xl font-black text-emerald-600">
                                ₹{formatPrice(req.amount)}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                              Direct Payout
                            </span>
                          </div>

                          {/* Bank / UPI Destination Card */}
                          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Payout UPI ID
                              </span>
                              {req.upi_id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(req.upi_id);
                                    setCopiedUpi(req.id);
                                    setTimeout(() => setCopiedUpi(null), 2000);
                                  }}
                                  className="text-[10px] font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  {copiedUpi === req.id ? 'Copied!' : 'Copy UPI'}
                                </button>
                              )}
                            </div>

                            <div className="font-mono text-xs font-bold text-slate-900 truncate">
                              {req.upi_id || 'No UPI Specified'}
                            </div>

                            {req.bank_name && (
                              <div className="text-[11px] text-slate-600 pt-0.5 border-t border-slate-100 flex items-center gap-1">
                                <span className="font-semibold text-slate-700">{req.bank_name}</span>
                                {req.account_no && <span className="text-slate-400">• A/C: {req.account_no}</span>}
                                {req.ifsc_code && <span className="text-slate-400">• IFSC: {req.ifsc_code}</span>}
                              </div>
                            )}
                          </div>
                        </div>

                        {req.admin_notes && (
                          <div className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                            <span className="font-bold text-slate-800">Admin Note:</span> {req.admin_notes}
                          </div>
                        )}
                      </div>

                      {/* Right: Direct Actions */}
                      <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-center">
                        {/* Instant UPI Payment Trigger */}
                        {req.upi_id && isPending && (
                          <a
                            href={`upi://pay?pa=${req.upi_id}&pn=${encodeURIComponent(
                              req.user_name || 'Partner'
                            )}&am=${req.amount}&cu=INR`}
                            className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <QrCode className="w-3.5 h-3.5 text-amber-400" /> Open UPI App & Pay
                          </a>
                        )}

                        {/* WhatsApp & Call Contact Controls */}
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${req.user_phone}`}
                            className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </a>

                          <a
                            href={`https://wa.me/${formattedPhone}?text=${encodeURIComponent(
                              `Hello ${req.user_name}, regarding your withdrawal payout request of ₹${formatPrice(
                                req.amount
                              )} on Meri Local Bazaar:`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        </div>

                        {/* Direct Action Buttons: Approve Payout & Reject Payout */}
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onApprovePayout?.(req.id)}
                              className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98 cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Approve Payout
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const reason = window.prompt(
                                  'Please enter reason for rejecting this payout (optional):',
                                  'Incorrect UPI details or account verification required.'
                                );
                                if (reason !== null) {
                                  onRejectPayout?.(req.id, reason);
                                }
                              }}
                              className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" /> Reject Payout
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onApprovePayout?.(req.id)}
                              className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-slate-100 hover:bg-emerald-50 text-slate-600'
                              }`}
                            >
                              {isCompleted ? '✓ Settled' : 'Set Approved'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onRejectPayout?.(req.id, 'Re-flagged by admin')}
                              className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                                isRejected
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : 'bg-slate-100 hover:bg-red-50 text-slate-600'
                              }`}
                            >
                              {isRejected ? '✕ Rejected' : 'Set Rejected'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
