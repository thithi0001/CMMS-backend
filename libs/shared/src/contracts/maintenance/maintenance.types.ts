import { Priority, TaskStage, TaskTag } from "@app/shared";

export interface TaskView {
    id: number;
    creatorId: number; // <- user-service
    tag: TaskTag;
    stage: TaskStage;
    title: string;
    content: string;
    scheduledStartAt?: string;
    scheduledEndAt?: string;
    actualStartAt?: string;
    actualEndAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface TaskDetailView {
    // phiếu báo lỗi
    // thông tin thiết bị <- device-service
    // danh sách phân công <- user-service
    // đề nghị điều chỉnh kế hoạch
    // phiếu xác nhận hư hỏng
    // phiếu bàn giao trước và sau kế hoạch <- device-service -> sửa db
    // danh sách vật tư = yêu cầu, đã lấy + đã dùng <- inventory-service
    // đề nghị thanh lý
    // biên bản nghiệm thu
}

export interface TicketView {
    id: number;
    creatorId: number;
    deviceId: number;
    confirmerId?: number;
    isConfirmed: boolean;
    priority: Priority;
    description?: string | null;
    imgUrl?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface TaskDeviceView {
    
}

export interface TaskProposalView {
    
}

export interface DamageReportView {
    
}

export interface DeviceHandoverView {
    
}

export interface InventoryView {
    
}

export interface DisposeProposalView {
    
}

export interface AcceptanceView {
    
}

export interface AssigneeView {
    
}
