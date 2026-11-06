import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { DEPARTMENT_CMD } from "@app/shared/contracts/user/user.patterns";
import type {
    CreateDepartmentMsg,
    FindDepartmentQueryDto
} from '@app/shared'
import { DepartmentsService } from "./departments.service";

@Controller()
export class DepartmentsController {
    constructor(private readonly departments: DepartmentsService) {}

    @MessagePattern(DEPARTMENT_CMD.CREATE)
    create(@Payload() msg: CreateDepartmentMsg) {
        return this.departments.create(msg);
    }

    @MessagePattern(DEPARTMENT_CMD.FIND_ALL)
    findAll(@Payload() query: FindDepartmentQueryDto) {
        return this.departments.findAll(query);
    }
}