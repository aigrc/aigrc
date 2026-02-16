/**
 * AIGRC API Client
 *
 * This is the main API client that replaces Supabase in the dashboard.
 * It provides a unified interface to all AIGRC backend services.
 *
 * The client supports two modes:
 * 1. Cloud mode: Connects to AIGRC cloud services
 * 2. Local mode: Connects to local AIGRC backend (for air-gapped deployments)
 */

import type {
  AssetCard,
  DetectionResult,
  Policy,
  PolicyViolation,
  ComplianceProfile,
  ComplianceAssessment,
  RuntimeAgent,
  KillSwitchCommand,
  PolicyDecision,
  User,
  Organization,
  DashboardMetrics,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

// ============================================================================
// Configuration
// ============================================================================

export interface AigrcClientConfig {
  /** Base URL for the AIGRC API */
  baseUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** JWT token for user authentication */
  authToken?: string;
  /** Organization ID for multi-tenant operations */
  organizationId?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

const DEFAULT_CONFIG: Partial<AigrcClientConfig> = {
  timeout: 30000,
  debug: false,
};

// ============================================================================
// API Client Class
// ============================================================================

export class AigrcClient {
  private config: AigrcClientConfig;

  constructor(config: AigrcClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // HTTP Methods
  // --------------------------------------------------------------------------

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean>
  ): Promise<ApiResponse<T>> {
    const url = new URL(path, this.config.baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    if (this.config.organizationId) {
      headers['X-Organization-ID'] = this.config.organizationId;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: errorData.message || response.statusText,
            details: errorData,
          },
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      if (this.config.debug) {
        console.error('[AIGRC Client Error]', error);
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------

  setAuthToken(token: string): void {
    this.config.authToken = token;
  }

  setOrganization(organizationId: string): void {
    this.config.organizationId = organizationId;
  }

  // --------------------------------------------------------------------------
  // Asset Card Operations
  // --------------------------------------------------------------------------

  readonly assets = {
    list: (params?: {
      page?: number;
      pageSize?: number;
      riskLevel?: string;
      status?: string;
      search?: string;
    }): Promise<ApiResponse<PaginatedResponse<AssetCard>>> => {
      return this.request('GET', '/api/v1/assets', undefined, params as Record<string, string | number | boolean>);
    },

    get: (id: string): Promise<ApiResponse<AssetCard>> => {
      return this.request('GET', `/api/v1/assets/${id}`);
    },

    create: (asset: Omit<AssetCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<AssetCard>> => {
      return this.request('POST', '/api/v1/assets', asset);
    },

    update: (id: string, asset: Partial<AssetCard>): Promise<ApiResponse<AssetCard>> => {
      return this.request('PATCH', `/api/v1/assets/${id}`, asset);
    },

    delete: (id: string): Promise<ApiResponse<void>> => {
      return this.request('DELETE', `/api/v1/assets/${id}`);
    },

    archive: (id: string): Promise<ApiResponse<AssetCard>> => {
      return this.request('POST', `/api/v1/assets/${id}/archive`);
    },

    validate: (asset: Partial<AssetCard>): Promise<ApiResponse<{ valid: boolean; errors: string[] }>> => {
      return this.request('POST', '/api/v1/assets/validate', asset);
    },
  };

  // --------------------------------------------------------------------------
  // Detection Operations
  // --------------------------------------------------------------------------

  readonly detection = {
    scan: (projectPath: string): Promise<ApiResponse<DetectionResult>> => {
      return this.request('POST', '/api/v1/detection/scan', { projectPath });
    },

    getResult: (scanId: string): Promise<ApiResponse<DetectionResult>> => {
      return this.request('GET', `/api/v1/detection/scans/${scanId}`);
    },

    listScans: (params?: {
      page?: number;
      pageSize?: number;
    }): Promise<ApiResponse<PaginatedResponse<DetectionResult>>> => {
      return this.request('GET', '/api/v1/detection/scans', undefined, params as Record<string, string | number | boolean>);
    },

    suggestAssetCard: (scanId: string): Promise<ApiResponse<Partial<AssetCard>>> => {
      return this.request('POST', `/api/v1/detection/scans/${scanId}/suggest`);
    },
  };

  // --------------------------------------------------------------------------
  // Policy Operations
  // --------------------------------------------------------------------------

  readonly policies = {
    list: (params?: {
      page?: number;
      pageSize?: number;
      complianceProfile?: string;
    }): Promise<ApiResponse<PaginatedResponse<Policy>>> => {
      return this.request('GET', '/api/v1/policies', undefined, params as Record<string, string | number | boolean>);
    },

    get: (id: string): Promise<ApiResponse<Policy>> => {
      return this.request('GET', `/api/v1/policies/${id}`);
    },

    create: (policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Policy>> => {
      return this.request('POST', '/api/v1/policies', policy);
    },

    update: (id: string, policy: Partial<Policy>): Promise<ApiResponse<Policy>> => {
      return this.request('PATCH', `/api/v1/policies/${id}`, policy);
    },

    delete: (id: string): Promise<ApiResponse<void>> => {
      return this.request('DELETE', `/api/v1/policies/${id}`);
    },

    check: (assetId: string, policyId: string): Promise<ApiResponse<PolicyViolation[]>> => {
      return this.request('POST', '/api/v1/policies/check', { assetId, policyId });
    },

    getViolations: (params?: {
      assetId?: string;
      severity?: string;
      page?: number;
      pageSize?: number;
    }): Promise<ApiResponse<PaginatedResponse<PolicyViolation>>> => {
      return this.request('GET', '/api/v1/policies/violations', undefined, params as Record<string, string | number | boolean>);
    },
  };

  // --------------------------------------------------------------------------
  // Compliance Operations
  // --------------------------------------------------------------------------

  readonly compliance = {
    listProfiles: (): Promise<ApiResponse<ComplianceProfile[]>> => {
      return this.request('GET', '/api/v1/compliance/profiles');
    },

    getProfile: (id: string): Promise<ApiResponse<ComplianceProfile>> => {
      return this.request('GET', `/api/v1/compliance/profiles/${id}`);
    },

    assess: (assetId: string, profileId: string): Promise<ApiResponse<ComplianceAssessment>> => {
      return this.request('POST', '/api/v1/compliance/assess', { assetId, profileId });
    },

    getAssessment: (id: string): Promise<ApiResponse<ComplianceAssessment>> => {
      return this.request('GET', `/api/v1/compliance/assessments/${id}`);
    },

    listAssessments: (params?: {
      assetId?: string;
      profileId?: string;
      page?: number;
      pageSize?: number;
    }): Promise<ApiResponse<PaginatedResponse<ComplianceAssessment>>> => {
      return this.request('GET', '/api/v1/compliance/assessments', undefined, params as Record<string, string | number | boolean>);
    },
  };

  // --------------------------------------------------------------------------
  // Runtime Governance Operations (AIGOS)
  // --------------------------------------------------------------------------

  readonly runtime = {
    listAgents: (params?: {
      status?: string;
      page?: number;
      pageSize?: number;
    }): Promise<ApiResponse<PaginatedResponse<RuntimeAgent>>> => {
      return this.request('GET', '/api/v1/runtime/agents', undefined, params as Record<string, string | number | boolean>);
    },

    getAgent: (instanceId: string): Promise<ApiResponse<RuntimeAgent>> => {
      return this.request('GET', `/api/v1/runtime/agents/${instanceId}`);
    },

    killSwitch: (
      instanceId: string,
      command: 'terminate' | 'pause' | 'resume',
      reason: string
    ): Promise<ApiResponse<KillSwitchCommand>> => {
      return this.request('POST', `/api/v1/runtime/agents/${instanceId}/kill-switch`, {
        command,
        reason,
      });
    },

    getKillSwitchHistory: (instanceId: string): Promise<ApiResponse<KillSwitchCommand[]>> => {
      return this.request('GET', `/api/v1/runtime/agents/${instanceId}/kill-switch/history`);
    },

    getPolicyDecisions: (params?: {
      instanceId?: string;
      decision?: string;
      page?: number;
      pageSize?: number;
    }): Promise<ApiResponse<PaginatedResponse<PolicyDecision>>> => {
      return this.request('GET', '/api/v1/runtime/decisions', undefined, params as Record<string, string | number | boolean>);
    },
  };

  // --------------------------------------------------------------------------
  // User and Organization Operations
  // --------------------------------------------------------------------------

  readonly users = {
    getCurrentUser: (): Promise<ApiResponse<User>> => {
      return this.request('GET', '/api/v1/users/me');
    },

    updateProfile: (updates: Partial<User>): Promise<ApiResponse<User>> => {
      return this.request('PATCH', '/api/v1/users/me', updates);
    },

    list: (params?: {
      page?: number;
      pageSize?: number;
      role?: string;
    }): Promise<ApiResponse<PaginatedResponse<User>>> => {
      return this.request('GET', '/api/v1/users', undefined, params as Record<string, string | number | boolean>);
    },

    invite: (email: string, role: string): Promise<ApiResponse<{ inviteId: string }>> => {
      return this.request('POST', '/api/v1/users/invite', { email, role });
    },

    updateRole: (userId: string, role: string): Promise<ApiResponse<User>> => {
      return this.request('PATCH', `/api/v1/users/${userId}/role`, { role });
    },

    remove: (userId: string): Promise<ApiResponse<void>> => {
      return this.request('DELETE', `/api/v1/users/${userId}`);
    },
  };

  readonly organizations = {
    getCurrent: (): Promise<ApiResponse<Organization>> => {
      return this.request('GET', '/api/v1/organizations/current');
    },

    update: (updates: Partial<Organization>): Promise<ApiResponse<Organization>> => {
      return this.request('PATCH', '/api/v1/organizations/current', updates);
    },

    updateSettings: (settings: Partial<Organization['settings']>): Promise<ApiResponse<Organization>> => {
      return this.request('PATCH', '/api/v1/organizations/current/settings', settings);
    },
  };

  // --------------------------------------------------------------------------
  // Dashboard Analytics Operations
  // --------------------------------------------------------------------------

  readonly dashboard = {
    getMetrics: (): Promise<ApiResponse<DashboardMetrics>> => {
      return this.request('GET', '/api/v1/dashboard/metrics');
    },

    getComplianceTrends: (
      profileIds: string[],
      days: number
    ): Promise<ApiResponse<{ profileId: string; dataPoints: { timestamp: string; value: number }[] }[]>> => {
      return this.request('GET', '/api/v1/dashboard/compliance-trends', undefined, {
        profileIds: profileIds.join(','),
        days,
      });
    },

    getRiskDistribution: (): Promise<ApiResponse<Record<string, number>>> => {
      return this.request('GET', '/api/v1/dashboard/risk-distribution');
    },

    getRecentActivity: (limit?: number): Promise<ApiResponse<{
      type: string;
      description: string;
      timestamp: string;
      userId?: string;
    }[]>> => {
      return this.request('GET', '/api/v1/dashboard/recent-activity', undefined, { limit: limit || 10 });
    },
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientInstance: AigrcClient | null = null;

export function createAigrcClient(config: AigrcClientConfig): AigrcClient {
  clientInstance = new AigrcClient(config);
  return clientInstance;
}

export function getAigrcClient(): AigrcClient {
  if (!clientInstance) {
    throw new Error('AIGRC client not initialized. Call createAigrcClient() first.');
  }
  return clientInstance;
}

// ============================================================================
// React Hook for Client Access
// ============================================================================

export function useAigrcClient(): AigrcClient {
  return getAigrcClient();
}
