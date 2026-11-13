import {
    BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import { 
    Role, Paginated, myParseDate,
    TicketView,
    FindTicketMsg,
    CreateTicketMsg,
    UpdateTicketMsg,
    TicketActionMsg,
} from '@app/shared';
import { TicketEventsPublisher } from '../../messaging/publishers/tickets-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toTicketView } from '../views.mapper';

@Injectable()
export class TicketsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: TicketEventsPublisher,
    ) {}

    findTicketById(id: number) {
        return this.prisma.tickets.findUnique({ where: { id }});
    }

    async findById(id: number): Promise<TicketView> {
        const ticket = await this.findTicketById(id);
        if (!ticket)
            throw new NotFoundException('Ticket not found');
        return toTicketView(ticket);
    }

    async findAll({ q, actor }: FindTicketMsg): Promise<Paginated<TicketView>> {
        const { page = 1, limit = 20, isConfirmed = false } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const userId = actor.roleCode === Role.ADMIN ? q.userId : actor.employeeId;
        const where: Prisma.ticketsWhereInput = {
            is_confirmed: isConfirmed,
            ...(userId && {
                OR: [
                    { creator_id: userId },
                    { confirmer_id: userId },
                ],
            }),
            ...(q.deviceId && { device_id: q.deviceId }),
            ...(q.priority && { priority: q.priority }),
            ...(Object.keys(dateFilter).length > 0 ? { created_at: dateFilter } : {}),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.tickets.count({ where }),
            this.prisma.tickets.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: [
                    { priority: 'desc' },
                    { created_at: 'desc' },
                ],
            })
        ]);

        return {
            items: items.map(toTicketView),
            total, page, limit
        }
    }

    async create({ dto, actor }: CreateTicketMsg): Promise<TicketView> {
        const ticket = await this.prisma.tickets.create({
            data: {
                creator_id: actor.employeeId,
                device_id: dto.deviceId,
                priority: dto.priority,
                description: dto.description,
                img_url: dto.imgUrl,
            },
        });
        const view = toTicketView(ticket);
        this.events.created(view, actor.sub);
        return view;
    }

    updateTicket(id: number, data: Prisma.ticketsUpdateInput) {
        return this.prisma.tickets.update({
            where: { id }, data,
        });
    }

    async update({ id, data, actor }: UpdateTicketMsg): Promise<TicketView> {
        const ticket = await this.findById(id);
        if (actor.employeeId !== ticket.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (ticket.isConfirmed)
            throw new ForbiddenException('Forbid to update this ticket');

        const patch: Prisma.ticketsUpdateInput = {
            priority: data.priority,
            description: data.description,
            img_url: data.imgUrl,
        };
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);
        if (!changedFields.length) 
            return ticket;

        const updated = await this.updateTicket(id, patch);
        const view = toTicketView(updated);
        this.events.updated(view, changedFields, actor.sub);
        return view;
    }

    async confirm({ id, actor }: TicketActionMsg): Promise<TicketView> {
        if (actor.roleCode !== Role.MANAGER)
            throw new UnauthorizedException('Unauthorized to perform this action');
        
        const ticket = await this.findById(id);
        if (ticket.isConfirmed)
            throw new ForbiddenException('Ticket is already confirmed');
        
        const patch: Prisma.ticketsUpdateInput = {
            is_confirmed: true,
            confirmer_id: actor.employeeId
        }
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);
        const updated = await this.updateTicket(id, patch);
        const view = toTicketView(updated);
        this.events.confirmed(view, actor.sub);
        return view;
        
    }

    async delete({ id, actor }): Promise<TicketView> {
        const ticket = await this.findById(id);
        if (actor.employeeId !== ticket.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (ticket.isConfirmed)
            throw new ForbiddenException('Ticket is already confirmed');

        await this.prisma.tickets.delete({ where: { id }});
        this.events.deleted(ticket, actor.sub);
        return ticket;
    }

    async stats() {

    }

}
