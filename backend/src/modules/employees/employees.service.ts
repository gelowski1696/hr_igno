import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: this.toCreateData(dto),
      include: { store: true },
    });
  }

  findAll() {
    return this.prisma.employee.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: { store: true },
    });
  }

  async findOne(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { store: true, images: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async update(id: number, dto: UpdateEmployeeDto) {
    await this.findOne(id);
    return this.prisma.employee.update({
      where: { id },
      data: this.toUpdateData(dto),
      include: { store: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.employee.delete({ where: { id } });
    return { success: true };
  }

  private toCreateData(dto: CreateEmployeeDto): Prisma.EmployeeUncheckedCreateInput {
    return {
      employeeCode: dto.employeeCode,
      firstName: dto.firstName,
      middleName: dto.middleName,
      lastName: dto.lastName,
      storeId: dto.storeId,
      birthdate: dto.birthdate ? new Date(dto.birthdate) : undefined,
      age: dto.age,
      gender: dto.gender,
      religion: dto.religion,
      address: dto.address,
      phone: dto.phone,
      email: dto.email,
      sssId: dto.sssId,
      sssContribution: dto.sssContribution,
      philhealthId: dto.philhealthId,
      philhealthContribution: dto.philhealthContribution,
      pagibigId: dto.pagibigId,
      pagibigContribution: dto.pagibigContribution,
      hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      position: dto.position,
      salary: dto.salary,
      funds: dto.funds,
      emergencyContactName: dto.emergencyContactName,
      emergencyContactNumber: dto.emergencyContactNumber,
      status: dto.status,
      hasAssets: dto.hasAssets,
      assetRemarks: dto.assetRemarks,
    };
  }

  private toUpdateData(dto: UpdateEmployeeDto): Prisma.EmployeeUncheckedUpdateInput {
    const data: Prisma.EmployeeUncheckedUpdateInput = {};

    if (dto.employeeCode !== undefined) data.employeeCode = dto.employeeCode;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.middleName !== undefined) data.middleName = dto.middleName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.storeId !== undefined) data.storeId = dto.storeId;
    if (dto.birthdate !== undefined) data.birthdate = new Date(dto.birthdate);
    if (dto.age !== undefined) data.age = dto.age;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.religion !== undefined) data.religion = dto.religion;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.sssId !== undefined) data.sssId = dto.sssId;
    if (dto.sssContribution !== undefined) data.sssContribution = dto.sssContribution;
    if (dto.philhealthId !== undefined) data.philhealthId = dto.philhealthId;
    if (dto.philhealthContribution !== undefined) data.philhealthContribution = dto.philhealthContribution;
    if (dto.pagibigId !== undefined) data.pagibigId = dto.pagibigId;
    if (dto.pagibigContribution !== undefined) data.pagibigContribution = dto.pagibigContribution;
    if (dto.hireDate !== undefined) data.hireDate = new Date(dto.hireDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.salary !== undefined) data.salary = dto.salary;
    if (dto.funds !== undefined) data.funds = dto.funds;
    if (dto.emergencyContactName !== undefined) data.emergencyContactName = dto.emergencyContactName;
    if (dto.emergencyContactNumber !== undefined) data.emergencyContactNumber = dto.emergencyContactNumber;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.hasAssets !== undefined) data.hasAssets = dto.hasAssets;
    if (dto.assetRemarks !== undefined) data.assetRemarks = dto.assetRemarks;

    return data;
  }
}
