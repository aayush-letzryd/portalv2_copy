export type VisitorType = "Driver" | "Partner";
export type OnboardingOutcome = "Joined" | "Pending" | "Not Interested";

export interface WalkInRecord {
  id: number;
  visitor_type: VisitorType;
  event_date: string; // YYYY-MM-DD
  city: string;
  operating_place?: string;
  person_name: string;
  person_number: string;
  dl_number: string;
  aadhaar_number?: string;
  aadhaar_image?: string; // base64 data URL
  dl_image?: string; // base64 data URL
  visiting_reason: string;
  joined_status: OnboardingOutcome;
  remarks?: string;
  executive_name: string;
  executive_id: string;
}

export interface OnboardingRecord {
  id: number;
  driver_name: string;
  phone_number: string;
  whatsapp_number?: string;
  dob: string;
  city: string;
  operating_place?: string;
  present_address: string;
  permanent_address: string;
  emergency_name: string;
  emergency_phone: string;
  dl_number?: string;
  dl_expiry_date?: string;
  lead_source?: string;
  pan_number: string;
  aadhaar_number: string;
  pan_aadhaar_linked?: string;
  selfie_photo?: string;
  dl_front?: string;
  dl_back?: string;
  pan_card_photo?: string;
  aadhaar_card_photo?: string;
  vendor_name?: string;
  vendor_id?: string;
  father_name: string;
  bank_name?: string;
  other_bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
  created_at: string;
}

export interface AdjustmentRecord {
  id: number;
  partner_name: string;
  partner_code: string;
  driver_id?: string;
  partner_number: string;
  vehicle_number?: string;
  city_name: string;
  partner_type: "Individual" | "Fleet" | "Rental";
  adjustment_type: "Credit" | "Debit" | "Waiver";
  adjustment_date: string;
  enter_amount: string;
  remittance_towards?: string;
  adjustment_related_to?: string;
  remarks?: string;
  first_level_approval_by?: string;
  finance_team_status: "Approved" | "Pending" | "Rejected";
  finance_team_remarks?: string;
  final_level_approval_by?: string;
  status: "Completed" | "Hold" | "Declined";
  photo?: string;
  created_at: string;
}

export interface AllocationRecord {
  id: number;
  allocation_date: string;
  allocation_type: "New Allocation" | "Car Swap" | "Reallocation";
  city_name: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  driver_plan?: string;
  type_of_plan?: string;
  car_model?: string;
  vehicle_number: string;
  old_vehicle_number?: string;
  dropoff_odometer?: string;
  dropoff_remarks?: string;
  dropoff_photo?: string;
  is_migrated?: boolean;
  created_at: string;
}

export interface ExpenseRecord {
  id: number;
  expense_date: string;
  driver_name: string;
  phone_number: string;
  vehicle_number: string;
  expenses_type: string;
  amount_paid: string;
  reference_photo?: string;
  is_migrated?: boolean;
  created_at: string;
}


export interface User {
  username: string;
  name: string;
  role: string;
  executive_id: string;
}

export interface CityOption {
  value: string;
  text: string;
}

export const CITIES: CityOption[] = [
  { value: "Hyderabad", text: "Hyderabad" },
  { value: "Bangalore", text: "Bangalore" },
  { value: "Mumbai", text: "Mumbai" }
];

export const MOCK_USERS: Record<string, { name: string; role: string; executive_id: string; password: string }> = {
  dshiva: {
    name: "D Shiva",
    role: "Operations Executive",
    executive_id: "EX-4091",
    password: "password"
  },
  anurag: {
    name: "Anurag Prasad",
    role: "Fleet Manager",
    executive_id: "FM-1024",
    password: "password"
  },
  admin: {
    name: "Admin User",
    role: "System Administrator",
    executive_id: "AD-0001",
    password: "password"
  }
};
