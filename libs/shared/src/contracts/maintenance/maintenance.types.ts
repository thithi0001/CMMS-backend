import { Priority, TaskStage, TaskTag, AcceptanceStatus, AssigneeStatus, ProposalStatus } from "./maintenance.enums";

export interface TaskView {
    id: number;
    creatorId: number; // <- user-service
    deviceId?: number;
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

export interface TaskProposalView {
    id: number;
    creatorId: number;
    taskId: number;
    content?: string | null;
    managerReview?: string | null;
    status: string;
    approvedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface DamageReportView {
    id: number;
    creatorId: number;
    taskId: number;
    deviceId: number;
    confirmerId?: number;
    content?: string | null;
    status: ProposalStatus;
    confirmedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface DisposeProposalView {
    id: number;
    creatorId: number;
    taskId: number;
    deviceId: number;
    content?: string | null;
    status: string;
    approvedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AcceptanceView {
    id: number;
    creatorId: number;
    taskId: number;
    content?: string;
    managerReview?: string;
    status: AcceptanceStatus;
    approvedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AssigneeView {
    id: number;
    assigneeId: number;
    taskId: number;
    status: AssigneeStatus;
    deadline?: string;
    confirmedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}
