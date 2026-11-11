export const IntervalUnit = {
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month',
    YEAR: 'year',
} as const;
export type IntervalUnit = (typeof IntervalUnit)[keyof typeof IntervalUnit];

export const SourceType = {
    MANUFACTURER: 'manufacturer',
    SUPPLIER: 'supplier',
} as const;
export type SourceType = (typeof SourceType)[keyof typeof SourceType];

export const DeviceState = {
    AVAILABLE: 'available',
    IN_USE: 'in_use',
    BROKEN: 'broken',
    UNDER_MAINTENANCE: 'under_maintenance',
    AWAITING_PARTS: 'awaiting_parts',
    TESTING: 'testing',
    AWAITING_DISPOSED: 'awaiting_disposed',
    DISPOSED: 'disposed',
} as const;
export type DeviceState = (typeof DeviceState)[keyof typeof DeviceState];

export const RequestStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
} as const;
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export const HandoverType = {
    ASSIGN: 'assign',
    MAINTENANCE: 'maintenance',
    RETRIEVE: 'retrieve',
} as const;
export type HandoverType = (typeof HandoverType)[keyof typeof HandoverType];

