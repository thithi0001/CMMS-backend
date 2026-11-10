export const Task_tag = {
    MAINTENANCE: 'maintenance',
    REPAIR: 'repair',
    HANDOVER_DEVICE: 'handover_device',
    OTHER: 'other',
} as const;
export type Task_tag = (typeof Task_tag)[keyof typeof Task_tag];

export const Task_stage = {
    TODO: 'todo',
    INPROGRESS: 'inprogress',
    DONE: 'done',
    CANCELLED: 'cancelled',
    PASS: 'pass',
    FAIL: 'fail',
} as const;
export type Task_stage = (typeof Task_stage)[keyof typeof Task_stage];

export const Priority = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGN: 'hign',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const Assignee_status = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
} as const;
export type Assignee_status = (typeof Assignee_status)[keyof typeof Assignee_status];

export const Acceptance_status = {
    PENDING: 'pending',
    PASS: 'pass',
    FAIL: 'fail',
} as const;
export type Acceptance_status = (typeof Acceptance_status)[keyof typeof Acceptance_status];

export const Proposal_status = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
} as const;
export type Proposal_status = (typeof Proposal_status)[keyof typeof Proposal_status];
