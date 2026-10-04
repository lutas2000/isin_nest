import { RouterView, type RouteRecordRaw } from 'vue-router'

export const hrRoutes: RouteRecordRaw[] = [
  {
    path: '/hr',
    component: RouterView,
    meta: { requiresAuth: true, area: 'hr' },
    children: [
      { path: '', redirect: '/hr/staff' },
      { path: 'staff', name: 'HRStaff', component: () => import('../views/HR/Staff.vue'), meta: { title: '員工管理' } },
      { path: 'm70-users', name: 'M70Users', component: () => import('../views/Staff/M70Users.vue'), meta: { title: 'M70 員工對照', requiresAdmin: true } },
      { path: 'attendance', name: 'HRAttendance', component: () => import('../views/HR/Attendance.vue'), meta: { title: '出勤記錄' } },
      { path: 'manhour', name: 'HRManhour', component: () => import('../views/HR/Manhour.vue'), meta: { title: '工時管理' } },
      { path: 'staff-segment', name: 'HRStaffSegment', component: () => import('../views/HR/StaffSegment.vue'), meta: { title: '上班時段管理' } },
      { path: 'staff-vacation', name: 'HRStaffVacation', component: () => import('../views/HR/StaffVacation.vue'), meta: { title: '假期日曆' } },
      { path: 'leave', name: 'HRStaffLeave', component: () => import('../views/HR/StaffLeave.vue'), meta: { title: '請假登錄' } },
      { path: 'payroll', name: 'HRPayroll', component: () => import('../views/HR/Payroll.vue'), meta: { title: '薪資計算' } },
    ],
  },
  { path: '/staff/m70-users', redirect: '/hr/m70-users' },
]
