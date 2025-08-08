export class UpdateUserInput {
  userName!: string; // 要更新的用戶名稱
  newUserName?: string; // 新的用戶名稱
  password?: string; // 新密碼
  isAdmin?: boolean; // 是否為管理員
  features?: string[]; // 功能權限
  staffId?: string; // 關聯的員工 ID
}
