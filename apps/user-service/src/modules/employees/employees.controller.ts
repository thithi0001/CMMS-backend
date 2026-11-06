import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { EMPLOYEE_CMD } from "@app/shared/contracts/user/user.patterns";
import type {
    CreateEmployeeMsg,
    EndEmployeeMsg,
    FindEmployeeQueryDto
} from '@app/shared'
import { EmployeesService } from "./employees.service";

@Controller()
export class EmployeesController {
    constructor(private readonly employees: EmployeesService) {}
    
    @MessagePattern(EMPLOYEE_CMD.CREATE)
    create(@Payload() msg: CreateEmployeeMsg) {
        return this.employees.create(msg);
    }

    @MessagePattern(EMPLOYEE_CMD.END)
    end(@Payload() msg: EndEmployeeMsg) {
        return this.employees.end(msg);
    }

    @MessagePattern(EMPLOYEE_CMD.FIND_ALL)
    findAll(@Payload() query: FindEmployeeQueryDto) {
        return this.employees.findAll(query);
    }

    @MessagePattern(EMPLOYEE_CMD.GET_HISTORY)
    getHistory(@Payload() query: FindEmployeeQueryDto) {
        return this.employees.getHistory(query);
    }

    @MessagePattern(EMPLOYEE_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.employees.findById(id);
    }

    @MessagePattern(EMPLOYEE_CMD.FIND_BY_USER_ID)
    findByUserId(@Payload() userId: number) {
        return this.employees.findByUserId(userId);
    }
}