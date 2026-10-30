import { Role } from './role';

export interface JwtPayload {
  sub: string;       // userId
  username: string;
  role: Role;
  iat?: number;
  exp?: number;
}
