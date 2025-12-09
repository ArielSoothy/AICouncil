export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: 'beta' | 'admin';
  createdAt: Date;
  lastActiveAt: Date;
}

export interface Session {
  user: User;
  expires: string;
}

export interface AuthConfig {
  providers: string[];
  callbacks: {
    session: (params: any) => Promise<Session>;
    jwt: (params: any) => Promise<any>;
  };
}
