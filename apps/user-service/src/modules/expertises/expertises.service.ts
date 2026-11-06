import {
    ConflictException, ForbiddenException, Injectable, NotFoundException, BadRequestException
} from "@nestjs/common";
import { 
    CreateExpertiseDto, 
    CreateExpertiseMsg, AssignExpertiseMsg, RevokeExpertiseMsg,
    ExpertiseView, UserView,
    Role,
    FindExpertiseQueryDto,
    Paginated,
} from '@app/shared';
import { ExpertiseEventsPublisher } from '../../messaging/publishers/expertise-events.publisher';
import { Prisma } from "../../prisma/generated/client";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { toAssignExpertiseView, toExpertiseView } from "../views.mapper";

@Injectable()
export class ExpertisesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly usersServise: UsersService,
        private readonly events: ExpertiseEventsPublisher,
    ) {}
    
    findExpertiseById(id: number) {
        return this.prisma.expertises.findUnique({
            where: { id },
        });
    }

    findExpertisesByUserId(userId: number) {
        return this.prisma.expertises.findMany({
            where: {
                technician_expertise: { some: { user_id: userId }},
            },
        });
    }

    async createExpertise(dto: CreateExpertiseDto): Promise<ExpertiseView> {
        const expertise = await this.prisma.expertises.create({
            data: {
                name: dto.name,
                code: dto.code,
                description: dto.description,
            },
        });

        return toExpertiseView(expertise);
    }

    async findById(id: number): Promise<ExpertiseView> {
        const expertise = await this.findExpertiseById(id);
        if (!expertise)
            throw new NotFoundException('Expertise not found');
        return toExpertiseView(expertise);
    }

    async findByUserId(q: FindExpertiseQueryDto): Promise<Paginated<ExpertiseView>> {
        const {
            page = 1,
            limit = 20,
        } = q;
        if (!q.userId) throw new BadRequestException('User id missing');
        const where: Prisma.expertisesWhereInput = {
            technician_expertise: { some: { user_id: q.userId }},
        };

        const [total, expertises] = await this.prisma.$transaction([
            this.prisma.expertises.count({ where }),
            this.prisma.expertises.findMany({ 
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { code: 'asc' }, 
            }),
        ]);

        return {
            items: expertises.map(toExpertiseView),
            total, page, limit
        };
    }

    async findAll(q: FindExpertiseQueryDto): Promise<Paginated<ExpertiseView>> {
        const {
            page = 1,
            limit = 20,
        } = q;
        const where: Prisma.expertisesWhereInput = {
            ...(q.search && {
                code: { contains: q.search, mode: 'insensitive'},
                name: { contains: q.search, mode: 'insensitive'},
            }),
        };

        const [total, expertises] = await this.prisma.$transaction([
            this.prisma.expertises.count({ where }),
            this.prisma.expertises.findMany({ 
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { code: 'asc' }, 
            }),
        ]);

        return {
            items: expertises.map(toExpertiseView),
            total, page, limit
        };
    }

    async create({ dto, actorId }: CreateExpertiseMsg): Promise<ExpertiseView> {
        const expertise = await this.createExpertise(dto);
        this.events.created(expertise, actorId);
        return expertise;
    }

    async assign({ data, actor }: AssignExpertiseMsg): Promise<{
        user: UserView,
        expertise: ExpertiseView,
        assignedAt: string | undefined,
    }> {
        const user = await this.usersServise.findById(data.userId);
        if (actor.sub !== user.id )
            throw new ForbiddenException('Cannot assign expertise to other user');
        if (user.role.code !== Role.TECHNICIAN)
            // chỉ kiểm tra role hiện tại
            throw new BadRequestException('Only assign expertise to TECNICIAN');
        const expertise = await this.findById(data.expertiseId);

        const assigned = await this.prisma.technician_expertise.create({
            data: {
                user_id: user.id,
                expertise_id: expertise.id,
            },
        });

        const view = toAssignExpertiseView(assigned);
        this.events.assigned(view, actor.sub);

        return {
            user,
            expertise,
            assignedAt: view.assignedAt,
        };
    }

    async revoke({ data, actor }: RevokeExpertiseMsg): Promise<{
        user: UserView,
        expertise: ExpertiseView,
        revokedAt: string | undefined,
    }> {
        const user = await this.usersServise.findById(data.userId);
        if (actor.sub !== user.id )
            throw new ForbiddenException('Cannot revoke other user expertise');
        const expertise = await this.findById(data.expertiseId);
        
        const revoked = await this.prisma.technician_expertise.delete({
            where: {
                user_id_expertise_id: {
                    user_id: user.id,
                    expertise_id: expertise.id,
                },
            },
        });

        const view = toAssignExpertiseView(revoked, new Date());
        this.events.revoked(view, actor.sub);

        return {
            user,
            expertise,
            revokedAt: view.revokedAt,
        };
    }
}
