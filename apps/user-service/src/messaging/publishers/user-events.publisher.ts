import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, USER_EVT, UserEventPayload,
    UserLoggedInPayload, UserLoginFailedPayload, UserPasswordChangedPayload, UserRoleChangedPayload,
    UserUpdatedPayload, UserView, Role,
} from '@app/shared';

@Injectable()
export class UserEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(UserEventsPublisher.name);

    constructor(
        @Inject(BUS_CLIENT) 
        private readonly bus: ClientProxy
    ) {}

    async onApplicationBootstrap() {
        await this.bus.connect();
    }
    
    private publish<T>(type: string, data: T, actorId?: number) {
        const event = buildEvent({ 
            type, source: SERVICES.USER, data, actorId 
        });
        
        this.bus.emit(type, event).subscribe({
            error: (err) => this.logger.error(`Fail to publish ${type}: ${err?.message ?? err}`),
        });
    }

    created(u: UserView, actorId: number) {
        this.publish<UserEventPayload>(USER_EVT.CREATED, {
            userId: u.id,
            username: u.username,
            roleId: u.role.id
        }, actorId);
    }

    loggedIn(u: UserView) {
        this.publish<UserLoggedInPayload>(USER_EVT.LOGGED_IN, {
            userId: u.id,
            username: u.username
        }, u.id);
    }

    loginFailed(payload: UserLoginFailedPayload) {
        this.publish(USER_EVT.LOGIN_FAILED, payload);
    }

    updated(u: UserView, changedFields: string[], actorId: number) {
        this.publish<UserUpdatedPayload>(USER_EVT.UPDATED, {
            userId: u.id, 
            username: u.username,
            changedFields
        }, actorId);
    }

    roleChanged(u: UserView, oldRole: string, newRole: string, actorId: number) {
        this.publish<UserRoleChangedPayload>(USER_EVT.ROLE_CHANGED, {
            userId: u.id,
            username: u.username, 
            oldRole, newRole
        }, actorId);
    }

    passwordChanged(u: UserView) {
        this.publish<UserPasswordChangedPayload>(USER_EVT.PASSWORD_CHANGED, {
            userId: u.id,
            username: u.username
        }, u.id);
    }

    deactivated(u: UserView, actorId: number) {
        this.publish<UserEventPayload>(USER_EVT.DEACTIVATED, {
            userId: u.id,
            username: u.username,
            roleId: u.role.id,
        }, actorId);
    }
}