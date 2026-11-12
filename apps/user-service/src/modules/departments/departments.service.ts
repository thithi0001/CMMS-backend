import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { 
    CreateDepartmentMsg, CreateDepartmentDto, 
    FindDepartmentQueryDto,
    Paginated,
    DepartmentView,
} from '@app/shared';
import { DepartmentEventsPublisher } from '../../messaging/publishers/department-events.publisher';
import { Prisma } from "../../prisma/generated/client";
import { PrismaService } from "../../prisma/prisma.service";
import { toDepartmentView } from "../views.mapper";


@Injectable()
export class DepartmentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DepartmentEventsPublisher,
    ) {}

    // === Nội bộ ===
    findDepartmentById(id: number) {
        return this.prisma.departments.findUnique({
            where: { id },
        });
    }

    async createDepartment(dto: CreateDepartmentDto): Promise<DepartmentView> {
        if (await this.prisma.departments.findUnique({ where: { code: dto.code } })) {
            throw new ConflictException('Department code already exists');
        }
        
        const department = await this.prisma.departments.create({
            data: {
                name: dto.name,
                code: dto.code,
            },
        });

        return toDepartmentView(department);
    }

    // === RPC ===
    async create({ dto, actorId }: CreateDepartmentMsg): Promise<DepartmentView> {
        const department = await this.createDepartment(dto);
        this.events.created(department, actorId);
        return department;
    }

    async findById(id: number): Promise<DepartmentView> {
        const department = await this.findDepartmentById(id);
        if (!department) {
            throw new NotFoundException('Department not found');
        }
        return toDepartmentView(department);
    }

    async findAll(q: FindDepartmentQueryDto): Promise<Paginated<DepartmentView>> {
        const { 
            page = 1, 
            limit = 20,
        } = q;
        const where: Prisma.departmentsWhereInput = {
            ...(q.search && {
                OR: [
                    { name: { contains: q.search, mode: 'insensitive' } },
                    { code: { contains: q.search, mode: 'insensitive' } },
                ],
            }),
        };

        const [total, departments] = await this.prisma.$transaction([
            this.prisma.departments.count({ where }),
            this.prisma.departments.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { code: 'asc' },
            }),
        ]);

        return {
            items: departments.map(toDepartmentView),
            total, page, limit
        };
    }
}