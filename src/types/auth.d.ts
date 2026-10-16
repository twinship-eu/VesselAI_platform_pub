export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  // F4: the browser never holds the Keycloak access/refresh tokens. These
  // fields are retained as optional only for backward compatibility with
  // older persisted state; nothing reads them. Auth is carried by the
  // httpOnly session cookie + server-side proxy injection.
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry: number;
  backendAccessToken?: string;
  backendTokenExpiry?: number;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AppState {
  // UI State
  sidebarCollapsed: boolean;
  currentRoute: string;
  
  // Navigation State
  breadcrumbs: BreadcrumbItem[];
  pageTitle: string;
  
  // Theme State
  colorMode: 'light' | 'dark';
}

export interface BreadcrumbItem {
  label: string;
  href: string;
  isActive?: boolean;
}
