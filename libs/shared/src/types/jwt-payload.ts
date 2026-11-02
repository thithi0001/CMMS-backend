import { Role } from './role';

export interface JwtPayload {
  sub: number;       // userId
  username: string;
  roleId: number;
  role?: Role;
  iat?: number;
  exp?: number;
}
