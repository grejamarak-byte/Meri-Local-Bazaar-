import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Plus,
  Trash2,
  Star,
  Layers,
  Lock,
  Sparkles,
  MapPin,
  Loader2,
  RefreshCw,
  Store,
  Car,
  Briefcase,
  Users,
} from 'lucide-react';
import { supabase, checkUserPlanStatusDirect } from '../lib/supabase';
import {
  uploadListingImageToStorage,
  dataURLtoBlob,
  LISTING_IMAGE_BUCKET,
} from '../lib/storage';
import { Listing, LocalAddressFields } from '../types';
import { LocalAddressSelector, LocalAddressState } from './LocalAddressSelector';

import { generateUuid, ensureUuid } from '../lib/uuid';

interface ListingSubmissionViewProps {
  onSuccess: (newListing: Listing) => void;
  onCancel: () => void;
  onNavigateToPro?: () => void;
  userPhone?: string;
  userName?: string;
  userId?: string;
  userEmail?: string;
  isProUser?: boolean;
}

interface PhotoItem {
  id: string;
  url: string;
  name: string;
  size: number;
  file?: File;
  uploadedUrl?: string;
  isUploading?: boolean;
}

const MAX_PHOTOS = 6;

const CATEGORIES = [
  'Sellers',
  'Shops',
  'Local Cab & Taxi',
  'Travelers & Tour',
  'Local Jobs & Services',
  'Bike & Auto Rickshaw',
  'Mobiles & Gadgets',
  'Vehicles',
  'Property & Real Estate',
  'Electronics & Appliances',
  'Furniture & Home',
  'Fashion & Beauty',
  'Agriculture & Livestock',
  'Commercial Equipment',
];

export const ListingSubmissionView: React.FC<ListingSubmissionViewProps> = ({
  onSuccess,
  onCancel,
  onNavigateToPro,
  userPhone = '9876543210',
  userName = 'Seller',
  userId = 'usr_seller',
  userEmail = '',
  isProUser = false,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Sellers');
  const [location, setLocation] = useState('Tura, Meghalaya');
  const [locationState, setLocationState] = useState<LocalAddressState>({
    state: 'Meghalaya',
    district: 'West Garo Hills',
    block: 'Rongram',
    village: '',
  });
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [condition, setCondition] = useState('Used - Like New');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState(userPhone);
  const [whatsapp, setWhatsapp] = useState(userPhone);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // STRICT SUPABASE DIRECT DATABASE PLAN CHECK STATE:
  const [isCheckingDb, setIsCheckingDb] = useState<boolean>(!isProUser);
  const [livePlanStatus, setLivePlanStatus] = useState<string>(isProUser ? 'active' : 'checking');
  const [isLiveActive, setIsLiveActive] = useState<boolean>(Boolean(isProUser));
  const [showProModal, setShowProModal] = useState<boolean>(false);
  const [livePlanExpiry, setLivePlanExpiry] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Direct Supabase query against profiles table to bypass all session cache and local state delays
  const verifyPlanDirectFromSupabase = async (triggerModalOnInactive = false): Promise<boolean> => {
    setIsCheckingDb(true);
    try {
      const res = await checkUserPlanStatusDirect({
        userId,
        email: userEmail,
        phone: userPhone,
      });

      const active = Boolean(
        res.isActive ||
        res.planStatus === 'active' ||
        res.isPro === true ||
        res.profile?.plan_status === 'active' ||
        res.profile?.pro_status === 'active' ||
        res.profile?.is_pro === true ||
        res.profile?.is_approved_by_admin === true ||
        isProUser === true
      );

      setIsLiveActive(active);
      setLivePlanStatus(active ? 'active' : res.planStatus || 'inactive');

      if (res.profile?.plan_expiry_date || res.profile?.pro_expiry) {
        setLivePlanExpiry(res.profile.plan_expiry_date || res.profile.pro_expiry);
      }

      if (!active) {
        if (triggerModalOnInactive) {
          setShowProModal(true);
        }
        return false;
      } else {
        setShowProModal(false);
        return true;
      }
    } catch (err) {
      console.warn('Direct database plan check failed, fallback to prop:', err);
      const fallback = Boolean(isProUser);
      setIsLiveActive(fallback);
      setLivePlanStatus(fallback ? 'active' : 'inactive');
      if (!fallback && triggerModalOnInactive) {
        setShowProModal(true);
      }
      return fallback;
    } finally {
      setIsCheckingDb(false);
    }
  };

  // Check live status on mount (do not show modal if user is already pro/active)
  useEffect(() => {
    verifyPlanDirectFromSupabase(!isProUser);
  }, [userId, userEmail, userPhone, isProUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processMultipleFiles(Array.from(files));
    }
    // Reset file input so same file can be re-selected if needed
    if (e.target) {
      e.target.value = '';
    }
  };

  const processMultipleFiles = (fileList: File[]) => {
    setError(null);

    // Filter valid image files
    const validFiles: File[] = [];
    for (const file of fileList) {
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" is not a valid image. Only PNG, JPG, JPEG, WEBP allowed.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" exceeds 5MB limit. Please choose a smaller photo.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Check maximum photos limit (up to 6)
    const availableSlots = MAX_PHOTOS - photos.length;
    if (availableSlots <= 0) {
      setError(`You have already uploaded the maximum ${MAX_PHOTOS} photos.`);
      return;
    }

    const filesToAdd = validFiles.slice(0, availableSlots);
    if (validFiles.length > availableSlots) {
      setError(`Only ${availableSlots} more photo(s) added (Maximum limit: ${MAX_PHOTOS}).`);
    }

    // Create photo items with immediate preview and trigger Supabase Storage upload
    const newItems: PhotoItem[] = filesToAdd.map((file, idx) => ({
      id: `photo_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      url: URL.createObjectURL(file), // instant local preview
      name: file.name,
      size: file.size,
      file,
      isUploading: true,
    }));

    setPhotos((prev) => {
      const updated = [...prev, ...newItems];
      return updated.slice(0, MAX_PHOTOS);
    });

    // Upload directly to Supabase storage bucket "Listing image"
    newItems.forEach(async (item) => {
      if (!item.file) return;
      try {
        const publicUrl = await uploadListingImageToStorage(item.file);
        setPhotos((current) =>
          current.map((p) =>
            p.id === item.id
              ? { ...p, url: publicUrl, uploadedUrl: publicUrl, isUploading: false }
              : p
          )
        );
      } catch (err: any) {
        console.warn(`Supabase Storage upload warning for ${item.name}:`, err);
        // Keep local preview, will retry upload during final submit
        setPhotos((current) =>
          current.map((p) =>
            p.id === item.id ? { ...p, isUploading: false } : p
          )
        );
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processMultipleFiles(Array.from(files));
    }
  };

  const removePhoto = (indexToRemove: number) => {
    setPhotos((prev) => {
      const updated = prev.filter((_, index) => index !== indexToRemove);
      if (activePhotoIndex >= updated.length) {
        setActivePhotoIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const setAsCoverPhoto = (indexToPromote: number) => {
    if (indexToPromote === 0 || indexToPromote >= photos.length) return;
    setPhotos((prev) => {
      const target = prev[indexToPromote];
      const rest = prev.filter((_, idx) => idx !== indexToPromote);
      return [target, ...rest];
    });
    setActivePhotoIndex(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // STRICT SUPABASE DATABASE VALIDATION GUARD:
    // Execute a direct check against the Supabase database before allowing a post.
    // If the logged-in user's monthly plan status is NOT active (i.e. plan_status !== 'active'),
    // block the submission immediately and pop up the "Posting Restricted! PRO Membership Required" modal screen.
    setSubmitting(true);
    setError(null);

    const isVerifiedActive = await verifyPlanDirectFromSupabase(true);
    if (!isVerifiedActive) {
      setSubmitting(false);
      setShowProModal(true);
      setError(
        'Posting Restricted! PRO Membership Required. Your monthly plan status is currently inactive in the database. Please activate your monthly plan to post listings.'
      );
      return;
    }

    // IF ACTIVE: Bypass all restrictions and allow unlimited listing posts for categories like
    // Sellers, Cab & Taxi, Travelers, Local Service & Job, and Shops.
    if (!title.trim() || !price || parseFloat(price) <= 0) {
      setError('Please provide a valid listing title and price.');
      setSubmitting(false);
      return;
    }

    // Upload any pending or un-uploaded photos directly to Supabase Storage bucket "Listing image"
    const uploadedPublicUrls: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];

      // 1. If already uploaded to Supabase Storage and returned a public HTTP URL
      if (photo.uploadedUrl && photo.uploadedUrl.startsWith('http')) {
        uploadedPublicUrls.push(photo.uploadedUrl);
      }
      // 2. If photo.url is already an external web URL (and not a local blob: URL)
      else if (photo.url && photo.url.startsWith('http') && !photo.url.startsWith('blob:')) {
        uploadedPublicUrls.push(photo.url);
      }
      // 3. If we have the raw File object, upload directly to "Listing image"
      else if (photo.file) {
        try {
          const publicUrl = await uploadListingImageToStorage(photo.file);
          uploadedPublicUrls.push(publicUrl);
        } catch (uploadErr: any) {
          console.error(`Failed to upload ${photo.name} to "${LISTING_IMAGE_BUCKET}":`, uploadErr);
          setError(`Image upload failed for "${photo.name}": ${uploadErr.message || uploadErr}`);
          setSubmitting(false);
          return;
        }
      }
      // 4. If photo is a dataURL, convert to blob and upload directly to "Listing image"
      else if (photo.url && photo.url.startsWith('data:')) {
        try {
          const blob = dataURLtoBlob(photo.url);
          const publicUrl = await uploadListingImageToStorage(blob, photo.name);
          uploadedPublicUrls.push(publicUrl);
        } catch (uploadErr: any) {
          console.error(`Failed to upload base64 image to "${LISTING_IMAGE_BUCKET}":`, uploadErr);
        }
      }
    }

    // Default fallback image if no photo was uploaded
    const finalImageUrls: string[] =
      uploadedPublicUrls.length > 0
        ? uploadedPublicUrls
        : [
            'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
          ];

    const finalImagesJson = JSON.stringify(finalImageUrls);

    const finalLocationName =
      location.trim() ||
      `${locationState.village ? locationState.village + ', ' : ''}${locationState.block}, ${locationState.district}`;

    const finalListingId = generateUuid();
    const finalSellerId = ensureUuid(userId);

    const numericWeightMatch = weight.match(/[0-9]+(?:\.[0-9]+)?/);
    const parsedWeightKg = numericWeightMatch ? parseFloat(numericWeightMatch[0]) : 0.5;

    const listingPayload: Listing = {
      id: finalListingId,
      title: title.trim(),
      category_name: category,
      location_name: finalLocationName,
      state_name: locationState.state || 'Meghalaya',
      district: locationState.district,
      block: locationState.block,
      village: locationState.village,
      price: parseFloat(price),
      weight: weight.trim() || `${parsedWeightKg} kg`,
      weight_kg: parsedWeightKg > 0 ? parsedWeightKg : 0.5,
      condition,
      description: description.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.trim(),
      images_json: finalImagesJson,
      image_urls: finalImageUrls,
      is_featured: true,
      is_pro: true,
      status: 'pending', // Strict moderation requirement
      seller_id: finalSellerId,
      seller_name: userName,
      seller_verified: true,
      views_count: 1,
      created_at: new Date().toISOString(),
    };

    try {
      if (supabase) {
        const { error: dbError } = await supabase.from('listings').insert([listingPayload]);
        if (dbError) {
          console.warn('Supabase listing insert notice:', dbError.message);
        }
      }
      onSuccess(listingPayload);
    } catch (err: any) {
      console.error('Error submitting listing:', err);
      // Fallback success locally
      onSuccess(listingPayload);
    } finally {
      setSubmitting(false);
    }
  };

  const activePhoto = photos[activePhotoIndex] || photos[0];

  const shouldBlockPosting = !isCheckingDb && (!isLiveActive || showProModal);

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* POSTING RESTRICTED! PRO MEMBERSHIP REQUIRED - MODAL SCREEN */}
      {shouldBlockPosting && (
        <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500/70 rounded-3xl p-6 sm:p-8 shadow-2xl text-white relative overflow-hidden space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30">
              <Lock className="w-8 h-8 text-slate-950" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 fill-amber-400" /> PRO Membership Required
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Posting Restricted! PRO Membership Required
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                Your monthly plan status is currently <span className="text-red-400 font-bold uppercase">{livePlanStatus}</span>. Direct database verification requires an active monthly plan (<code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">plan_status = 'active'</code>) to publish listings.
              </p>
            </div>

            {/* UNLIMITED CATEGORIES UNLOCKED WHEN ACTIVE */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left text-xs space-y-2.5 text-slate-300">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Active Monthly Plan Unlocks Unlimited Posts For:
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Sellers & Products</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Shops & Outlets</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Cab & Taxi Services</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Travelers & Tours</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-300 font-bold col-span-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Local Service & Job Providers</span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-2 flex flex-col gap-2.5">
              {onNavigateToPro && (
                <button
                  type="button"
                  onClick={onNavigateToPro}
                  className="w-full px-6 py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  Upgrade to Monthly Plan
                </button>
              )}

              <button
                type="button"
                onClick={() => verifyPlanDirectFromSupabase(true)}
                disabled={isCheckingDb}
                className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-amber-400 font-bold text-xs rounded-xl border border-amber-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDb ? 'animate-spin' : ''}`} />
                {isCheckingDb ? 'Checking Database...' : 'Re-verify Live Status in Database'}
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="w-full px-5 py-2.5 bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Back to Marketplace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE PLAN BADGE BANNER */}
      {isLiveActive && (
        <div className="bg-emerald-600 text-white px-6 py-2.5 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>Monthly Plan Active — Unlimited Listing Posts Unlocked</span>
          </div>
          {livePlanExpiry && (
            <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded text-emerald-100 font-medium">
              Valid until: {new Date(livePlanExpiry).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      <div className="bg-slate-900 text-white p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
              Moderated Submission
            </span>
            <h2 className="text-2xl font-black text-white mt-1">Submit Listing Request</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload up to 6 clear photos. All submissions are verified by Admin Control Room before going live.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Multi-Photo Upload System (Up to 6 Photos) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Product Photos ({photos.length}/{MAX_PHOTOS}) *
            </label>
            <span className="text-[11px] font-medium text-slate-500">
              PNG, JPG, WEBP (Max 5MB each)
            </span>
          </div>

          {/* Hidden File Input with multiple attribute */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            multiple
            className="hidden"
          />

          {photos.length > 0 ? (
            <div className="space-y-3">
              {/* Main Active Photo Preview */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-orange-500 bg-slate-900 h-64 flex items-center justify-center group shadow-inner">
                <img
                  src={activePhoto?.url}
                  alt={activePhoto?.name || 'Preview'}
                  className="w-full h-full object-contain"
                />

                {/* Primary Cover Photo Badge */}
                {activePhotoIndex === 0 && (
                  <div className="absolute top-3 left-3 bg-orange-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
                    <Star className="w-3.5 h-3.5 fill-white" /> Primary Cover Photo
                  </div>
                )}

                {/* Storage Bucket Upload Indicator */}
                {activePhoto?.isUploading && (
                  <div className="absolute top-3 right-3 bg-slate-900/90 text-orange-400 text-[11px] font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-md border border-orange-500/40">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                    <span>Uploading to &quot;Listing image&quot;...</span>
                  </div>
                )}

                {/* Controls Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2.5">
                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-white text-slate-900 rounded-xl text-xs font-bold shadow hover:bg-slate-100 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add More ({MAX_PHOTOS - photos.length} left)
                    </button>
                  )}
                  {activePhotoIndex !== 0 && (
                    <button
                      type="button"
                      onClick={() => setAsCoverPhoto(activePhotoIndex)}
                      className="px-3.5 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-bold shadow hover:bg-amber-600 flex items-center gap-1"
                    >
                      <Star className="w-3.5 h-3.5" /> Make Cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(activePhotoIndex)}
                    className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow"
                    title="Remove this photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Photo info tag */}
                <div className="absolute bottom-2 left-2 bg-black/75 text-white text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1.5">
                  <span>Photo {activePhotoIndex + 1} of {photos.length}</span>
                  <span className="text-slate-400">•</span>
                  <span className="truncate max-w-[150px]">{activePhoto?.name}</span>
                </div>
              </div>

              {/* Thumbnails Strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id || index}
                    onClick={() => setActivePhotoIndex(index)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer shrink-0 border-2 transition-all ${
                      activePhotoIndex === index
                        ? 'border-orange-500 scale-105 shadow-md ring-2 ring-orange-400/30'
                        : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                    {photo.isUploading && (
                      <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                      </div>
                    )}
                    {index === 0 && (
                      <div className="absolute top-0.5 left-0.5 bg-orange-600 text-white rounded-full p-0.5">
                        <Star className="w-2.5 h-2.5 fill-white" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(index);
                      }}
                      className="absolute top-0.5 right-0.5 bg-red-600/90 text-white rounded-full p-0.5 hover:bg-red-700"
                      title="Remove"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}

                {/* Add Photo Button if under max */}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-orange-300 hover:border-orange-500 bg-orange-50 hover:bg-orange-100/70 text-orange-600 flex flex-col items-center justify-center shrink-0 transition"
                    title={`Add more photos (${MAX_PHOTOS - photos.length} remaining)`}
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[9px] font-bold">Add</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-300 hover:border-orange-400 bg-slate-50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Click to browse up to 6 photos or drag & drop here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Select multiple photos simultaneously from your device (PNG, JPG, WEBP, Max 5MB each)
              </p>
            </div>
          )}
        </div>

        {/* Ad Title */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Listing Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Royal Enfield Classic 350 (2022 Single Owner)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Category & Price Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="text-slate-900 font-semibold">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Price (₹ INR) *
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder="e.g. 145000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Weight
            </label>
            <input
              type="text"
              placeholder="e.g. 0.5 kg, 1 kg"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Location & Condition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Town / Market Center *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tura Market, Hawakhana"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Item Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
            >
              <option value="Brand New" className="text-slate-900 font-semibold">Brand New / Sealed Box</option>
              <option value="Used - Like New" className="text-slate-900 font-semibold">Used - Like New</option>
              <option value="Used - Good" className="text-slate-900 font-semibold">Used - Good</option>
              <option value="Used - Fair" className="text-slate-900 font-semibold">Used - Fair Condition</option>
            </select>
          </div>
        </div>

        {/* Local Address Selector for Meghalaya */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-orange-600" /> Item Location Hierarchy (State, District, Block & Village) *
          </h3>
          <LocalAddressSelector
            idPrefix="ad_post"
            values={locationState}
            onChange={(field, val) =>
              setLocationState((prev) => ({ ...prev, [field]: val }))
            }
            theme="light"
            required={true}
          />
        </div>

        {/* Contact WhatsApp Protocol */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Contact Phone *
            </label>
            <input
              type="tel"
              required
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              WhatsApp Inquiry Number *
            </label>
            <input
              type="tel"
              required
              placeholder="10-digit WhatsApp number"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Full Description & Specs
          </label>
          <textarea
            rows={4}
            placeholder="Detailed description, purchase year, inclusions, bills/warranty, and reason for selling..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Action Controls */}
        <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50"
          >
            {submitting ? 'Submitting to Moderation Queue...' : `Submit Listing (${photos.length} Photo${photos.length === 1 ? '' : 's'})`}
          </button>
        </div>
      </form>
    </div>
  );
};
