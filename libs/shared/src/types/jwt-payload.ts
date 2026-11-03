import { Role } from './role';

export interface JwtPayload {
  sub: number;       // userId
  username: string;
  roleId: number;
  role: Role; // lỗi
  tokenType?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}
