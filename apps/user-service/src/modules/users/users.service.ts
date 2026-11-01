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
import { UserEventsPublisher } from '../../messaging/user-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserView } from './users.mapper';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: UserEventsPublisher,
    ) {}

    // === Nội bộ ===
    findUserByUserName(username: string) {
        return this.prisma.users.findUnique({
            where: { username }
        });
    }

    findUserByEmail(email: string) {
        return this.prisma.users.findUnique({
            where: { email }
        });
    }

    findUserById(id: number) {
        return this.prisma.users.findUnique({
            where: { id }
        });
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
                role_id: dto.roleId,
                fullname: dto.fullname,
                dob: dto.dob,
                phone: dto.phone,
            }
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
        const where: Prisma.usersWhereInput = {
            ...(q.roleId && { role_id: q.roleId }),
            ...(q.search && {
                OR: [
                    { username: { contains: q.search, mode: 'insensitive' }},
                    { fullname: { contains: q.search, mode: 'insensitive' }},
                    { email: { contains: q.search, mode: 'insensitive' }},
                ],
            }),
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.users.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.users.count({ where }),
        ])

        return { items: items.map(toUserView), total, page, limit };
    }

    async findById(id: number): Promise<UserView> {
        const user = await this.findUserById(id);
        if (!user)
            throw new NotFoundException('User not found');
        return toUserView(user);
    }

    async update({ id, data, actor }: UpdateUserMsg): Promise<UserView> {
        // 1 = ADMIN
        if (actor.roleId !== 1 && actor.sub !== id) {
            throw new ForbiddenException('Forbid to update this user')
        }

        await this.findById(id);

        const patch = {
            fullname: data.fullname,
            phone: data.phone,
            dob: data.dob,
        };

        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);

        const user = await this.prisma.users.update({
            where: { id },
            data: patch,
        });

        if (changedFields.length)
                this.events.updated(id, changedFields, actor.sub);
        return toUserView(user);

    }

    async updateRole({ id, roleId, actor }: UpdateRoleMsg): Promise<UserView> {
        if (actor.roleId !== 1)
            throw new ForbiddenException('ADMIN only');
        if (actor.sub === id)
            throw new ForbiddenException('Cannot change your own role');

        const current = await this.findUserById(id);
        if (!current)
            throw new NotFoundException('User not found');

        const user = await this.prisma.users.update({
            where: { id },
            data: { role_id: roleId},
        });

        if (current.role_id !== roleId)
            this.events.roleChanged(id, current.role_id, roleId, actor.sub);
        return toUserView(user);
    }

    async deactivate({ id, actor }: DeactivateUserMsg): Promise<UserView> {
        if (actor.roleId !== 1)
            throw new ForbiddenException('ADMIN only');
        if (actor.sub === id)
            throw new ForbiddenException('Cannot deactivate yourselve');
        await this.findById(id);

        const user = await this.prisma.users.update({
            where: { id },
            data: { is_active: false },
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
