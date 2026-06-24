'use client';
import { create } from 'zustand';
import type { User } from '@/types';
import {
 authenticateUser, storeAuth, clearStoredAuth,
 getStoredAuth, type Permission, hasPermission, canViewCell
} from '@/lib/auth/auth';

interface AuthStore {
 user: User | null;
 token: string | null;
 isLoading: boolean;
 error: string | null;
 isInitialized: boolean;

 initialize: () => void;
 login: (email: string, password: string) => Promise<boolean>;
 logout: () => void;
 clearError: () => void;
 hasPermission: (permission: Permission) => boolean;
 canViewCell: (cell: string) => boolean;
 updateUser: (patch: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
 user: null,
 token: null,
 isLoading: false,
 error: null,
 isInitialized: false,

 initialize: () => {
 const stored = getStoredAuth();
 if (stored) {
 set({ user: stored.user, token: stored.token, isInitialized: true });
 } else {
 set({ isInitialized: true });
 }
 },

 login: async (email, password) => {
 set({ isLoading: true, error: null });
 try {
 const result = await authenticateUser({ email, password });
 if (!result) {
 set({ error: 'Invalid email or password. Please try again.', isLoading: false });
 return false;
 }
 storeAuth(result.user, result.token);
 set({ user: result.user, token: result.token, isLoading: false, error: null });
 return true;
 } catch (err) {
 set({ error: err instanceof Error ? err.message : 'Login failed', isLoading: false });
 return false;
 }
 },

 logout: () => {
 clearStoredAuth();
 set({ user: null, token: null, error: null });
 },

 clearError: () => set({ error: null }),

 hasPermission: (permission) => {
 const { user } = get();
 if (!user) return false;
 return hasPermission(user.role, permission);
 },

 canViewCell: (cell) => {
 const { user } = get();
 if (!user) return false;
 return canViewCell(user, cell);
 },

 updateUser: (patch) => {
 const { user, token } = get();
 if (!user) return;
 const updated = { ...user, ...patch };
 if (token) storeAuth(updated, token);
 set({ user: updated });
 },
}));
