import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

// HTTP Link
const httpLink = createHttpLink({
  uri: process.env.REACT_APP_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
});

// Auth Link
const authLink = setContext(async (_, { headers }) => {
  const token = localStorage.getItem('lanka_access_token');
  
  // Check if token is expired and try to refresh
  if (token && isTokenExpired(token)) {
    try {
      const refreshToken = localStorage.getItem('lanka_refresh_token');
      if (refreshToken) {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api'}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        
        if (response.ok) {
          const data = await response.json();
          const newToken = data.data.accessToken;
          localStorage.setItem('lanka_access_token', newToken);
          localStorage.setItem('lanka_refresh_token', data.data.refreshToken);
          
          return {
            headers: {
              ...headers,
              authorization: `Bearer ${newToken}`,
            }
          };
        }
      }
      
      // Refresh failed, clear auth data
      clearAuthData();
      return {
        headers: {
          ...headers,
        }
      };
    } catch (error) {
      // Refresh failed, clear auth data
      clearAuthData();
      return {
        headers: {
          ...headers,
        }
      };
    }
  }
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

// Helper functions
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
};

const clearAuthData = (): void => {
  localStorage.removeItem('lanka_access_token');
  localStorage.removeItem('lanka_refresh_token');
  localStorage.removeItem('lanka_user');
};

// Error Link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
      
      // Handle authentication errors from GraphQL
      if (message.includes('Unauthorized') || message.includes('Authentication')) {
        clearAuthData();
        window.location.href = '/login';
      }
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError}`);
    
    // Handle 401 errors
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      clearAuthData();
      window.location.href = '/login';
    }
  }
});

// Apollo Client Configuration
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          modules: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
          requirements: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
          architectures: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

// Helper functions for cache management
export const clearCache = () => {
  apolloClient.clearStore();
};

export const resetStore = () => {
  apolloClient.resetStore();
};

// Authentication helpers for Apollo
export const refreshApolloAuth = async () => {
  try {
    const refreshToken = localStorage.getItem('lanka_refresh_token');
    if (refreshToken) {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api'}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('lanka_access_token', data.data.accessToken);
        localStorage.setItem('lanka_refresh_token', data.data.refreshToken);
        
        // Reset store to refetch queries with new token
        await apolloClient.resetStore();
        return;
      }
    }
    throw new Error('Refresh failed');
  } catch (error) {
    clearAuthData();
    window.location.href = '/login';
  }
};

export const logoutFromApollo = () => {
  clearAuthData();
  apolloClient.clearStore();
};