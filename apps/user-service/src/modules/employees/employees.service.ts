import {
    ConflictException, ForbiddenException, Injectable, NotFoundException, BadRequestException
} from "@nestjs/common";
import { 
    CreateEmployeeDto, CreateEmployeeMsg, 
    EndEmployeeMsg, 
    EmployeeView,
    UserView,
    Role,
    FindEmployeeQueryDto,
    Paginated,
    myParseDate,
} from '@app/shared';
import { EmployeeEventsPublisher } from '../../messaging/publishers/employee-events.publisher';
import { Prisma } from "../../prisma/generated/client";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { toEmployeeView, toUserView } from "../views.mapper";

@Injectable()
export class EmployeesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly usersServise: UsersService,
        private readonly events: EmployeeEventsPublisher,
    ) {}

    // === Nội bộ ===
    findEmployeeById(id: number) {
        return this.prisma.employees.findUnique({
            where: { id },
            include: { 
                departments: true,
                users: { include: { roles: true }},
            },
        });
    }

    findEmployeeByUserId(userId: number) {
        return this.prisma.employees.findFirst({
            where: { 
                user_id: userId,
                end_date: null,
            },
            include: { 
                departments: true,
                users: { include: { roles: true }},
            },
        });
    }

    async createEmployee(dto: CreateEmployeeDto): Promise<{
        user: UserView,
        employee: EmployeeView,
    }> {
        const user = await this.usersServise.findById(dto.userId);
        // đã có throw exception
        const department = await this.prisma.departments.findUnique({ where: { id: dto.departmentId }});
        if (!department) throw new NotFoundException('Department not found');
        
        if (await this.prisma.employees.findFirst({
            where: {
                user_id: user.id,
                end_date: null,
            },
        })) {
            throw new ConflictException('Cannot assign a new position for an employee that is still working');
        }

        const employee = await this.prisma.employees.create({
            data: {
                user_id: user.id,
                department_id: department.id,
                position: dto.position,
                start_date: myParseDate(dto.startDate, 'startDate') || new Date(),
                end_date: myParseDate(dto.endDate, 'endDate'),
            },
            include: { departments: true },
        });

        return {
            user,
            employee: toEmployeeView(employee),
        };
    }

    // === RPC ===
    async create({ dto, actorId }: CreateEmployeeMsg): Promise<{
        user: UserView,
        employee: EmployeeView,
    }> {
        const res = await this.createEmployee(dto);
        this.events.created(res.employee, actorId);
        return res;
    }

    async end({ id, data, actor }: EndEmployeeMsg): Promise<{
        user: UserView,
        employee: EmployeeView,
    }> {
        if (actor.roleCode !== Role.ADMIN) {
            throw new ForbiddenException('ADMIN only');
        }
       
        const employee = await this.prisma.employees.update({
            where: { id },
            data: { end_date: myParseDate(data.endDate, 'endDate') || new Date() },
            include: { departments: true },
        });
        const view = toEmployeeView(employee);
        const user = await this.usersServise.findById(employee.user_id);
        
        this.events.ended(view, actor.sub);
        return {
            user, 
            employee: view,
        };
    }

    // muốn update thì phải end trước rồi create

    async findAll(q: FindEmployeeQueryDto): Promise<Paginated<{
        user: UserView,
        employee: EmployeeView,
    }>> {
        const { 
            page = 1, 
            limit = 20 
        } = q;
        const where: Prisma.employeesWhereInput = {
            end_date: null,
            ...(q.search && {
                position: { contains: q.search, mode: 'insensitive' },
            }),
            ...(q.department && {
                departments: {
                    name: { contains: q.department, mode: 'insensitive' },
                }
            }),
        };

        const [total, employees] = await this.prisma.$transaction([
            this.prisma.employees.count({ where }),
            this.prisma.employees.findMany({
                where,
                include: { 
                    departments: true, 
                    users: { include: { roles: true }},
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' }, 
            }),
        ]);

        return {
            items: employees.map(e => ({
                user: toUserView(e.users),
                employee: toEmployeeView(e),
            })),
            total, page, limit 
        };
    }

    async findById(id: number): Promise<{
        user: UserView,
        employee: EmployeeView,
    }> {
        const employee = await this.findEmployeeById(id);
        if (!employee)
            throw new NotFoundException('Employee not found');
        return {
            user: toUserView(employee.users),
            employee: toEmployeeView(employee),
        };
    }

    async findByUserId(userId: number): Promise<{
        user: UserView,
        employee: EmployeeView,
    }> {
        const employee = await this.findEmployeeByUserId(userId);
        if (!employee)
            throw new NotFoundException('This user is currently not an employee');
        return {
            user: toUserView(employee.users),
            employee: toEmployeeView(employee),
        };
    }

    async getHistory(q: FindEmployeeQueryDto): Promise<Paginated<EmployeeView>> {
        const {
            page = 1,
            limit = 20,
        } = q;
        if (!q.userId) throw new BadRequestException('User id missing');
        const user = await this.usersServise.findById(q.userId);
        const where: Prisma.employeesWhereInput = {
            user_id: user.id
        };

        const [total, history] = await this.prisma.$transaction([
            this.prisma.employees.count({ where }),
            this.prisma.employees.findMany({
                where,
                include: { departments: true },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { start_date: 'desc' },
            }),
        ]);

        return {
            items: history.map(toEmployeeView),
            total, page, limit 
        };
    }
}