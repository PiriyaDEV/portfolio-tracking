export interface MemberObj {
  name: string;
  color: string;
  customPaid?: number;
}

export interface ItemObj {
  itemName: string;
  paidBy: string;
  price?: number;
  vatRate?: number;
  serviceChargeRate?: number;
  selectedMembers: MemberObj[];
  isEqualSplit?: boolean;
}
