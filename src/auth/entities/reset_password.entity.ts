export class ResetPasswordInput {
  userName!: string;
  newPassword!: string;
  oldPassword?: string; // 一般用戶需要提供舊密碼，管理員則不需要
}
