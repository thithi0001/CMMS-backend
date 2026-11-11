import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { SOURCE_CMD } from '@app/shared';
import type { 
    CreateSourceMsg,
    UpdateSourceMsg,
    FindSourceQueryDto,
} from '@app/shared';
import { SourcesService } from "./sources.service";

@Controller()
export class SourcesController {
    constructor(private readonly sources: SourcesService) {}

    @MessagePattern(SOURCE_CMD.CREATE)
    create(@Payload() msg: CreateSourceMsg) {
        return this.sources.create(msg);
    }

    @MessagePattern(SOURCE_CMD.UPDATE)
    update(@Payload() msg: UpdateSourceMsg) {
        return this.sources.udpate(msg);
    }
    
    @MessagePattern(SOURCE_CMD.FIND_ALL)
    findAll(@Payload() query: FindSourceQueryDto) {
        return this.sources.findAll(query);
    }
    
    @MessagePattern(SOURCE_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.sources.findById(id);
    }
    
}
