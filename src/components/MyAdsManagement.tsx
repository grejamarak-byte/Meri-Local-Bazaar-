import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Eye,
  MessageCircle,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Tag,
  MapPin,
  Camera,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Building,
  Package,
  ShoppingCart,
  User,
  Phone,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Check,
  Box,
} from 'lucide-react';
import { Listing, UserProfile, DeliveryOrder, PayoutRequest, formatPrice, getListingPrimaryImage, getListingImages } from '../types';
import { formatWhatsAppUrl } from './ListingDetailModal';
import { PayoutRequestModal } from './PayoutRequestModal';
import { supabase } from '../lib/supabase';

interface MyAdsManagementProps {
  myListings: Listing[];
  currentUser?: UserProfile;
  orders?: DeliveryOrder[];
  payoutRequests?: PayoutRequest[];
  onOpenSubmitModal: () => void;
  onViewListing: (listing: Listing) => void;
  onDeleteListing: (id: string) => void;
  onToggleListingStatus: (id: string, currentStatus: string) => void;
  onRequestPayout?: (payoutData: {
    amount: number;
    upi_id: string;
    bank_name?: string;
    account_no?: string;
    ifsc_code?: string;
    user_role: string;
  }) => Promise<void> | void;
  onUpdateOrderStatus?: (orderId: string, newStatus: string) => Promise<void> | void;
}

export const MyAdsManagement: React.FC<MyAdsManagementProps> = ({
  myListings,
  currentUser,
  orders = [],
  payoutRequests = [],
  onOpenSubmitModal,
  onViewListing,
  onDeleteListing,
  onToggleListingStatus,
  onRequestPayout,
  onUpdateOrderStatus,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'rejected'>('all');
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  // Dedicated Seller Orders State & Management
  const [liveOrders, setLiveOrders] = useState<DeliveryOrder[]>(orders || []);
  const [isFetchingOrders, setIsFetchingOrders] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [orderStatusNotice, setOrderStatusNotice] = useState<string | null>(null);
  const [orderFilterTab, setOrderFilterTab] = useState<'active' | 'all' | 'ready' | 'delivered'>('active');

  // Sync with prop updates
  useEffect(() => {
    if (orders && orders.length > 0) {
      setLiveOrders(orders);
    }
  }, [orders]);

  // Fetch active orders from Supabase matching this seller
  const fetchSellerOrders = useCallback(async () => {
    if (!currentUser) return;
    setIsFetchingOrders(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('delivery_orders')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          setLiveOrders(data);
        }
      }
    } catch (err) {
      console.warn('Notice fetching seller orders:', err);
    } finally {
      setIsFetchingOrders(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchSellerOrders();
  }, [fetchSellerOrders]);

  const filtered = (myListings || []).filter((l) => {
    if (filter === 'all') return true;
    return l.status === filter;
  });

  // Calculate real-time earnings and wallet statistics
  const userPayouts = (payoutRequests || []).filter(
    (p) =>
      (currentUser && (p.driver_id === currentUser.id || p.driver_phone === currentUser.phone || p.user_id === currentUser.id || p.user_phone === currentUser.phone)) ||
      (currentUser && (p.driver_name === currentUser.full_name || p.user_name === currentUser.full_name))
  );

  const pendingPayoutAmount = (userPayouts || [])
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const completedPayoutAmount = (userPayouts || [])
    .filter((p) => p.status === 'approved' || p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Active listings inventory value
  const totalListingsValue = (myListings || [])
    .filter((l) => l.status === 'active')
    .reduce((sum, l) => sum + (l.price || 0), 0);

  // Match all orders belonging to this shop/seller
  const currentOrdersSource = liveOrders.length > 0 ? liveOrders : (orders || []);
  const sellerAllOrders = currentOrdersSource.filter((o) => {
    if (!currentUser) return false;
    const matchId =
      (o as any).seller_id &&
      ((o as any).seller_id === currentUser.id || (o as any).seller_id === (currentUser as any).shop_id);
    const matchPhone =
      o.seller_phone &&
      currentUser.phone &&
      o.seller_phone.replace(/\D/g, '').includes(currentUser.phone.replace(/\D/g, ''));
    const matchName =
      o.seller_name &&
      currentUser.full_name &&
      o.seller_name.trim().toLowerCase() === currentUser.full_name.trim().toLowerCase();
    const matchShop =
      (o as any).shop_name &&
      currentUser.shop_name &&
      (o as any).shop_name.trim().toLowerCase() === currentUser.shop_name.trim().toLowerCase();
    return matchId || matchPhone || matchName || matchShop;
  });

  const sellerActiveOrders = sellerAllOrders.filter(
    (o) =>
      o.status !== 'delivered' &&
      o.status !== 'success' &&
      o.status !== 'cancelled' &&
      o.status !== 'rejected'
  );

  const displayedOrders = sellerAllOrders.filter((o) => {
    if (orderFilterTab === 'active') {
      return (
        o.status !== 'delivered' &&
        o.status !== 'success' &&
        o.status !== 'cancelled' &&
        o.status !== 'rejected'
      );
    }
    if (orderFilterTab === 'ready') {
      return o.status === 'ready_for_pickup';
    }
    if (orderFilterTab === 'delivered') {
      return o.status === 'delivered' || o.status === 'success';
    }
    return true; // 'all'
  });

  const totalOrdersCount = sellerAllOrders.length;

  const myCompletedSales = sellerAllOrders.filter(
    (o) => o.status === 'success' || o.status === 'delivered'
  );
  const totalSalesRevenue = myCompletedSales.reduce(
    (sum, o) => sum + (o.product_price || o.total_paid || o.total_fare || 0),
    0
  );

  // Available wallet balance (from profile or minimum active baseline)
  const availableWalletBalance = Math.max(
    0,
    (currentUser?.wallet_balance ?? 12500) + totalSalesRevenue - completedPayoutAmount - pendingPayoutAmount
  );

  const handleMarkReadyForPickup = async (order: DeliveryOrder) => {
    setUpdatingOrderId(order.id);
    try {
      // Optimistic local update
      setLiveOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: 'ready_for_pickup' } : o))
      );

      if (onUpdateOrderStatus) {
        await onUpdateOrderStatus(order.id, 'ready_for_pickup');
      }

      if (supabase) {
        await supabase
          .from('delivery_orders')
          .update({
            status: 'ready_for_pickup',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);
      }

      setOrderStatusNotice(`Order #${order.order_number || order.id.slice(-6)} marked as Ready for Pickup!`);
      setTimeout(() => setOrderStatusNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to update order status:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. VISUALLY PROMINENT SELLER WALLET BALANCE CARD */}
      <div
        id="seller_wallet_balance_card"
        className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-orange-500/40 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
      >
        {/* Decorative Background Accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Balance and Shop Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-orange-500/20 text-orange-400 border border-orange-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Seller Dashboard & Wallet
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                {currentUser?.shop_name || 'Verified Merchant Store'}
              </span>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Wallet Balance
              </div>
              <div className="text-2xl sm:text-4xl font-black text-white font-mono tracking-tight mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-orange-400">Balance: ₹{availableWalletBalance.toFixed(2)}</span>
                <span className="text-xs text-emerald-400 font-sans font-bold bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                  100% Guaranteed Settlement
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Orders Count</div>
                <div className="text-sm font-black text-amber-400 mt-0.5">
                  {totalOrdersCount}
                </div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Active Ads Catalog</div>
                <div className="text-sm font-black text-white mt-0.5">
                  ₹{formatPrice(totalListingsValue)}
                </div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Pending Payouts</div>
                <div className="text-sm font-black text-amber-400 mt-0.5">
                  ₹{formatPrice(pendingPayoutAmount)}
                </div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Withdrawn</div>
                <div className="text-sm font-black text-emerald-400 mt-0.5">
                  ₹{formatPrice(completedPayoutAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Interactive Withdraw Balance Action */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              id="seller_withdraw_balance_btn"
              onClick={() => setIsPayoutModalOpen(true)}
              className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-slate-950" />
              <span>Withdraw Balance</span>
              <ArrowUpRight className="w-4 h-4 text-slate-950" />
            </button>

            <button
              onClick={onOpenSubmitModal}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post New Product Ad</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DEDICATED SELLER "MY ORDERS" & ORDER MANAGEMENT SECTION */}
      <div id="seller_orders_management_section" className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-[11px] font-bold uppercase tracking-wider">
                <ShoppingCart className="w-3.5 h-3.5 text-orange-600" /> Order Fulfillment Hub
              </span>
              <h3 className="text-xl font-black text-slate-900">My Orders & Order Management</h3>
              <span className="bg-orange-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                {sellerActiveOrders.length} Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live customer orders matching your shop. Prepare packaged items and mark them ready for delivery partner pickup.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              id="refresh_seller_orders_btn"
              onClick={() => fetchSellerOrders()}
              disabled={isFetchingOrders}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh seller orders"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingOrders ? 'animate-spin text-orange-600' : ''}`} />
              <span>Refresh Orders</span>
            </button>
          </div>
        </div>

        {/* Success Notice Banner */}
        {orderStatusNotice && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-bold animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{orderStatusNotice}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setOrderFilterTab('active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              orderFilterTab === 'active'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Active Orders ({sellerActiveOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setOrderFilterTab('ready')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              orderFilterTab === 'ready'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready for Pickup ({sellerAllOrders.filter((o) => o.status === 'ready_for_pickup').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setOrderFilterTab('delivered')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              orderFilterTab === 'delivered'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Delivered ({myCompletedSales.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setOrderFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              orderFilterTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>All Store Orders ({sellerAllOrders.length})</span>
          </button>
        </div>

        {/* Orders List Content */}
        {displayedOrders.length === 0 ? (
          <div className="py-10 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 p-6">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6" />
            </div>
            <div className="text-sm font-black text-slate-900">
              {orderFilterTab === 'active' ? 'No Active Orders' : 'No Orders Found'}
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {orderFilterTab === 'active'
                ? 'You do not have any pending customer orders right now. When customers purchase from your store, new orders will appear here automatically.'
                : 'Orders placed for your store products will be tracked and displayed here.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {displayedOrders.map((order) => {
              const isUpdating = updatingOrderId === order.id;
              const isReady = order.status === 'ready_for_pickup';
              const isOut = order.status === 'out_for_delivery';
              const isDone =
                order.status === 'delivered' ||
                order.status === 'delivered_by_boy' ||
                order.status === 'success';
              const isPending =
                order.status === 'pending' || order.status === 'pending_verification';

              const orderPrice =
                order.product_price || order.total_paid || order.total_fare || 0;
              const quantity = (order as any).quantity || 1;
              const productName =
                order.item_description || order.listing_title || 'Local Store Product Item';

              const orderDate = order.created_at
                ? new Date(order.created_at).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent';

              const cleanPhone = (order.customer_phone || '').replace(/\D/g, '');
              const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
              const waUrl = cleanPhone
                ? `https://wa.me/${waPhone}?text=${encodeURIComponent(
                    `Hello ${order.customer_name || 'Customer'}, regarding your order #${order.order_number || order.id.slice(-6)} (${productName}) on Meri Local Bazaar:`
                  )}`
                : null;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-orange-200 hover:shadow-md transition space-y-4"
                >
                  {/* Top Bar: Order Number, Date/Time, and Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
                        Order #{order.order_number || order.id.slice(-6)}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{orderDate}</span>
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {isReady && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Ready for Pickup
                        </span>
                      )}
                      {isOut && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-600" />
                          Out for Delivery
                        </span>
                      )}
                      {isDone && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Delivered
                        </span>
                      )}
                      {isPending && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending Confirmation
                        </span>
                      )}
                      {!isReady && !isOut && !isDone && !isPending && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                          {order.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Customer Details, Product Details, Price & Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Customer Name & Phone Number (Cols 1-4) */}
                    <div className="md:col-span-4 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Customer Details
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="font-black text-sm text-slate-900">
                          {order.customer_name || 'Valued Customer'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="text-xs text-slate-600 hover:text-orange-600 font-medium flex items-center gap-1 transition"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{order.customer_phone || 'No phone provided'}</span>
                        </a>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition text-[10px] font-bold flex items-center gap-1 border border-emerald-200"
                            title="Message on WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                      {order.delivery_address && (
                        <div className="text-xs text-slate-500 flex items-start gap-1 pt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{order.delivery_address}</span>
                        </div>
                      )}
                    </div>

                    {/* Product Item Name & Quantity (Cols 5-8) */}
                    <div className="md:col-span-4 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Ordered Item & Quantity
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                          <Box className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">
                            {productName}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                              Qty: {quantity}
                            </span>
                            {order.weight_kg ? <span>• {order.weight_kg} kg</span> : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price & Action Button (Cols 9-12) */}
                    <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3">
                      <div className="text-left md:text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Total Price
                        </div>
                        <div className="text-lg font-black text-slate-900">
                          ₹{formatPrice(orderPrice)}
                        </div>
                      </div>

                      {/* Action Button: "Mark as Ready for Pickup" */}
                      <div className="w-full sm:w-auto">
                        {!isReady && !isOut && !isDone ? (
                          <button
                            type="button"
                            id={`mark_ready_btn_${order.id}`}
                            onClick={() => handleMarkReadyForPickup(order)}
                            disabled={isUpdating}
                            className="w-full sm:w-auto px-4 py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Package className="w-4 h-4 text-white" />
                            <span>{isUpdating ? 'Updating...' : 'Mark as Ready for Pickup'}</span>
                          </button>
                        ) : isReady ? (
                          <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Ready for Pickup ✓</span>
                          </div>
                        ) : isOut ? (
                          <div className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-800 text-xs font-bold">
                            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>Rider Picked Up</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Order Completed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. MAIN ADS LISTINGS SECTION */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">My Ads Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track and manage your submitted listings, moderation status, and incoming WhatsApp inquiries.
            </p>
          </div>

          <button
            onClick={onOpenSubmitModal}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Submit Listing Request
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'active', 'pending', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                filter === status
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status} ({(myListings || []).filter((l) => (status === 'all' ? true : l.status === status)).length})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Tag className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No {filter} listings found</p>
            <p className="text-xs text-slate-400 mt-1">Submit your product listing to advertise locally.</p>
            <button
              onClick={onOpenSubmitModal}
              className="mt-4 px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-700 transition"
            >
              Submit First Listing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered?.map((item) => (
              <div
                key={item.id}
                className="border border-slate-200 rounded-2xl p-4 bg-white hover:border-slate-300 transition flex flex-col justify-between space-y-3"
              >
                <div className="flex gap-3.5">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                    <img
                      src={getListingPrimaryImage(item)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {getListingImages(item).length > 1 && (
                      <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                        <Camera className="w-2.5 h-2.5 text-orange-400" />
                        {getListingImages(item).length}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-emerald-600 font-black text-base">
                        ₹{formatPrice(item.price)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          item.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm truncate mt-0.5">{item.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {item.location_name}
                      </span>
                      <span>•</span>
                      <span>{item.category_name}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewListing(item)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>

                    <a
                      href={formatWhatsAppUrl(item.whatsapp || item.phone, item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        onToggleListingStatus(
                          item.id,
                          item.status === 'active' ? 'rejected' : 'active'
                        )
                      }
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      {item.status === 'active' ? 'Pause Ad' : 'Activate'}
                    </button>
                    <button
                      onClick={() => onDeleteListing(item.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Ad"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout Modal */}
      {currentUser && (
        <PayoutRequestModal
          isOpen={isPayoutModalOpen}
          onClose={() => setIsPayoutModalOpen(false)}
          currentUser={currentUser}
          availableBalance={availableWalletBalance}
          userRoleLabel="Shopkeeper / Seller"
          onSubmitPayout={async (payoutData) => {
            if (onRequestPayout) {
              await onRequestPayout(payoutData);
            }
          }}
        />
      )}
    </div>
  );
};
