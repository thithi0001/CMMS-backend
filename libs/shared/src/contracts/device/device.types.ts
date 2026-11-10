import { Interval_Unit } from "@app/shared/types/device.enum";

export interface CategoryView {
    id: number;
    name: string;
    code: string;
    description: string;
    intervalValue?: number;
    intervalUnit?: Interval_Unit;
    depreciationPeriodMinMonths: number;
    depreciationPeriodMaxMonths: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DeviceView {

}
