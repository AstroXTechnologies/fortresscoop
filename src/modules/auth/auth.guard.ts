import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from 'src/modules/auth/auth.service';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authSvc: AuthService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest<Request>();
    const isValid = await this.authSvc.validateRequest(request);
    if (!isValid) return false;

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Type user object for safety
    interface UserWithRole {
      role?: string;
      [key: string]: unknown;
    }
    // Narrow the request to a typed shape that includes optional user to avoid unsafe `any` access
    const req = request as Request & { user?: UserWithRole };
    const user = req.user;
    if (!user || typeof user.role !== 'string') {
      // Defensive fallback: if a role is required and missing, but 'user' is allowed, assume 'user'
      if (requiredRoles.map((r) => r.toLowerCase()).includes('user')) {
        req.user = { ...(user || {}), role: 'user' };
      } else {
        throw new ForbiddenException('User role not found');
      }
    }

    const incomingRole = (req.user!.role as string) || '';
    const normalizedRequired = requiredRoles.map((r) => r.toLowerCase());
    const hasRole = normalizedRequired.includes(incomingRole.toLowerCase());
    if (!hasRole) {
      throw new ForbiddenException(`only ${requiredRoles.join(', ')} allowed`);
    }
    return true;
  }
}
