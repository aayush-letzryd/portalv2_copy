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
