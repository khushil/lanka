// Core types
export * from './architecture.types';
export * from './requirements.types';

// DevOps Intelligence Hub types
export * from './devops.types';

// Common types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserContext {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface ProjectContext {
  projectId: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'archived';
}

export interface ArchitectureContext {
  project: {
    name: string;
    type: string;
    technologies: string[];
    architecture: string;
  };
  requirements?: {
    performance?: any;
    deployment?: any;
    monitoring?: any;
  };
}