import type {
    TaskView, TaskStage, TaskTag,
    TicketView,
    Priority,
    AcceptanceView,
    AcceptanceStatus
} from '@app/shared';
import type { 
    tasks, tickets, 
    acceptance_reports, assignees, task_proposals, dispose_proposals, damage_reports, 
} from '../prisma/generated/client';

type
export function toTaskView(task: tasks): TaskView {
    return {
        id: task.id,
        creatorId: task.creator_id,
        tag: task.tag as TaskTag,
        stage: task.stage as TaskStage,
        title: task.title,
        content: task.content || "",
        scheduledStartAt: task.scheduled_start_at?.toISOString(),
        scheduledEndAt: task.scheduled_end_at?.toISOString(),
        actualStartAt: task.actual_start_at?.toISOString(),
        actualEndAt: task.actual_end_at?.toISOString(),
        createdAt: task.created_at?.toISOString(),
        updatedAt: task.updated_at?.toISOString(),
    };
}

export function toTicketView(ticket: tickets): TicketView {
    return {
        id: ticket.id,
        creatorId: ticket.creator_id,
        deviceId: ticket.device_id,
        confirmerId: ticket.confirmer_id || undefined,
        isConfirmed: ticket.is_confirmed,
        priority: ticket.priority as Priority,
        description: ticket.description,
        imgUrl: ticket.img_url,
        createdAt: ticket.created_at?.toISOString(),
        updatedAt: ticket.updated_at?.toISOString(),
    };
}

export function toAcceptanceView(acceptance: acceptance_reports): AcceptanceView {
    return {
        id: acceptance.id,
        creatorId: acceptance.creator_id,
        taskId: acceptance.task_id,
        content: acceptance.content || "",
        managerReview: acceptance.manager_review || "",
        status: acceptance.status as AcceptanceStatus,
        approvedAt: acceptance.approved_at?.toISOString(),
        createdAt: acceptance.created_at?.toISOString(),
        updatedAt: acceptance.updated_at?.toISOString(),
    };
}





