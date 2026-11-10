import type {
    TaskView
} from '@app/shared';
import type { tasks } from '../prisma/generated/client';
import { Task_stage, Task_tag } from '@app/shared/types/maintenance.enum';

export function toTaskView(task: tasks): TaskView {
    return {
        id: task.id,
        creatorId: task.creator_id,
        tag: task.tag as Task_tag,
        stage: task.stage as Task_stage,
        title: task.title,
        content: task.content || "",
        scheduledStartAt: task.scheduled_start_at?.toISOString(),
        scheduledEndAt: task.scheduled_end_at?.toISOString(),
        actualStartAt: task.actual_start_at?.toISOString(),
        actualEndAt: task.actual_end_at?.toISOString(),
        createdAt: task.created_at?.toISOString() || "Missing",
        updatedAt: task.updated_at?.toISOString() || "Missing",
    };
}