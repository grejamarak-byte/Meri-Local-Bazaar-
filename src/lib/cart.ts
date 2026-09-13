import { supabase } from './supabase';
import { CartItem, Listing } from '../types';

export function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Ensures any string (e.g. 'ad_101', custom ids) produces a valid RFC 4122 UUID
 * for PostgreSQL UUID columns.
 */
export function toValidUuid(rawId: string): string {
  if (!rawId) return '00000000-0000-4000-8000-000000000000';
  if (isUuid(rawId)) return rawId;

  // Specific mapping for ad_101, ad_102, etc.
  if (/^ad_\d+$/i.test(rawId)) {
    const num = rawId.replace(/ad_/i, '').padStart(4, '0');
    return `a0eebc99-9c0b-4ef8-bb6d-6bb9bd38${num}`;
  }

  // General deterministic mapping
  let hex = '';
  for (let i = 0; i < rawId.length; i++) {
    hex += rawId.charCodeAt(i).toString(16);
  }
  hex = hex.padEnd(32, '0').substring(0, 32);
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-4${hex.substring(13, 16)}-a${hex.substring(17, 20)}-${hex.substring(20, 32)}`;
}

/**
 * Fetch all cart items for a given user from Supabase `cart_items` table.
 * Enriches each item with the matching listing details.
 */
export async function fetchUserCart(userId: string): Promise<CartItem[]> {
  if (!userId) return [];

  try {
    // 1. Try Supabase relation join first
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, listing:listings(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data && Array.isArray(data)) {
      return data.map((item: any) => ({
        id: item.id || `cart_${Math.random().toString(36).substring(2, 9)}`,
        user_id: item.user_id,
        listing_id: item.listing_id,
        quantity: Math.max(1, Number(item.quantity) || 1),
        created_at: item.created_at,
        updated_at: item.updated_at,
        listing: item.listing as Listing | undefined,
      }));
    }

    // 2. Fallback: If foreign key join is not configured in Supabase schema, fetch flat and query listings
    const { data: flatData, error: flatError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (flatError || !flatData || flatData.length === 0) {
      return [];
    }

    const listingIds = flatData.map((d: any) => d.listing_id).filter(Boolean);
    let listingsMap: Record<string, Listing> = {};

    if (listingIds.length > 0) {
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .in('id', listingIds);

      if (listingsData) {
        listingsMap = listingsData.reduce((acc: Record<string, Listing>, l: any) => {
          acc[l.id] = l as Listing;
          return acc;
        }, {});
      }
    }

    return flatData.map((item: any) => ({
      id: item.id || `cart_${Math.random().toString(36).substring(2, 9)}`,
      user_id: item.user_id,
      listing_id: item.listing_id,
      quantity: Math.max(1, Number(item.quantity) || 1),
      created_at: item.created_at,
      updated_at: item.updated_at,
      listing: listingsMap[item.listing_id],
    }));
  } catch (err) {
    console.warn('Error fetching cart items from Supabase:', err);
    return [];
  }
}

/**
 * Add a listing to cart or increment quantity if already present (Upsert logic).
 * Compatible with all Supabase `cart_items` table schemas (UUID, BIGINT, INT, or TEXT ids).
 */
export async function addToCart(
  userId?: string,
  listingId?: string,
  quantityToAdd: number = 1
): Promise<{ success: boolean; updatedItem?: CartItem; error?: string }> {
  try {
    // 1. Resolve User ID from parameter or active Supabase auth session
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const { data: authData } = await supabase.auth.getUser();
      effectiveUserId = authData?.user?.id;
    }

    if (!effectiveUserId) {
      return {
        success: false,
        error: 'User not logged in. Please log in to add items to your cart.',
      };
    }

    if (!listingId) {
      return { success: false, error: 'Listing ID is required' };
    }

    // Convert listing ID to valid UUID if needed to satisfy PostgreSQL UUID schema
    const effectiveListingId = toValidUuid(listingId);

    // 2. Check if product already exists in cart for this user
    let existingItems: any[] | null = null;
    let fetchError: any = null;

    const res = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('listing_id', effectiveListingId)
      .limit(1);

    existingItems = res.data;
    fetchError = res.error;

    // If query by UUID had error (e.g. if column was text and stored original id), try raw listingId
    if (fetchError && listingId !== effectiveListingId) {
      const retryRes = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('listing_id', listingId)
        .limit(1);

      if (!retryRes.error) {
        existingItems = retryRes.data;
        fetchError = null;
      }
    }

    if (fetchError) {
      console.warn('Checking existing cart item:', fetchError.message);
    }

    const existing = existingItems && existingItems.length > 0 ? existingItems[0] : null;

    if (existing) {
      // 3. Product already in cart -> Increment quantity by +1
      const currentQty = Number(existing.quantity) || 1;
      const newQuantity = currentQty + quantityToAdd;

      const { data: updatedData, error: updateError } = await supabase
        .from('cart_items')
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select();

      if (updateError) {
        // Fallback update without select if RLS restricts return select
        const { error: retryErr } = await supabase
          .from('cart_items')
          .update({
            quantity: newQuantity,
          })
          .eq('id', existing.id);

        if (retryErr) {
          console.error('Error updating cart item quantity:', retryErr);
          return { success: false, error: retryErr.message };
        }
      }

      const itemRes = updatedData && updatedData[0] ? updatedData[0] : existing;
      return {
        success: true,
        updatedItem: {
          id: String(itemRes.id),
          user_id: itemRes.user_id,
          listing_id: itemRes.listing_id,
          quantity: newQuantity,
          created_at: itemRes.created_at,
          updated_at: itemRes.updated_at,
        },
      };
    } else {
      // 4. New product -> Insert clean payload into cart_items
      const insertPayload = {
        user_id: effectiveUserId,
        listing_id: effectiveListingId,
        quantity: Math.max(1, quantityToAdd),
      };

      // Attempt 1: Standard insert with select
      const { data: insertedData, error: insertError } = await supabase
        .from('cart_items')
        .insert([insertPayload])
        .select();

      if (insertError) {
        console.warn('First insert attempt warning:', insertError.message);

        // Attempt 2: Plain insert without select (in case RLS blocks immediate SELECT)
        const { error: plainInsertErr } = await supabase
          .from('cart_items')
          .insert([insertPayload]);

        if (plainInsertErr) {
          // Attempt 3: If schema requires explicit UUID id
          const uuidId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined;
          if (uuidId) {
            const { error: uuidInsertErr } = await supabase
              .from('cart_items')
              .insert([{ ...insertPayload, id: uuidId }]);

            if (uuidInsertErr) {
              console.error('Error inserting cart item to Supabase:', uuidInsertErr);
              return { success: false, error: uuidInsertErr.message };
            }
          } else {
            console.error('Error inserting cart item to Supabase:', plainInsertErr);
            return { success: false, error: plainInsertErr.message };
          }
        }
      }

      const inserted = insertedData && insertedData[0] ? insertedData[0] : insertPayload;
      return {
        success: true,
        updatedItem: {
          id: String(inserted.id || ''),
          user_id: inserted.user_id,
          listing_id: inserted.listing_id,
          quantity: inserted.quantity,
          created_at: inserted.created_at,
          updated_at: inserted.updated_at,
        },
      };
    }
  } catch (err: any) {
    console.error('Fatal error in addToCart:', err);
    return { success: false, error: err.message || 'Failed to add item to cart' };
  }
}

/**
 * Direct helper function for product listing buttons: handleAddToCart(listingId, quantity)
 */
export async function handleAddToCart(
  listingId: string,
  quantityToAdd: number = 1
): Promise<{ success: boolean; updatedItem?: CartItem; error?: string }> {
  return addToCart(undefined, listingId, quantityToAdd);
}

/**
 * Update the quantity of an item in the cart.
 * If newQuantity <= 0, the item is removed.
 */
export async function updateCartItemQuantity(
  cartItemId: string,
  newQuantity: number
): Promise<{ success: boolean; error?: string }> {
  if (!cartItemId) return { success: false, error: 'Cart item ID is required' };

  try {
    if (newQuantity <= 0) {
      return removeCartItem(cartItemId);
    }

    const { error } = await supabase
      .from('cart_items')
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cartItemId);

    if (error) {
      console.warn('Error updating cart quantity:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Fatal error updating cart quantity:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Remove an item completely from the cart.
 */
export async function removeCartItem(cartItemId: string): Promise<{ success: boolean; error?: string }> {
  if (!cartItemId) return { success: false, error: 'Cart item ID is required' };

  try {
    const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);

    if (error) {
      console.warn('Error removing cart item:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Fatal error removing cart item:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Clear all cart items for a user (e.g. after successful checkout).
 */
export async function clearUserCart(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'User ID is required' };

  try {
    const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);

    if (error) {
      console.warn('Error clearing cart:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Fatal error clearing cart:', err);
    return { success: false, error: err.message };
  }
}
