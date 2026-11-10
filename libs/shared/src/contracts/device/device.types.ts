import { Interval_Unit } from "@app/shared/types/device-enums";

export interface CategoryView {
    id: number;
    name: string;
    code: string;
    description: string;
    intervalValue?: string;
    intervalUnit?: Interval_Unit;
    depreciationPeriodMinMonths: string;
    depreciationPeriodMaxMonths: string;
    isActive: string;
    createdAt: string;
    updatedAt: string;
}

export interface DeviceView {

}
