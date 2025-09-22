/**
 * Custom hook for authentication
 * Re-exports useAuth from context for convenience
 */
import { useAuth as useAuthContext } from '../context/AuthContext';

export const useAuth = useAuthContext;
