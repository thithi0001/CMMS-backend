import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { EXPERTISE_CMD } from "@app/shared/contracts/user/user.patterns";
import type { 
    CreateExpertiseMsg, 
    AssignExpertiseMsg,
    RevokeExpertiseMsg,
    FindExpertiseQueryDto,
} from '@app/shared';
import { ExpertisesService } from "./expertises.service";

@Controller()
export class ExpertisesController {
    constructor(private readonly expertises: ExpertisesService) {}

    @MessagePattern(EXPERTISE_CMD.CREATE)
    create(@Payload() msg: CreateExpertiseMsg) {
        return this.expertises.create(msg);
    }

    @MessagePattern(EXPERTISE_CMD.ASSIGN)
    assign(@Payload() msg: AssignExpertiseMsg) {
        return this.expertises.assign(msg);
    }

    @MessagePattern(EXPERTISE_CMD.REVOKE)
    revoke(@Payload() msg: RevokeExpertiseMsg) {
        return this.expertises.revoke(msg);
    }
    
    @MessagePattern(EXPERTISE_CMD.FIND_ALL)
    findAll(@Payload() query: FindExpertiseQueryDto) {
        return this.expertises.findAll(query);
    }

    @MessagePattern(EXPERTISE_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.expertises.findById(id);
    }

    @MessagePattern(EXPERTISE_CMD.FIND_BY_USER_ID)
    findByUserId(@Payload() query: FindExpertiseQueryDto) {
        return this.expertises.findByUserId(query);
    }
}