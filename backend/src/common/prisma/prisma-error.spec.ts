import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { translatePrismaError } from './prisma-error';

describe('translatePrismaError', () => {
  it('turns unique constraint errors into conflict exceptions', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique failed', {
      code: 'P2002',
      clientVersion: 'test',
    });

    expect(() => translatePrismaError(error)).toThrow(ConflictException);
  });

  it('turns missing record errors into not found exceptions', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Missing record', {
      code: 'P2025',
      clientVersion: 'test',
    });

    expect(() => translatePrismaError(error)).toThrow(NotFoundException);
  });
});

