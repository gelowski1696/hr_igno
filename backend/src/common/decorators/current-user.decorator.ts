import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentUserPayload = {
  id: number;
  username: string;
  role: string;
  employeeId: number | null;
  storeId: number | null;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserPayload | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
    return request.user;
  },
);

