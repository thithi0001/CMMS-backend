import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { DAMAGE_REPORT_CMD } from "@app/shared";
import type {
    CreateDamageReportMsg,
    DeleteDamageReportMsg,
    FindDamageReportMsg,
    UpdateDamageReportMsg,
} from "@app/shared";
import { DamageReportsService } from "./damage-reports.service";

@Controller()
export class DamageReportsController {
    constructor(private readonly damageReports: DamageReportsService) {}

    @MessagePattern(DAMAGE_REPORT_CMD.CREATE)
    create(@Payload() msg: CreateDamageReportMsg) {
        return this.damageReports.create(msg);
    }

    @MessagePattern(DAMAGE_REPORT_CMD.UPDATE)
    update(@Payload() msg: UpdateDamageReportMsg) {
        return this.damageReports.update(msg);
    }

    @MessagePattern(DAMAGE_REPORT_CMD.DELETE)
    delete(@Payload() msg: DeleteDamageReportMsg) {
        return this.damageReports.delete(msg);
    }

    @MessagePattern(DAMAGE_REPORT_CMD.FIND_ALL)
    findAll(@Payload() msg: FindDamageReportMsg) {
        return this.damageReports.findAll(msg);
    }

    @MessagePattern(DAMAGE_REPORT_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.damageReports.findById(id);
    }
}
