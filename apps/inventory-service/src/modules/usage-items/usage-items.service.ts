import {
    ConflictException, ForbiddenException, Injectable, NotFoundException
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
    CreateUsageItemListMsg,
    FindUsageItemListQueryDto,
    Paginated,
    Role,
    UsageItemView,
    myParseDate,
} from '@app/shared';
import {  } from '../../messaging/publishers/usage-item-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toUsageItemView } from '../views.mapper';

@Injectable()
export class UsageItemsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: ,
    ) {}

    private readonly include = {
        usage_item_details: {
            select: {
                id: true,
                batch_id: true,
                take_quantity: true,
                used_quantity: true,
                updated_at: true,
                batches: {
                    select: {
                        item_id: true,
                        items: { select: { name: true, code: true } },
                    },
                },
            },
        },
    } satisfies Prisma.usage_item_listsSelect;
    // === Nội bộ ===
    findUsageItemById(id: number) {
        return this.prisma.usage_item_lists.findUnique({ 
            where: { id }, include: this.include,
        });
    }
    
    // === RPC ===
    async findById(id: number): Promise<UsageItemView> {
        const list = await this.findUsageItemById(id);
        if (!list) throw new NotFoundException('Usage item list not found');
        return toUsageItemView(list);
    }

    async findAll(q: FindUsageItemListQueryDto): Promise<Paginated<UsageItemView>> {
        const { page = 1, limit = 20 } = q;
        const where: Prisma.usage_item_listsWhereInput = {
            ...(q.userId && { creator_id: q.userId }),
            ...(q.taskId && { task_id: q.taskId }),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.usage_item_lists.count({ where }),
            this.prisma.usage_item_lists.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: this.include,
            }),
        ]);

        return {
            items: items.map(toUsageItemView),
            total, page, limit
        };
    }

    async create({ dto, actor }: CreateUsageItemListMsg): Promise<any> {
        phải có task id 
        mỗi technician chỉ được phép tạo 1 list cho 1 task 
        do có thể có nhiều tech làm cùng 1 task 
        
        khai báo list ban đầu thì chỉ cần item id và quantity 
        kho sẽ tính rồi batch theo ưu tiên thời gian nhập cũ nhất dựa theo dữ liệu hiện đang có trong db 
        
        lock từng item trong list lại
        trước tiên phải check xem trong kho - item.stock - còn bao nhiêu trước
        nếu không đủ thì báo không đủ quantity - không cho phép thực hiện thao tác
        chuyển sang item khác - đưa vào 1 list riêng để báo thiếu 
        nếu đủ thì trừ batch cũ cho đến khi bằng 0 hoặc đủ quantity yêu cầu
        nếu chưa đủ thì tiếp tục trừ batch cũ kế - lặp lại đến khi đủ
        đã check stock trước nên sẽ không có trường hợp thiếu
        vì đã lock item nên sẽ ngăn user khác chạm vào item đó trong suốt quá trình check và trừ batch
        không cần lock batch vì batch sẽ phải trừ lại stock của item 
        trừ lại stock của item 
        
        xong chuyển sang item tiếp theo trong list 
        và lặp lại quy trình trên cho đến khi hết list 
        (có thể cân nhắc lock toàn bộ item trong list trước rồi mới thực hiện các bước 
        thay vì lock từng item rồi thực hiện) -> hệ quả: không thể nhập thêm

        sau khi chạy hết list
        nếu trong list có từ 1 detail được tạo thành công thì mới được ghi list 
        trả về kết quả list 

        kèm theo list chứa item bị thiếu nếu
        tech có thể tạo require items request dựa vào list này để manager nhập thêm

        const result = await this.prisma.$transaction(async tx => {
            const existed = await tx.usage_item_lists.find({
                where: {
                    AND: [
                        { task_id: dto.taskId },
                        { creator_id: actor.employeeId },
                    ],
                    sửa db bằng cách thêm unique constraint cho 2 này 
                },
                select: { id: true },
            });
            if (existed) throw new ConflictException('You have already created an usage item list for this task');
            const listId = (await tx.usage_item_lists.create({
                data: {
                    creator_id: actor.employeeId,
                    task_id: dto.taskId,
                },
                select: { id: true },
            })).id;
            
            const items = sắp xếp danh sách item theo id 
            const shortageList: { id: number, stock: number }[] = [];
            const notInStockList: number[] = [];
            for (const item of items) {
                await tx.$queryRaw`
                    SELECT id FROM items
                    WHERE id = ${item.id}
                    FOR UPDATE
                `;

                const existed = await tx.items.findUnique({
                    where: { id: item.id }, select: {
                        id: true, stock: true,
                    },
                });
                if (!existed) {
                    notInStockList.push(item.id);
                    continue;
                }
                if (existed.stock < item.quantity) {
                    shortageList.push(existed);
                    continue;
                }

                let quantity = item.quantity;
                while (quantity > 0) {
                    const batch = (await tx.batches.findMany({
                        where: { 
                            item_id: item.id,
                            remain_quantity: { not: 0 },
                        },
                        take: 1,
                        orderBy: { import_date: 'asc' },
                        select: { id: true, remain_quantity: true },
                    }))[0];

                    const take = (quantity > batch.remain_quantity)?
                        batch.remain_quantity : quantity;
                    await tx.batches.update({
                        where: { id: batch.id },
                        data: { remain_quantity: { decrement: take }},
                    });
                    await tx.items.update({
                        where: { id: item.id },
                        data: { stock: { decrement: take }},
                    });
                    await tx.usage_item_details.create({
                        data: {
                            list_id: listId,
                            take_quantity: take,
                            batch_id: batch.id,
                        },
                    });
                    quantity -= take;
                }
            }

            const list = await tx.usage_item_lists.findUnique({
                where: { id: listId },
                include: {},
            });

            return {
                list,
                shortageList,
                notInStockList,
            };
        });
        const view = toUsageItemView(result.list);
        this.events.created(view, actor.sub);
        return {
            view,
            shortageList: result.shortageList,  
            notInStockList: result.notInStockList,
        };
    }
    async addDetail() {
        có thể khóa list để không cho thêm nữa sau khi hoàn thành task
        mỗi lần chỉnh sửa thì chỉ có thể thêm detail mới 
        các detail có thể trùng item id -> khi tính tổng chỉ cần hiển thị ra item là được 
        có thể xử lý việc trùng batch id hơi phức tạp 
    }
    async updateDetail() {
        có thể khóa list để không cho chỉnh sửa nữa sau khi hoàn thành task
        update detail thì nên update dựa theo item id thay vì detail id 
        và chỉ có thể update số lượng 
        nếu mà xóa thì nên dùng kiểu used = 0 rồi bỏ qua khỏi tính 
    }
}