import { Role } from './role';

export interface JwtPayload {
  sub: number;       // userId
  username: string;
  roleId: number;
  roleCode: Role;
  tokenType?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}
