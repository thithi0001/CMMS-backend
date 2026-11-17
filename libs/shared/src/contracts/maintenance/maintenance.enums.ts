export const TaskTag = {
    MAINTENANCE: 'maintenance',
    REPAIR: 'repair',
    HANDOVER_DEVICE: 'handover_device',
    OTHER: 'other',
} as const;
export type TaskTag = (typeof TaskTag)[keyof typeof TaskTag];

export const TaskStage = {
    TODO: 'todo',
    IN_PROGRESS: 'in_progress',
    DONE: 'done',
    CANCELLED: 'cancelled',
    PASS: 'pass',
    FAIL: 'fail',
} as const;
export type TaskStage = (typeof TaskStage)[keyof typeof TaskStage];

export const Priority = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const AcceptanceStatus = {
    PENDING: 'pending',
    PASS: 'pass',
    FAIL: 'fail',
} as const;
export type AcceptanceStatus = (typeof AcceptanceStatus)[keyof typeof AcceptanceStatus];

export const ProposalStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
} as const;
export type ProposalStatus = (typeof ProposalStatus)[keyof typeof ProposalStatus];
