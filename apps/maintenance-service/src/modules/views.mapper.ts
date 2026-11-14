import type {
    TaskView, TaskStage, TaskTag,
    TicketView,
    Priority,
    AcceptanceView,
    AcceptanceStatus,
    AssigneeView,
    AssigneeStatus,
    DamageReportView,
    ProposalStatus,
    DisposeProposalView,
    TaskProposalView
} from '@app/shared';
import type { 
    Prisma,
    tickets, damage_reports, 
    acceptance_reports, assignees, 
    task_proposals, dispose_proposals, 
} from '../prisma/generated/client';

type TaskWithDevice = Prisma.tasksGetPayload<{
    include: { task_device: { select: { device_id: true }}};
}>;
export function toTaskView(task: TaskWithDevice): TaskView {
    return {
        id: task.id,
        creatorId: task.creator_id,
        deviceId: task.task_device?.device_id,
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

export function toAssigneeView(assignee: assignees): AssigneeView {
    return {
        id: assignee.id,
        assigneeId: assignee.assignee_id,
        taskId: assignee.task_id,
        status: assignee.status as AssigneeStatus,
        deadline: assignee.confirmation_deadline?.toISOString(),
        confirmedAt: assignee.confirmed_at?.toISOString(),
        createdAt: assignee.created_at?.toISOString(),
        updatedAt: assignee.updated_at?.toISOString(),
    };
}

export function toDamageReportView(d: damage_reports): DamageReportView {
    return {
        id: d.id,
        creatorId: d.creator_id,
        taskId: d.task_id,
        deviceId: d.device_id,
        confirmerId: d.confirmer_id || undefined,
        content: d.content,
        status: d.status as ProposalStatus,
        confirmedAt: d.confirmed_at?.toISOString(),
        createdAt: d.created_at?.toISOString(),
        updatedAt: d.updated_at?.toISOString(),
    };
}

export function toDisposeProposalView(d: dispose_proposals): DisposeProposalView {
    return {
        id: d.id,
        creatorId: d.creator_id,
        taskId: d.task_id,
        deviceId: d.device_id,
        content: d.content,
        status: d.status as ProposalStatus,
        approvedAt: d.approved_at?.toISOString(),
        createdAt: d.created_at?.toISOString(),
        updatedAt: d.updated_at?.toISOString(),
    };
}

export function toTaskProposalView(d: task_proposals): TaskProposalView {
    return {
        id: d.id,
        creatorId: d.creator_id,
        taskId: d.task_id,
        content: d.content,
        managerReview: d.manager_review,
        status: d.status as ProposalStatus,
        approvedAt: d.approved_at?.toISOString(),
        createdAt: d.created_at?.toISOString(),
        updatedAt: d.updated_at?.toISOString(),
    };
}


