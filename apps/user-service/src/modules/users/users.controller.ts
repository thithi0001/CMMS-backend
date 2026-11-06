import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { USER_CMD } from '@app/shared';
import type {
    CreateUserMsg, DeactivateUserMsg, 
    UpdateRoleMsg, UpdateUserMsg,
    FindUserByIdMsg,
    FindUserQueryDto,
} from '@app/shared';
import { UsersService } from "./users.service";

@Controller()
export class UsersController {
    constructor(private readonly users: UsersService) {}

    @MessagePattern(USER_CMD.CREATE)
    create(@Payload() msg: CreateUserMsg) {
        return this.users.create(msg);
    }

    @MessagePattern(USER_CMD.FIND_ALL)
    findAll(@Payload() query: FindUserQueryDto) {
        return this.users.findAll(query);
    }

    @MessagePattern(USER_CMD.FIND_BY_ID)
    findById(@Payload() msg: FindUserByIdMsg) {
        return this.users.findById(msg.id);
    }

    @MessagePattern(USER_CMD.UPDATE)
    update(@Payload() msg: UpdateUserMsg) {
        return this.users.update(msg);
    }

    @MessagePattern(USER_CMD.UPDATE_ROLE)
    updateRole(@Payload() msg: UpdateRoleMsg) {
        return this.users.updateRole(msg);
    }

    @MessagePattern(USER_CMD.DEACTIVATE)
    deactivate(@Payload() msg: DeactivateUserMsg) {
        return this.users.deactivate(msg);
    }

    @MessagePattern(USER_CMD.STATS)
    stats() {
        return this.users.stats();
    }
    
}