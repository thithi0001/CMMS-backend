import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { TASK_CMD } from '@app/shared';
import type { 
    CreateTaskMsg, UpdateTaskMsg, DeleteTaskMsg,
    ChangeTaskStageMsg,
    CancelTaskMsg, TaskActionMsg,
    FindTaskMsg,
} from '@app/shared';
import { TasksService } from "./tasks.service";

@Controller()
export class TasksController {
    constructor(private readonly tasks: TasksService) {}

    @MessagePattern(TASK_CMD.CREATE)
    create(@Payload() msg: CreateTaskMsg) {
        return this.tasks.create(msg);
    }

    @MessagePattern(TASK_CMD.UPDATE)
    udpate(@Payload() msg: UpdateTaskMsg) {
        return this.tasks.update(msg);
    }

    @MessagePattern(TASK_CMD.DELETE)
    delete(@Payload() msg: DeleteTaskMsg) {
        return this.tasks.delete(msg);
    }

    @MessagePattern(TASK_CMD.FIND_ALL)
    findAll(@Payload() msg: FindTaskMsg) {
        return this.tasks.findAll(msg);
    }

    @MessagePattern(TASK_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.tasks.findById(id);
    }

    @MessagePattern(TASK_CMD.START)
    start(@Payload() msg: TaskActionMsg) {
        return this.tasks.start(msg);
    }

    @MessagePattern(TASK_CMD.END)
    end(@Payload() msg: TaskActionMsg) {
        return this.tasks.end(msg);
    }

    @MessagePattern(TASK_CMD.CANCEL)
    cancel(@Payload() msg: CancelTaskMsg) {
        return this.tasks.cancel(msg);
    }

    @MessagePattern(TASK_CMD.REOPEN)
    reopen(@Payload() msg: CancelTaskMsg) {
        return this.tasks.reopen(msg);
    }

    @MessagePattern(TASK_CMD.EVALUATE)
    evaluate(@Payload() msg: ChangeTaskStageMsg) {
        return this.tasks.evaluate(msg);
    }

    @MessagePattern(TASK_CMD.STATS)
    stats() {
        return this.tasks.stats();
    }

}