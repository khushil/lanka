import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth';
import { 
  AuthState, 
  AuthUser, 
  LoginCredentials, 
  RegisterData, 
  ResetPasswordData,
  ChangePasswordData 
} from '../types';

// Action Types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: AuthUser }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_UPDATE_USER'; payload: AuthUser };

// Context Interface
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (data: ResetPasswordData) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  updateProfile: (userData: Partial<AuthUser>) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

// Initial State
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    
    case 'AUTH_CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    
    case 'AUTH_UPDATE_USER':
      return {
        ...state,
        user: action.payload,
        isLoading: false,
        error: null,
      };
    
    default:
      return state;
  }
};

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUser = authService.getUser();
        const isAuthenticated = authService.isAuthenticated();

        if (isAuthenticated && savedUser) {
          // Verify user data is still valid by fetching from server
          try {
            const currentUser = await authService.getCurrentUser();
            dispatch({ type: 'AUTH_SUCCESS', payload: currentUser });
          } catch (error) {
            // If verification fails, clear auth data
            authService.clearAuthData();
            dispatch({ type: 'AUTH_LOGOUT' });
          }
        } else {
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    };

    initializeAuth();

    // Setup automatic token refresh
    authService.setupTokenRefresh();
  }, []);

  // Login
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await authService.login(credentials);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: error instanceof Error ? error.message : 'Login failed' });
      throw error;
    }
  };

  // Register
  const register = async (userData: RegisterData): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await authService.register(userData);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: error instanceof Error ? error.message : 'Registration failed' });
      throw error;
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  // Forgot Password
  const forgotPassword = async (data: ResetPasswordData): Promise<void> => {
    try {
      await authService.forgotPassword(data);
    } catch (error) {
      throw error;
    }
  };

  // Reset Password
  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    try {
      await authService.resetPassword(token, newPassword);
    } catch (error) {
      throw error;
    }
  };

  // Change Password
  const changePassword = async (data: ChangePasswordData): Promise<void> => {
    try {
      await authService.changePassword(data);
    } catch (error) {
      throw error;
    }
  };

  // Update Profile
  const updateProfile = async (userData: Partial<AuthUser>): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      const updatedUser = await authService.updateProfile(userData);
      dispatch({ type: 'AUTH_UPDATE_USER', payload: updatedUser });
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: error instanceof Error ? error.message : 'Profile update failed' });
      throw error;
    }
  };

  // Verify Email
  const verifyEmail = async (token: string): Promise<void> => {
    try {
      await authService.verifyEmail(token);
      // Refresh user data after email verification
      if (state.isAuthenticated) {
        const updatedUser = await authService.getCurrentUser();
        dispatch({ type: 'AUTH_UPDATE_USER', payload: updatedUser });
      }
    } catch (error) {
      throw error;
    }
  };

  // Resend Verification Email
  const resendVerificationEmail = async (): Promise<void> => {
    try {
      await authService.resendVerificationEmail();
    } catch (error) {
      throw error;
    }
  };

  // Clear Error
  const clearError = (): void => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  };

  // Refresh User
  const refreshUser = async (): Promise<void> => {
    try {
      if (state.isAuthenticated) {
        const currentUser = await authService.getCurrentUser();
        dispatch({ type: 'AUTH_UPDATE_USER', payload: currentUser });
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      // If refresh fails, logout user
      dispatch({ type: 'AUTH_LOGOUT' });
      authService.clearAuthData();
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
    verifyEmail,
    resendVerificationEmail,
    clearError,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};