export const Interval_Unit = {
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month',
    YEAR: 'year',
} as const;
export type Interval_Unit = (typeof Interval_Unit)[keyof typeof Interval_Unit];

export const Source_type = {
    MANUFACTURER: 'manufacturer',
    SUPPLIER: 'supplier',
} as const;
export type Source_type = (typeof Source_type)[keyof typeof Source_type];

export const Device_stage = {
    AVAILABLE: 'available',
    IN_USE: 'in_use',
    BROKEN: 'broken',
    UNDER_MAINTENANCE: 'under_maintenance',
    AWAITING_PARTS: 'awaiting_parts',
    TESTING: 'testing',
    AWAITING_DISPOSED: 'awaiting_disposed',
    DISPOSED: 'disposed',
} as const;
export type Device_stage = (typeof Device_stage)[keyof typeof Device_stage];

export const Request_status = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
} as const;
export type Request_status = (typeof Request_status)[keyof typeof Request_status];

export const Handover_type = {
    ASSIGN: 'assign',
    MAINTENANCE: 'maintenance',
    RETRIEVE: 'retrieve',
} as const;
export type Handover_type = (typeof Handover_type)[keyof typeof Handover_type];

