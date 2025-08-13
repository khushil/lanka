import { apiService } from './api';
import { 
  AuthUser, 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  AuthTokens,
  ResetPasswordData,
  ChangePasswordData
} from '../types';

class AuthService {
  private static readonly ACCESS_TOKEN_KEY = 'lanka_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'lanka_refresh_token';
  private static readonly USER_KEY = 'lanka_user';

  // Authentication Methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>('/auth/login', credentials);
      
      if (response.data) {
        this.setTokens(response.data.tokens);
        this.setUser(response.data.user);
      }
      
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>('/auth/register', userData);
      
      if (response.data) {
        this.setTokens(response.data.tokens);
        this.setUser(response.data.user);
      }
      
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      // Call API to invalidate tokens on server
      await apiService.post('/auth/logout', {
        refreshToken: this.getRefreshToken()
      });
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearAuthData();
    }
  }

  async refreshToken(): Promise<AuthTokens> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiService.post<AuthTokens>('/auth/refresh', {
        refreshToken
      });

      if (response.data) {
        this.setTokens(response.data);
      }

      return response.data;
    } catch (error) {
      this.clearAuthData();
      throw this.handleAuthError(error);
    }
  }

  async forgotPassword(data: ResetPasswordData): Promise<void> {
    try {
      await apiService.post('/auth/forgot-password', data);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await apiService.post('/auth/reset-password', {
        token,
        password: newPassword
      });
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    try {
      await apiService.post('/auth/change-password', data);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async getCurrentUser(): Promise<AuthUser> {
    try {
      const response = await apiService.get<AuthUser>('/auth/me');
      if (response.data) {
        this.setUser(response.data);
      }
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async updateProfile(userData: Partial<AuthUser>): Promise<AuthUser> {
    try {
      const response = await apiService.put<AuthUser>('/auth/profile', userData);
      if (response.data) {
        this.setUser(response.data);
      }
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      await apiService.post('/auth/verify-email', { token });
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async resendVerificationEmail(): Promise<void> {
    try {
      await apiService.post('/auth/resend-verification');
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Token Management
  getAccessToken(): string | null {
    return localStorage.getItem(AuthService.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(AuthService.REFRESH_TOKEN_KEY);
  }

  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(AuthService.ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(AuthService.REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem(AuthService.ACCESS_TOKEN_KEY);
    localStorage.removeItem(AuthService.REFRESH_TOKEN_KEY);
  }

  isTokenExpired(token?: string): boolean {
    const accessToken = token || this.getAccessToken();
    if (!accessToken) return true;

    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  // User Management
  getUser(): AuthUser | null {
    const userStr = localStorage.getItem(AuthService.USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch (error) {
      this.clearUser();
      return null;
    }
  }

  setUser(user: AuthUser): void {
    localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
  }

  clearUser(): void {
    localStorage.removeItem(AuthService.USER_KEY);
  }

  clearAuthData(): void {
    this.clearTokens();
    this.clearUser();
  }

  // Authentication State
  isAuthenticated(): boolean {
    const accessToken = this.getAccessToken();
    const user = this.getUser();
    return !!(accessToken && user && !this.isTokenExpired(accessToken));
  }

  // Auto-refresh token setup
  setupTokenRefresh(): void {
    const checkTokenExpiration = () => {
      const accessToken = this.getAccessToken();
      if (accessToken && !this.isTokenExpired()) {
        // Check if token expires in the next 5 minutes
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = payload.exp - currentTime;
          
          if (timeUntilExpiry <= 300) { // 5 minutes
            this.refreshToken().catch(() => {
              this.clearAuthData();
              window.location.href = '/login';
            });
          }
        } catch (error) {
          console.error('Error checking token expiration:', error);
        }
      }
    };

    // Check token expiration every minute
    setInterval(checkTokenExpiration, 60000);
  }

  // Error Handling
  private handleAuthError(error: any): Error {
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    
    if (error.response?.status === 401) {
      return new Error('Invalid credentials');
    }
    
    if (error.response?.status === 403) {
      return new Error('Access denied');
    }
    
    if (error.response?.status === 409) {
      return new Error('Email already exists');
    }
    
    if (error.response?.status >= 500) {
      return new Error('Server error. Please try again later.');
    }
    
    return new Error(error.message || 'An unexpected error occurred');
  }
}

export const authService = new AuthService();