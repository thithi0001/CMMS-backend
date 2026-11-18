import { DeviceState } from "@app/shared";

export function isAllowedToChangeState(currentState: DeviceState, newState: DeviceState): boolean {
    let included: DeviceState[] = [];
    switch (currentState) {
        case DeviceState.AVAILABLE:
            included = [DeviceState.IN_USE, DeviceState.BROKEN, DeviceState.UNDER_MAINTENANCE, DeviceState.AWAITING_DISPOSED, DeviceState.DISPOSED];
            break;
        case DeviceState.IN_USE:
            included = [DeviceState.AVAILABLE, DeviceState.BROKEN, DeviceState.UNDER_MAINTENANCE];
            break;
        case DeviceState.BROKEN:
            included = [DeviceState.UNDER_MAINTENANCE];
            break;
        case DeviceState.UNDER_MAINTENANCE:
            included = [DeviceState.AWAITING_PARTS, DeviceState.TESTING, DeviceState.AWAITING_DISPOSED, DeviceState.DISPOSED];
            break;
        case DeviceState.AWAITING_PARTS:
            included = [DeviceState.UNDER_MAINTENANCE, DeviceState.AWAITING_PARTS, DeviceState.DISPOSED];
            break;
        case DeviceState.TESTING:
            included = [DeviceState.AVAILABLE, DeviceState.IN_USE, DeviceState.BROKEN, DeviceState.AWAITING_DISPOSED, DeviceState.DISPOSED];
            break;
        case DeviceState.AWAITING_DISPOSED:
            included = [DeviceState.DISPOSED];
            break;
        case DeviceState.DISPOSED:
            included = [];
            break;
    }
    // nếu new state nằm trong mảng cho phép thì true
    return included.includes(newState);
}