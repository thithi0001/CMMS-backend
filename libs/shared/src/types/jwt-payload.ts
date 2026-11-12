import { Role } from './role';

export interface JwtPayload {
  sub: number;       // userId
  username: string;
  roleId: number;
  roleCode: Role;
  employeeId: number;
  tokenType?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}
