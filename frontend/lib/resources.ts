import type { ResourceConfig } from "./types";

export const employeeResource: ResourceConfig = {
  title: "Employee Lists",
  eyebrow: "People Operations",
  description: "Maintain employment, store assignment, contact, status, and compensation records.",
  endpoint: "employees",
  searchPlaceholder: "Search employee ID, name, address, phone, position, status",
  createLabel: "Add employee",
  formPanelClassName: "max-w-[760px]",
  columns: [
    { key: "employeeCode", header: "Employee ID" },
    { key: "firstName", header: "First Name" },
    { key: "middleName", header: "Middle Name", hideOnMobile: true },
    { key: "lastName", header: "Last Name" },
    { key: "store.area", header: "Assign Store", hideOnMobile: true },
    { key: "birthdate", header: "Birth Date", type: "date", hideOnMobile: true },
    { key: "age", header: "Age", type: "number", hideOnMobile: true },
    { key: "gender", header: "Gender", hideOnMobile: true },
    { key: "religion", header: "Religion", hideOnMobile: true },
    { key: "address", header: "Address" },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email", hideOnMobile: true },
    { key: "hireDate", header: "Hire Date", type: "date", hideOnMobile: true },
    { key: "endDate", header: "End Date", type: "date", hideOnMobile: true },
    { key: "position", header: "Position" },
    { key: "salary", header: "Salary", type: "currency" },
    { key: "emergencyContactName", header: "Contact Person", hideOnMobile: true },
    { key: "emergencyContactNumber", header: "Contact Number", hideOnMobile: true },
    { key: "status", header: "Status", type: "status" },
    { key: "hasAssets", header: "Assets", hideOnMobile: true },
    { key: "assetRemarks", header: "Assets Remarks", hideOnMobile: true }
  ],
  formFields: [
    { name: "employeeCode", label: "Employee Code", type: "text", required: true },
    { name: "storeId", label: "Assign Store", type: "select", required: true, coerceNumber: true },
    { name: "firstName", label: "First Name", type: "text", required: true },
    { name: "middleName", label: "Middle Name", type: "text" },
    { name: "lastName", label: "Last Name", type: "text", required: true },
    { name: "birthdate", label: "Birth Date", type: "date", required: true },
    {
      name: "gender",
      label: "Gender",
      type: "select",
      options: [
        { label: "Male", value: "Male" },
        { label: "Female", value: "Female" },
        { label: "Other", value: "Other" }
      ]
    },
    { name: "religion", label: "Religion", type: "text" },
    { name: "address", label: "Address", type: "text", required: true },
    { name: "age", label: "Age", type: "number", required: true },
    { name: "phone", label: "Phone", type: "text", required: true },
    { name: "email", label: "Email", type: "text" },
    { name: "sssId", label: "SSS ID", type: "text" },
    { name: "sssContribution", label: "SSS Contribution", type: "number" },
    { name: "philhealthId", label: "PhilHealth ID", type: "text" },
    { name: "philhealthContribution", label: "PhilHealth Contribution", type: "number" },
    { name: "pagibigId", label: "Pag-IBIG ID", type: "text" },
    { name: "pagibigContribution", label: "Pag-IBIG Contribution", type: "number" },
    {
      name: "position",
      label: "Position",
      type: "select",
      options: [
        { label: "Accounting Staff", value: "Accounting Staff" },
        { label: "Asset Manager", value: "Asset Manager" },
        { label: "Cashier", value: "Cashier" },
        { label: "CCTV Operator", value: "CCTV Operator" },
        { label: "Checker", value: "Checker" },
        { label: "Driver", value: "Driver" },
        { label: "Extra Rider", value: "Extra Rider" },
        { label: "Field Auditor", value: "Field Auditor" },
        { label: "Field Officer", value: "Field Officer" },
        { label: "Gate Keeper", value: "Gate Keeper" },
        { label: "Helper", value: "Helper" },
        { label: "HR Staff", value: "HR Staff" },
        { label: "L.A (Laundry)", value: "L.A (Laundry)" },
        { label: "Labor", value: "Labor" },
        { label: "Liaison", value: "Liaison" },
        { label: "Manager", value: "Manager" },
        { label: "Marketer", value: "Marketer" },
        { label: "Messenger", value: "Messenger" },
        { label: "Operation OIC", value: "Operation OIC" },
        { label: "Operation Officer", value: "Operation Officer" },
        { label: "Pump Attendant", value: "Pump Attendant" },
        { label: "Purchaser", value: "Purchaser" },
        { label: "Realty", value: "Realty" },
        { label: "Receiver", value: "Receiver" },
        { label: "Refiller", value: "Refiller" },
        { label: "Rider", value: "Rider" },
        { label: "Room Attendant", value: "Room Attendant" },
        { label: "S.L (Shift Leader)", value: "S.L (Shift Leader)" },
        { label: "Sales Manager", value: "Sales Manager" },
        { label: "Store Keeper", value: "Store Keeper" },
        { label: "Store Keeper Reliever", value: "Store Keeper Reliever" },
        { label: "Tagahakot", value: "Tagahakot" },
        { label: "W.S (Water Station)", value: "W.S (Water Station)" }
      ]
    },
    { name: "salary", label: "Salary", type: "number", required: true },
    { name: "hireDate", label: "Hire Date", type: "date" },
    { name: "endDate", label: "End Date", type: "date" },
    { name: "emergencyContactName", label: "Emergency Contact Name", type: "text" },
    { name: "emergencyContactNumber", label: "Emergency Contact Number", type: "text" },
    {
      name: "hasAssets",
      label: "Assets",
      type: "select",
      options: [
        { label: "Yes", value: "true" },
        { label: "No", value: "false" }
      ]
    },
    { name: "assetRemarks", label: "Assets Remarks", type: "text" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "ACTIVE" },
        { label: "Awol", value: "AWOL" },
        { label: "Blacklisted", value: "BLACKLISTED" },
        { label: "Floating", value: "FLOATING" },
        { label: "Leave", value: "LEAVE" },
        { label: "No Schedule", value: "NOSCHEDULE" },
        { label: "Resigned", value: "RESIGNED" },
        { label: "Terminate", value: "TERMINATE" },
        { label: "Inactive", value: "INACTIVE" },
        { label: "Ended", value: "ENDED" }
      ]
    }
  ]
};

export const attendanceResource: ResourceConfig = {
  title: "Time Log",
  eyebrow: "Attendance",
  description: "Review time-in, time-out, source, location, and manual edit reasons.",
  endpoint: "attendance",
  searchPlaceholder: "Search employee, source, location",
  createLabel: "Manual entry",
  columns: [
    { key: "employee.employeeCode", header: "Code" },
    { key: "employee.lastName", header: "Employee" },
    { key: "timeIn", header: "Time in", type: "datetime" },
    { key: "timeOut", header: "Time out", type: "datetime" },
    { key: "source", header: "Source", type: "status", hideOnMobile: true },
    { key: "manualReason", header: "Reason", hideOnMobile: true }
  ],
  formFields: [
    { name: "employeeId", label: "Employee ID", type: "number", required: true },
    { name: "timeIn", label: "Time in", type: "text", placeholder: "2026-05-08T08:00:00.000Z" },
    { name: "timeOut", label: "Time out", type: "text", placeholder: "2026-05-08T17:00:00.000Z" },
    { name: "locationIn", label: "Location in", type: "text" },
    { name: "locationOut", label: "Location out", type: "text" },
    {
      name: "source",
      label: "Source",
      type: "select",
      options: [
        { label: "Admin manual", value: "ADMIN_MANUAL" },
        { label: "Remote clock", value: "REMOTE_CLOCK" },
        { label: "Import", value: "IMPORT" }
      ]
    },
    { name: "manualReason", label: "Manual reason", type: "textarea" }
  ]
};

export const scheduleResource: ResourceConfig = {
  title: "Schedules",
  eyebrow: "Attendance",
  description: "Manage work schedule rules used by attendance and payroll.",
  endpoint: "schedules",
  searchPlaceholder: "Search shift name, work day, recurrence",
  createLabel: "New schedule",
  columns: [
    { key: "shiftName", header: "Shift Name" },
    { key: "workDay", header: "Work Day" },
    { key: "startTime", header: "Start Time", type: "datetime" },
    { key: "endTime", header: "End Time", type: "datetime" },
    { key: "duration", header: "Hours", type: "number", hideOnMobile: true },
    { key: "recurrenceType", header: "Recurrence", type: "status" },
    { key: "status", header: "Status", type: "status", hideOnMobile: true }
  ],
  formFields: [
    { name: "shiftName", label: "Shift Name", type: "text", required: true },
    {
      name: "workDay",
      label: "Work Day",
      type: "select",
      required: true,
      options: [
        { label: "Monday", value: "Monday" },
        { label: "Tuesday", value: "Tuesday" },
        { label: "Wednesday", value: "Wednesday" },
        { label: "Thursday", value: "Thursday" },
        { label: "Friday", value: "Friday" },
        { label: "Saturday", value: "Saturday" },
        { label: "Sunday", value: "Sunday" }
      ]
    },
    { name: "startTime", label: "Start Time", type: "datetime-local", required: true },
    { name: "endTime", label: "End Time", type: "datetime-local", required: true },
    { name: "duration", label: "Duration (Hours)", type: "number" },
    {
      name: "recurrenceType",
      label: "Recurrence",
      type: "select",
      options: [
        { label: "None", value: "NONE" },
        { label: "Daily", value: "DAILY" },
        { label: "Weekly", value: "WEEKLY" },
        { label: "Monthly", value: "MONTHLY" }
      ]
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "ACTIVE" },
        { label: "Inactive", value: "INACTIVE" }
      ]
    }
  ]
};

export const scheduleTemplateResource: ResourceConfig = {
  title: "Schedule Templates",
  eyebrow: "Attendance",
  description: "Create reusable shift templates for repeating work schedules.",
  endpoint: "schedule-templates",
  searchPlaceholder: "Search template name, description, assigned employees",
  createLabel: "New template",
  columns: [
    { key: "name", header: "Template Name" },
    { key: "description", header: "Description", hideOnMobile: true },
    { key: "assignedEmployeeCount", header: "Employees Assigned", type: "number" },
    { key: "startTime", header: "Start Time", type: "time" },
    { key: "endTime", header: "End Time", type: "time" },
    { key: "duration", header: "Duration", type: "number", hideOnMobile: true },
    { key: "breakStart", header: "Break Start", type: "time", hideOnMobile: true },
    { key: "breakEnd", header: "Break End", type: "time", hideOnMobile: true },
    { key: "breakDuration", header: "Break Duration", type: "number", hideOnMobile: true }
  ],
  formPanelClassName: "max-w-[620px]",
  formFields: [
    { name: "name", label: "Template Name", type: "text", required: true },
    { name: "description", label: "Template Description", type: "text" },
    { name: "workDay", label: "Work Day", type: "date" },
    { name: "startTime", label: "Start Time", type: "time", required: true },
    { name: "endTime", label: "End Time", type: "time", required: true },
    { name: "breakStart", label: "Break Start", type: "time" },
    { name: "breakEnd", label: "Break End", type: "time" },
    { name: "legacyEmployeeIds", label: "Assign Employee IDs (CSV)", type: "text", placeholder: "1,2,3" }
  ]
};

export const leaveResource: ResourceConfig = {
  title: "Leave Requests",
  eyebrow: "Leave Management",
  description: "Approve, reject, and audit employee leave requests.",
  endpoint: "leaves",
  formVariant: "leave-request",
  formPanelClassName: "max-w-[720px]",
  searchPlaceholder: "Search employee code, name, leave type, status",
  createLabel: "New request",
  columns: [
    { key: "employee.employeeCode", header: "Employee Code" },
    { key: "employee", header: "Employee Name", type: "person" },
    { key: "employee.position", header: "Position", hideOnMobile: true },
    { key: "leaveType", header: "Leave Type" },
    { key: "startDate", header: "Leave From", type: "date" },
    { key: "endDate", header: "Leave To", type: "date" },
    { key: "duration", header: "Number of Days", type: "number" },
    { key: "status", header: "Status", type: "status" },
    { key: "reason", header: "Reason", hideOnMobile: true },
    { key: "createdAt", header: "Requested On", type: "date", hideOnMobile: true },
    { key: "approvedBy", header: "Approved By", hideOnMobile: true }
  ],
  formFields: [
    { name: "employeeId", label: "Employee", type: "select", required: true, coerceNumber: true },
    {
      name: "leaveType",
      label: "Leave Type",
      type: "select",
      required: true,
      options: [
        { label: "Vacation Leave", value: "Vacation" },
        { label: "Sick Leave", value: "Sick" },
        { label: "Leave Without Pay", value: "Lwop" },
        { label: "Half Day AM", value: "HalfAM" },
        { label: "Half Day PM", value: "HalfPM" }
      ]
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Pending", value: "PENDING" },
        { label: "Approved", value: "APPROVED" },
        { label: "Rejected", value: "REJECTED" },
        { label: "Cancelled", value: "CANCELLED" }
      ]
    },
    { name: "startDate", label: "Start Date", type: "date", required: true },
    { name: "endDate", label: "End Date", type: "date", required: true },
    { name: "leaveRate", label: "Leave Rate", type: "number" },
    { name: "reason", label: "Reason", type: "textarea" }
  ]
};

export const leaveBalanceResource: ResourceConfig = {
  title: "Leave Balances",
  eyebrow: "Leave Management",
  description: "Track earned, used, and remaining Vacation and Sick leave per employee.",
  endpoint: "leave-balances",
  formVariant: "leave-balance",
  formPanelClassName: "max-w-[720px]",
  searchPlaceholder: "Search employee code, employee name, leave totals",
  createLabel: "New leave balance",
  columns: [
    { key: "employee_code", header: "Employee ID" },
    { key: "full_name", header: "Employee Name" },
    { key: "VL.total", header: "Total VL", type: "number" },
    { key: "VL.used", header: "Used VL", type: "number" },
    { key: "VL.remaining", header: "VL Remaining", type: "number" },
    { key: "SL.total", header: "Total SL", type: "number" },
    { key: "SL.used", header: "Used SL", type: "number" },
    { key: "SL.remaining", header: "SL Remaining", type: "number" }
  ],
  formFields: [
    { name: "employeeId", label: "Employee", type: "select", required: true, coerceNumber: true },
    { name: "vacationTotal", label: "Vacation Leave Total", type: "number" },
    { name: "vacationUsed", label: "Vacation Leave Used", type: "number" },
    { name: "sickTotal", label: "Sick Leave Total", type: "number" },
    { name: "sickUsed", label: "Sick Leave Used", type: "number" }
  ]
};

export const leaveTypeResource: ResourceConfig = {
  title: "Leave Types",
  eyebrow: "Leave Management",
  description: "Maintain leave type policy, unit, limits, and notification rules.",
  endpoint: "leave-types",
  searchPlaceholder: "Search leave name, type, status, policy",
  createLabel: "New leave type",
  columns: [
    { key: "leaveName", header: "Leave Name" },
    { key: "type", header: "Leave Type" },
    { key: "leaveUnit", header: "Leave Unit" },
    { key: "status", header: "Status", type: "status" },
    { key: "duration", header: "Duration (Days)", type: "number" },
    { key: "createdBy", header: "Created By", hideOnMobile: true },
    { key: "carryOver", header: "Carry Over Policy", hideOnMobile: true },
    { key: "notificationPeriod", header: "Notification Period", hideOnMobile: true },
    { key: "maxLeaves", header: "Maximum Leaves", type: "number", hideOnMobile: true },
    { key: "annualLimit", header: "Annual Limit", type: "number", hideOnMobile: true },
    { key: "note", header: "Note", hideOnMobile: true }
  ],
  formFields: [
    { name: "leaveName", label: "Leave Name", type: "text", required: true },
    {
      name: "type",
      label: "Leave Type",
      type: "select",
      options: [
        { label: "Paid", value: "Paid" },
        { label: "Unpaid", value: "Unpaid" }
      ]
    },
    {
      name: "leaveUnit",
      label: "Leave Unit",
      type: "select",
      options: [
        { label: "Day", value: "Day" },
        { label: "Half Day", value: "Half Day" },
        { label: "Hour", value: "Hour" }
      ]
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "Active" },
        { label: "Inactive", value: "Inactive" }
      ]
    },
    { name: "duration", label: "Duration (Days)", type: "number" },
    { name: "createdBy", label: "Created By", type: "text" },
    { name: "carryOver", label: "Carry Over Policy", type: "text" },
    { name: "notificationPeriod", label: "Notification Period", type: "text" },
    { name: "maxLeaves", label: "Maximum Leaves", type: "number" },
    { name: "annualLimit", label: "Annual Limit", type: "number" },
    { name: "note", label: "Note", type: "textarea" }
  ]
};

export const payrollResource: ResourceConfig = {
  title: "Payroll Runs",
  eyebrow: "Payroll",
  description: "Create payroll faster with period-based attendance preview, auto-computed totals, and clear deduction controls.",
  endpoint: "payroll",
  formVariant: "payroll-run",
  dateRangeFilter: {
    enabled: true,
    fromParam: "from",
    toParam: "to",
  },
  formPanelClassName: "max-w-[960px]",
  searchPlaceholder: "Search employee, status, period",
  createLabel: "New payroll",
  columns: [
    { key: "payrollFrom", header: "Date From", type: "date" },
    { key: "payrollTo", header: "Date To", type: "date" },
    { key: "employee.employeeCode", header: "Employee ID" },
    { key: "employee", header: "Employee Name", type: "person" },
    { key: "daysOfWork", header: "Days of Work", type: "number", hideOnMobile: true },
    { key: "rate", header: "Rate", type: "currency", hideOnMobile: true },
    { key: "totalRegularWage", header: "Gross Amount", type: "currency" },
    { key: "totalAllowance", header: "Benefits", type: "currency", hideOnMobile: true },
    { key: "otherDeduction", header: "Deductions", type: "currency", hideOnMobile: true },
    { key: "netAmountPaid", header: "Net Salary", type: "currency" },
    { key: "status", header: "Status", type: "status" },
    { key: "payrollDate", header: "Created Date", type: "date", hideOnMobile: true }
  ],
  formFields: [
    { name: "employeeId", label: "Employee", type: "select", required: true, coerceNumber: true },
    { name: "payrollFrom", label: "Start Date", type: "date", required: true },
    { name: "payrollTo", label: "End Date", type: "date", required: true },
    { name: "daysOfWork", label: "Days of Work", type: "number", readOnly: true },
    { name: "rate", label: "Salary Rate", type: "number", readOnly: true },
    { name: "totalRegularWage", label: "Gross Salary", type: "number", readOnly: true },
    { name: "sssDeduction", label: "SSS Contribution", type: "number" },
    { name: "philhealthDeduction", label: "PhilHealth Contribution", type: "number" },
    { name: "pagibigDeduction", label: "Pag-IBIG Contribution", type: "number" },
    { name: "overtimeHours", label: "Overtime Hours", type: "number", readOnly: true },
    { name: "overtimeAmount", label: "Overtime Rate (+)", type: "number" },
    { name: "addOnHoliday", label: "Leave Rate (+)", type: "number" },
    { name: "bonusRate", label: "Bonus (+)", type: "number" },
    { name: "bonusRemarks", label: "Bonus Remarks", type: "text" },
    { name: "lateHours", label: "Late Hours", type: "number", readOnly: true },
    { name: "lateAmount", label: "Late Deduction (-)", type: "number" },
    { name: "penaltyOrUndertime", label: "Undertime Deduction (-)", type: "number" },
    { name: "penaltyRate", label: "Penalty (-)", type: "number" },
    { name: "penaltyRemarks", label: "Penalty Remarks", type: "text" },
    { name: "pondo", label: "Fund Deduction (-)", type: "number" },
    { name: "valeDeduction", label: "Cash Advance Deduction (-)", type: "number" },
    { name: "loanDeduction", label: "Loan Deduction (-)", type: "number" },
    { name: "sssLoan", label: "SSS Loan Deduction (-)", type: "number" },
    { name: "pagibigLoan", label: "Pag-IBIG Loan Deduction (-)", type: "number" },
    { name: "philhealthLoan", label: "PhilHealth Loan Deduction (-)", type: "number" },
    { name: "charge", label: "Charge (-)", type: "number" },
    { name: "credit", label: "Credit (+)", type: "number" },
    { name: "totalAllowance", label: "Total Benefits", type: "number", readOnly: true },
    { name: "otherDeduction", label: "Total Deductions", type: "number", readOnly: true },
    { name: "totalAmount", label: "Total Before Deductions", type: "number", readOnly: true },
    { name: "netAmountPaid", label: "Net Salary", type: "number", readOnly: true },
    {
      name: "payMethod",
      label: "Payment Method",
      type: "select",
      required: true,
      options: [
        { label: "Cash", value: "Cash" },
        { label: "Gcash", value: "Gcash" },
        { label: "Bank Transfer", value: "Bank Transfer" }
      ]
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Draft", value: "DRAFT" },
        { label: "Previewed", value: "PREVIEWED" },
        { label: "Released", value: "RELEASED" },
        { label: "Voided", value: "VOIDED" }
      ]
    }
  ]
};

export const cashAdvanceResource: ResourceConfig = {
  title: "Cash Advances",
  eyebrow: "Transactions",
  description: "Track employee cash advances, ATD, amount, issue date, and repayment status.",
  endpoint: "cash-advances",
  formVariant: "cash-advance",
  dateRangeFilter: {
    enabled: true,
    fromParam: "from",
    toParam: "to",
  },
  formPanelClassName: "max-w-[720px]",
  searchPlaceholder: "Search ATD, employee code, employee name, area, method, status",
  createLabel: "New cash advance",
  columns: [
    { key: "atd", header: "ATD" },
    { key: "dateIssued", header: "Date Issued", type: "date" },
    { key: "employee.employeeCode", header: "Employee ID" },
    { key: "employee", header: "Employee Name", type: "person" },
    { key: "employee.store.area", header: "Area", hideOnMobile: true },
    { key: "paymentMethod", header: "Payment Method", hideOnMobile: true },
    { key: "amount", header: "Amount", type: "currency" },
    { key: "reason", header: "Remarks", hideOnMobile: true },
    { key: "status", header: "Status", type: "status" }
  ],
  formFields: [
    { name: "employeeId", label: "Employee", type: "select", required: true, coerceNumber: true },
    { name: "atd", label: "ATD", type: "text", required: true },
    { name: "amount", label: "Amount", type: "number", required: true },
    {
      name: "paymentMethod",
      label: "Payment Method",
      type: "select",
      required: true,
      options: [
        { label: "Cash", value: "Cash" },
        { label: "Gcash", value: "Gcash" },
        { label: "Bank Transfer", value: "Bank Transfer" }
      ]
    },
    { name: "dateIssued", label: "Date Issued", type: "date", required: true },
    { name: "reason", label: "Remarks", type: "textarea" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "For Approval", value: "PENDING" },
        { label: "Approved", value: "APPROVED" },
        { label: "Partially Paid", value: "PARTIAL" },
        { label: "Paid", value: "PAID" },
        { label: "Cancelled", value: "CANCELLED" }
      ]
    },
    {
      name: "type",
      label: "Record Type",
      type: "select",
      options: [{ label: "Cash Advance", value: "Cash Advance" }]
    }
  ]
};

export const loanResource: ResourceConfig = {
  title: "Loans",
  eyebrow: "Transactions",
  description: "Track standard employee loans with installment schedule and repayment balance.",
  endpoint: "cash-advances",
  formVariant: "cash-advance",
  dateRangeFilter: {
    enabled: true,
    fromParam: "from",
    toParam: "to",
  },
  formPanelClassName: "max-w-[760px]",
  searchPlaceholder: "Search ATD, employee code, employee name, area, payment method, status",
  createLabel: "New loan",
  columns: [
    { key: "atd", header: "ATD" },
    { key: "dateIssued", header: "Date Issued", type: "date" },
    { key: "employee.employeeCode", header: "Employee ID" },
    { key: "employee", header: "Employee Name", type: "person" },
    { key: "employee.store.area", header: "Area", hideOnMobile: true },
    { key: "paymentMethod", header: "Payment Method", hideOnMobile: true },
    { key: "amount", header: "Amount", type: "currency" },
    { key: "interests", header: "Interests", type: "currency", hideOnMobile: true },
    { key: "installmentPlan", header: "Installment", type: "number", hideOnMobile: true },
    { key: "totalAmount", header: "Total Amount", type: "currency" },
    { key: "balance", header: "Balance", type: "currency" },
    { key: "repaymentDue", header: "Payment Due", type: "date", hideOnMobile: true },
    { key: "reason", header: "Remarks", hideOnMobile: true },
    { key: "status", header: "Status", type: "status" }
  ],
  formFields: [
    { name: "employeeId", label: "Employee", type: "select", required: true, coerceNumber: true },
    { name: "atd", label: "ATD", type: "text", required: true },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "interests", label: "Interests", type: "number" },
    {
      name: "paymentMethod",
      label: "Payment Method",
      type: "select",
      required: true,
      options: [
        { label: "Cash", value: "Cash" },
        { label: "Gcash", value: "Gcash" },
        { label: "Bank Transfer", value: "Bank Transfer" }
      ]
    },
    { name: "dateIssued", label: "Date Issued", type: "date", required: true },
    { name: "installmentPlan", label: "Installment Plan", type: "number" },
    { name: "repaymentDue", label: "Payment Due", type: "date" },
    { name: "reason", label: "Remarks", type: "textarea" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "For Approval", value: "PENDING" },
        { label: "Approved", value: "APPROVED" },
        { label: "Partially Paid", value: "PARTIAL" },
        { label: "Paid", value: "PAID" },
        { label: "Cancelled", value: "CANCELLED" }
      ]
    },
    {
      name: "type",
      label: "Record Type",
      type: "select",
      options: [{ label: "Loan", value: "Loan" }]
    }
  ]
};

export const benefitLoanResource: ResourceConfig = {
  title: "Benefit Loans",
  eyebrow: "Transactions",
  description: "Manage SSS, PAG-IBIG, and PHILHEALTH loan requests with clear repayment tracking.",
  endpoint: "cash-advances",
  formVariant: "cash-advance",
  dateRangeFilter: {
    enabled: true,
    fromParam: "from",
    toParam: "to",
  },
  formPanelClassName: "max-w-[760px]",
  searchPlaceholder: "Search ATD, employee code, employee name, area, loan type, status",
  createLabel: "New benefit loan",
  columns: [
    { key: "atd", header: "ATD" },
    { key: "dateIssued", header: "Date Issued", type: "date" },
    { key: "employee.employeeCode", header: "Employee ID" },
    { key: "employee", header: "Employee Name", type: "person" },
    { key: "employee.store.area", header: "Area", hideOnMobile: true },
    { key: "type", header: "Benefit Type", type: "status" },
    { key: "amount", header: "Amount", type: "currency" },
    { key: "interests", header: "Interests", type: "currency", hideOnMobile: true },
    { key: "installmentPlan", header: "Installment", type: "number", hideOnMobile: true },
    { key: "totalAmount", header: "Total Amount", type: "currency" },
    { key: "balance", header: "Balance", type: "currency" },
    { key: "reason", header: "Remarks", hideOnMobile: true },
    { key: "status", header: "Status", type: "status" }
  ],
  formFields: [
    { name: "employeeId", label: "Employee", type: "select", required: true, coerceNumber: true },
    { name: "atd", label: "ATD", type: "text", required: true },
    {
      name: "type",
      label: "Benefit Loan Type",
      type: "select",
      required: true,
      options: [
        { label: "SSS Loan", value: "SSS Loan" },
        { label: "PAG-IBIG Loan", value: "PAG-IBIG Loan" },
        { label: "PHILHEALTH Loan", value: "PHILHEALTH Loan" }
      ]
    },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "interests", label: "Interests", type: "number" },
    { name: "installmentPlan", label: "Installment Plan", type: "number", required: true },
    {
      name: "paymentMethod",
      label: "Payment Method",
      type: "select",
      required: true,
      options: [
        { label: "Cash", value: "Cash" },
        { label: "Gcash", value: "Gcash" },
        { label: "Bank Transfer", value: "Bank Transfer" }
      ]
    },
    { name: "dateIssued", label: "Date Issued", type: "date", required: true },
    { name: "repaymentDue", label: "Payment Due", type: "date" },
    { name: "reason", label: "Remarks", type: "textarea" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "For Approval", value: "PENDING" },
        { label: "Approved", value: "APPROVED" },
        { label: "Partially Paid", value: "PARTIAL" },
        { label: "Paid", value: "PAID" },
        { label: "Cancelled", value: "CANCELLED" }
      ]
    }
  ]
};

export const paymentHistoryResource: ResourceConfig = {
  title: "Payment History",
  eyebrow: "Transactions",
  description: "Review recorded paid payments across cash advances and loans.",
  endpoint: "cash-advances/payment-history",
  dateRangeFilter: {
    enabled: true,
    fromParam: "from",
    toParam: "to",
  },
  searchPlaceholder: "Search ATD, employee code, employee name, type, payment method, recorder",
  columns: [
    { key: "atd", header: "ATD" },
    { key: "dateIssued", header: "Date Issued", type: "date", hideOnMobile: true },
    { key: "employee.employeeCode", header: "Employee ID" },
    { key: "employee", header: "Employee Name", type: "person" },
    { key: "employee.store.area", header: "Area", hideOnMobile: true },
    { key: "type", header: "Type", hideOnMobile: true },
    { key: "amountPaid", header: "Amount Paid", type: "currency" },
    { key: "paymentDate", header: "Payment Date", type: "datetime" },
    { key: "paymentMethod", header: "Payment Method", hideOnMobile: true }
  ]
};

export const fundsResource: ResourceConfig = {
  title: "Employee Funds",
  eyebrow: "Employees",
  description: "Track employee fund in/out requests, status, amount, and encoder.",
  endpoint: "funds",
  dateRangeFilter: {
    enabled: true,
    fromParam: "from",
    toParam: "to",
  },
  searchPlaceholder: "Search employee ID, name, area, action, status",
  createLabel: "Log funds",
  columns: [
    { key: "atd", header: "ATD" },
    { key: "createdAt", header: "Date Issued", type: "date" },
    { key: "employee.employeeCode", header: "Employee ID" },
    { key: "employee", header: "Employee Name", type: "person" },
    { key: "employee.store.area", header: "Area", hideOnMobile: true },
    { key: "action", header: "Action", type: "status" },
    { key: "amount", header: "Amount", type: "currency" },
    { key: "status", header: "Status", type: "status" },
    { key: "remarks", header: "Remarks", hideOnMobile: true },
    { key: "encoder", header: "Created By", hideOnMobile: true }
  ],
  formFields: [
    { name: "employeeId", label: "Employee", type: "select", required: true, coerceNumber: true },
    { name: "atd", label: "ATD", type: "text" },
    {
      name: "action",
      label: "Action",
      type: "select",
      required: true,
      options: [
        { label: "IN", value: "IN" },
        { label: "OUT", value: "OUT" }
      ]
    },
    {
      name: "type",
      label: "Type",
      type: "select",
      options: [
        { label: "Normal", value: "Normal" },
        { label: "Adjustment", value: "Adjustment" }
      ]
    },
    { name: "amount", label: "Amount", type: "number", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Pending", value: "Pending" },
        { label: "Released", value: "Released" },
        { label: "For Approval", value: "For Approval" }
      ]
    },
    { name: "paymentMethod", label: "Payment Method", type: "text" },
    { name: "createdAt", label: "Date Issued", type: "date" },
    { name: "cashBy", label: "Cash By", type: "text" },
    { name: "remarks", label: "Remarks", type: "textarea" }
  ]
};

export const perksResource: ResourceConfig = {
  title: "Employee Perks",
  eyebrow: "Employees",
  description: "Maintain allowance and incentive entries by employee and store area.",
  endpoint: "allowances",
  searchPlaceholder: "Search employee ID, employee name, type, status, remarks",
  createLabel: "New perks",
  columns: [
    { key: "atd", header: "ATD" },
    { key: "createdAt", header: "Date Issued", type: "date" },
    { key: "employee.employeeCode", header: "Employee ID" },
    { key: "employee", header: "Employee Name", type: "person" },
    { key: "employee.store.area", header: "Area", hideOnMobile: true },
    { key: "type", header: "Type", type: "status" },
    { key: "amount", header: "Amount", type: "currency" },
    { key: "status", header: "Status", type: "status" },
    { key: "remarks", header: "Remarks", hideOnMobile: true }
  ],
  formFields: [
    { name: "employeeId", label: "Employee", type: "select", required: true, coerceNumber: true },
    { name: "atd", label: "ATD", type: "text" },
    {
      name: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { label: "Allowance", value: "Allowance" },
        { label: "Incentive", value: "Incentive" }
      ]
    },
    { name: "amount", label: "Amount", type: "number", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Pending", value: "Pending" },
        { label: "Released", value: "Released" }
      ]
    },
    { name: "remarks", label: "Remarks", type: "textarea" }
  ]
};

export const employeeGroupResource: ResourceConfig = {
  title: "Employee Groups",
  eyebrow: "Employees",
  description: "Create employee groups and assign members with search and filters.",
  endpoint: "employee-groups",
  searchPlaceholder: "Search group name or member count",
  createLabel: "New group",
  columns: [
    { key: "name", header: "Group Name" },
    { key: "memberCount", header: "Members", type: "number" }
  ],
  formFields: [
    { name: "name", label: "Group Name", type: "text", required: true },
    { name: "memberIdsCsv", label: "Assign Members", type: "text", placeholder: "Select members below" }
  ]
};

export const storeResource: ResourceConfig = {
  title: "Stores",
  eyebrow: "Company Setup",
  description: "Maintain branch codes, locations, contacts, and area assignments.",
  endpoint: "stores",
  searchPlaceholder: "Search code, name, area, contact",
  createLabel: "Add store",
  columns: [
    { key: "code", header: "Code" },
    { key: "name", header: "Store" },
    { key: "area", header: "Area" },
    { key: "contactPerson", header: "Contact", hideOnMobile: true },
    { key: "contactNumber", header: "Phone", hideOnMobile: true }
  ],
  formFields: [
    { name: "code", label: "Code", type: "text", required: true },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "area", label: "Area", type: "text" },
    { name: "address", label: "Address", type: "textarea" },
    { name: "contactPerson", label: "Contact person", type: "text" },
    { name: "contactNumber", label: "Contact number", type: "text" }
  ]
};

export const userResource: ResourceConfig = {
  title: "Users",
  eyebrow: "Access Control",
  description: "Manage application accounts, roles, and store or employee linkage.",
  endpoint: "users",
  formVariant: "user-account",
  formPanelClassName: "max-w-[700px]",
  searchPlaceholder: "Search username, role, status",
  createLabel: "New user",
  columns: [
    { key: "username", header: "Username", type: "raw" },
    { key: "role", header: "Role", type: "status" },
    { key: "status", header: "Status", type: "status" },
    { key: "employeeLabel", header: "Employee", type: "person", hideOnMobile: true },
    { key: "storeLabel", header: "Store", type: "person", hideOnMobile: true }
  ],
  formFields: [
    { name: "employeeId", label: "Employee", type: "select", coerceNumber: true },
    { name: "storeId", label: "Store", type: "select", coerceNumber: true },
    { name: "username", label: "Username", type: "text", required: true },
    { name: "password", label: "Temporary password", type: "password", required: true },
    {
      name: "role",
      label: "Role",
      type: "select",
      required: true,
      options: [
        { label: "Employee", value: "EMPLOYEE" },
        { label: "Admin", value: "ADMIN" },
        { label: "Super admin", value: "SUPER_ADMIN" }
      ]
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "ACTIVE" },
        { label: "Inactive", value: "INACTIVE" }
      ]
    }
  ]
};
