import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    // F4: the Keycloak access/ID tokens are intentionally NOT exposed on the
    // session returned to the browser. Only a liveness hint + expiry remain so
    // the client can schedule a silent refresh without holding a token.
    hasAccessToken?: boolean;
    accessTokenExpires?: number;
    error?: string;
    user: {
      id: string;
      name?: string;
      email?: string;
      image?: string;
      roles?: string[];
      preferred_username?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };
  }

  interface User {
    id: string;
    name?: string;
    email?: string;
    image?: string;
    roles?: string[];
    preferred_username?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    idToken?: string;
    accessToken?: string;
    backendAccessToken?: string;
    backendAccessTokenExpires?: number;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    id?: string;
    roles?: string[];
    preferred_username?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  }
}
