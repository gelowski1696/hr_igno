-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmployeeStatus" ADD VALUE 'AWOL';
ALTER TYPE "EmployeeStatus" ADD VALUE 'BLACKLISTED';
ALTER TYPE "EmployeeStatus" ADD VALUE 'FLOATING';
ALTER TYPE "EmployeeStatus" ADD VALUE 'LEAVE';
ALTER TYPE "EmployeeStatus" ADD VALUE 'NOSCHEDULE';
ALTER TYPE "EmployeeStatus" ADD VALUE 'RESIGNED';
ALTER TYPE "EmployeeStatus" ADD VALUE 'TERMINATE';
