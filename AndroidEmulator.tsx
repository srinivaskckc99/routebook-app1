export interface LocationNote {
  id: string;
  shopName: string;
  latitude: number;
  longitude: number;
  address: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
  category: CategoryType;
  
  // Phase 4 Features
  isFavorite?: boolean;
  colorLabel?: 'red' | 'green' | 'blue' | 'yellow'; // red=Urgent, green=Regular, blue=VIP, yellow=Follow-up
  photos?: {
    shopBoard?: string;
    entrance?: string;
    visitingCard?: string;
    invoice?: string;
  };
  contactInfo?: {
    ownerName: string;
    phone: string;
    whatsapp: string;
    email?: string;
  };
  richNotes?: {
    bullets?: string[];
    checklists?: { id: string; text: string; done: boolean }[];
  };
  visitHistory?: { 
    id: string; 
    timestamp: number; 
    date: string;
    time: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
  }[];
  reminderInterval?: number | null; // null/0 means No Reminder, other values: 7, 15, 30, 60, 90, 180, 365 days
}

export type CategoryType = 
  | 'Pharmacy' 
  | 'Grocery' 
  | 'Customer' 
  | 'Office' 
  | 'Restaurant' 
  | 'Warehouse' 
  | 'Dealer' 
  | 'Hospital' 
  | 'Other'
  // Backward compatibility with initial seeds:
  | 'Client'
  | 'Store'
  | 'Supply'
  | 'Service';

export interface AndroidFile {
  path: string;
  name: string;
  language: 'kotlin' | 'gradle' | 'xml';
  content: string;
  description: string;
}

