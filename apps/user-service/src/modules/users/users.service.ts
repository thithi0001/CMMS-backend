import {
    ConflictException, ForbiddenException, Injectable, NotFoundException
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
    CreateUserMsg, DeactivateUserMsg, UpdateRoleMsg, UpdateUserMsg,
    FindUserQueryDto, CreateUserDto,
    Paginated,
    UserStats, UserView,
    Role,
} from '@app/shared';
import { UserEventsPublisher } from '../../messaging/publishers/user-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserView } from '../views.mapper';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: UserEventsPublisher,
    ) {}

    // === Nội bộ ===
    findUserByUserName(username: string) {
        return this.prisma.users.findUnique({
            where: { username },
            include: { roles: true },
        });
    }

    findUserByEmail(email: string) {
        return this.prisma.users.findUnique({
            where: { email },
            include: { roles: true },
        });
    }

    findUserById(id: number) {
        return this.prisma.users.findUnique({
            where: { id },
            include: { roles: true },
        });
    }

    async resolveRole(roleCode: Role) {
        const role = await this.prisma.roles.findUnique({
            where: { code: roleCode },
        });
        if (!role)
            throw new NotFoundException('Role not found');
        return role;
    }

    setPassword(id: number, hashedPassword: string) {
        return this.prisma.users.update({
            where: { id },
            data: { hashed_password: hashedPassword }
        });
    }

    async createUser(dto: CreateUserDto): Promise<UserView> {
        const username = dto.username.toLowerCase();
        const email = dto.email.toLowerCase();
        const role = await this.resolveRole(dto.roleCode);

        if (await this.prisma.users.findUnique({ where: { username }})) {
            throw new ConflictException('Username exsisted');
        }

        if (await this.prisma.users.findUnique({ where: { email }})) {
            throw new ConflictException('Email has been used');
        }

        const user = await this.prisma.users.create({
            data: {
                username,
                hashed_password: await bcrypt.hash(dto.password, 12),
                email,
                role_id: role.id,
                fullname: dto.fullname,
                dob: dto.dob,
                phone: dto.phone,
            },
            include: { roles: true },
        });

        return toUserView(user);
    }

    // === RPC ===
    async create({ dto, actorId }: CreateUserMsg): Promise<UserView> {
        const user = await this.createUser(dto);
        this.events.created(user, actorId);
        return user;
    }

    async findAll(q: FindUserQueryDto): Promise<Paginated<UserView>> {
        const page = q.page ?? 1;
        const limit = q.limit ?? 20;
        const role = q.roleCode ? await this.resolveRole(q.roleCode) : undefined;
        const where: Prisma.usersWhereInput = {
            ...(role && { role_id: role.id }),
            ...(q.search && {
                OR: [
                    { username: { contains: q.search, mode: 'insensitive' }},
                    { fullname: { contains: q.search, mode: 'insensitive' }},
                    { email: { contains: q.search, mode: 'insensitive' }},
                ],
            }),
        };

        const [users, total] = await this.prisma.$transaction([
            this.prisma.users.findMany({
                where,
                include: { roles: true },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { username: 'asc' },
            }),
            this.prisma.users.count({ where }),
        ]);

        return { 
            items: users.map(toUserView), 
            total, page, limit 
        };
    }

    async findById(id: number): Promise<UserView> {
        const user = await this.findUserById(id);
        if (!user)
            throw new NotFoundException('User not found');
        return toUserView(user);
    }

    async update({ id, data, actor }: UpdateUserMsg): Promise<UserView> {
        const user = await this.findById(id);

        if (actor.sub !== user.id)
            throw new ForbiddenException("You can only update your data");

        const patch = {
            fullname: data.fullname,
            phone: data.phone,
            dob: data.dob,
        };

        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);

        const updated = await this.prisma.users.update({
            where: { id: user.id },
            data: patch,
            include: { roles: true },
        });

        if (changedFields.length)
                this.events.updated(id, changedFields, actor.sub);
        return toUserView(updated);

    }

    async updateRole({ id, roleCode, actor }: UpdateRoleMsg): Promise<UserView> {
        if (actor.roleCode !== Role.ADMIN)
            throw new ForbiddenException('ADMIN only');
        if (actor.sub === id)
            throw new ForbiddenException('Cannot change your own role');

        const current = await this.findUserById(id);
        if (!current)
            throw new NotFoundException('User not found');
        const role = await this.resolveRole(roleCode);

        const user = await this.prisma.users.update({
            where: { id },
            data: { role_id: role.id },
            include: { roles: true },
        });

        if (current.role_id !== role.id)
            this.events.roleChanged(id, current.roles.code, role.code, actor.sub);
        return toUserView(user);
    }

    async deactivate({ id, actor }: DeactivateUserMsg): Promise<UserView> {
        if (actor.roleCode !== Role.ADMIN)
            throw new ForbiddenException('ADMIN only');
        if (actor.sub === id)
            throw new ForbiddenException('Cannot deactivate yourselve');
        await this.findById(id);

        const user = await this.prisma.users.update({
            where: { id },
            data: { is_active: false },
            include: { roles: true },
        });
        const view = toUserView(user);
        this.events.deactivated(view, actor.sub);
        return view;
    }

    async stats(): Promise<UserStats> {
        const [total, active, groups] = await Promise.all([
            this.prisma.users.count(),
            this.prisma.users.count({ where: { is_active: true }}),
            this.prisma.users.groupBy({
                by: ['role_id'],
                _count: { _all: true },
            }),
        ]);

        return {
            total, active,
            byRole: Object.fromEntries(
                groups.map((g) => [g.role_id, g._count._all])),
        };
    }
}
