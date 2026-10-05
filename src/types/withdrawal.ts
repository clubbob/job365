export type WithdrawalLog = {
  id: string;
  userId: string;
  email: string | null;
  nickname: string;
  reason: string;
  withdrawnAt: string;
};

export const WITHDRAWAL_REASON_MAX_LENGTH = 500;
