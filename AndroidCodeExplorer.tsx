import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { 
  auth, 
  signInWithGoogle, 
  signOutUser, 
  backupLocationsToCloud, 
  restoreLocationsFromCloud, 
  mergeLocations 
} from './firebase';
import { LocationNote, CategoryType } from './types';
import AndroidCodeExplorer from './components/AndroidCodeExplorer';
import AndroidEmulator from './components/AndroidEmulator';
import { APIProvider } from '@vis.gl/react-google-maps';

// Material Design 3 and Google Maps Config Constants
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

// Pre-seeded local locations representing standard SQLite mock database
const INITIAL_LOCATIONS: LocationNote[] = [
  {
    id: '1',
    shopName: 'TechSource Supply Hub',
    latitude: 30.2672,
    longitude: -97.7431,
    address: '1200 Innovation Way, Suite 400, Austin, TX 78701',
    notes: 'Main supplier for custom PCB boards. Speak with Greg in receiving (Dock B). Lead time is 5 business days.',
    createdAt: 1719662100000,
    updatedAt: 1719662100000,
    category: 'Warehouse',
    isFavorite: true,
    colorLabel: 'red',
    contactInfo: {
      ownerName: 'Greg Davidson',
      phone: '+1 (512) 555-0192',
      whatsapp: '+15125550192',
      email: 'greg@techsourcesupply.com'
    },
    richNotes: {
      bullets: [
        'Dock B is for commercial freight only',
        'Check inventory count before leaving warehouse',
        'Invoices must be signed by supervisor'
      ],
      checklists: [
        { id: 'chk-1', text: 'Obtain gate release signature', done: true },
        { id: 'chk-2', text: 'Confirm temperature log in courier truck', done: false }
      ]
    }
  },
  {
    id: '2',
    shopName: 'Apex Retail Pharmacy',
    latitude: 40.7233,
    longitude: -74.0030,
    address: '450 Broadway St, New York, NY 10013',
    notes: 'Key prescription distributor. Monthly compliance audits required on the 1st. Verify demo products are powered on.',
    createdAt: 1719662200000,
    updatedAt: 1719662200000,
    category: 'Pharmacy',
    isFavorite: false,
    colorLabel: 'green',
    contactInfo: {
      ownerName: 'Dr. Linda Ross',
      phone: '+1 (212) 555-0144',
      whatsapp: '+12125550144',
      email: 'linda.ross@apexpharmacy.com'
    },
    richNotes: {
      bullets: [
        'Ask for Linda directly in the back dispensary',
        'Deliveries accepted before 10 AM on weekdays',
        'Requires drug-safe certified carrier'
      ],
      checklists: [
        { id: 'chk-3', text: 'Inspect refrigerated stock storage', done: true },
        { id: 'chk-4', text: 'Scan QR verification badge', done: true },
        { id: 'chk-5', text: 'Collect counter receipt copy', done: false }
      ]
    }
  },
  {
    id: '3',
    shopName: 'Westside General Hospital',
    latitude: 41.8119,
    longitude: -87.6658,
    address: '8900 Logistics Blvd, Chicago, IL 60609',
    notes: 'Regional hospital and emergency transit point. Deliveries accepted 24/7, but check in with security at Gate 3.',
    createdAt: 1719662300000,
    updatedAt: 1719662300000,
    category: 'Hospital',
    isFavorite: true,
    colorLabel: 'blue',
    contactInfo: {
      ownerName: 'Sarah Jenkins (Logistics Chief)',
      phone: '+1 (312) 555-0189',
      whatsapp: '+13125550189',
      email: 's.jenkins@westsidehospital.org'
    },
    richNotes: {
      bullets: [
        'Gate code is #5590 for secure dispatch trucks',
        'Always wear high-vis vest and safety goggles',
        'Submit digital waypoint confirmation on delivery'
      ],
      checklists: [
        { id: 'chk-6', text: 'Deliver hazardous waste containers', done: false },
        { id: 'chk-7', text: 'Get security check stamp', done: false }
      ]
    }
  },
  {
    id: '4',
    shopName: 'ABC Medical',
    latitude: 30.2742,
    longitude: -97.7401,
    address: '1500 Medical Parkway, Suite 100, Austin, TX 78756',
    notes: 'Premium healthcare clinic. Dedicated client location with regular routine visits. Check in with receptionist on arrival.',
    createdAt: 1781013720000, // Year 2026 pre-seed
    updatedAt: 1781013720000,
    category: 'Hospital',
    isFavorite: true,
    colorLabel: 'blue',
    contactInfo: {
      ownerName: 'Dr. Robert Chen',
      phone: '+1 (512) 555-0130',
      whatsapp: '+15125550130',
      email: 'contact@abcmedical.com'
    },
    richNotes: {
      bullets: [
        'Main clinic entrance is located on the East wing',
        'Staff parking requires visitor permit from desk',
        'Coordinate bi-weekly diagnostics supply deliveries'
      ],
      checklists: [
        { id: 'abc-chk-1', text: 'Obtain facility access badge', done: true },
        { id: 'abc-chk-2', text: 'Review inventory logs at nurses station', done: true },
        { id: 'abc-chk-3', text: 'Get signed visit sheet copy', done: true }
      ]
    },
    visitHistory: [
      { id: 'v-1', timestamp: 1782731520000, date: 'Jun 29, 2026', time: '11:12 AM', notes: 'Routine clinical support visit. Audited diagnostics cabinets and updated product catalogs.' },
      { id: 'v-2', timestamp: 1782645120000, date: 'Jun 28, 2026', time: '11:12 AM', notes: 'Urgent supplies delivery. Handed over emergency dispatch to receptionist.' },
      { id: 'v-3', timestamp: 1782315900000, date: 'Jun 24, 2026', time: '03:45 PM', notes: 'Bi-weekly medical materials audit completed.' },
      { id: 'v-4', timestamp: 1781947800000, date: 'Jun 20, 2026', time: '09:30 AM', notes: 'Regular catalog review and doctor consultation support.' },
      { id: 'v-5', timestamp: 1781518680000, date: 'Jun 15, 2026', time: '10:18 AM', notes: 'Initial setup of client display samples.' },
      { id: 'v-6', timestamp: 1781196120000, date: 'Jun 11, 2026', time: '02:02 PM', notes: 'First introductory facility review and onboarding.' }
    ]
  }
];

export default function App() {
  // Developer Workspace State
  const [selectedFile, setSelectedFile] = useState('app/src/main/java/com/routebook/app/data/local/LocationEntity.kt');
  const [copiedFile, setCopiedFile] = useState(false);
  const [developerMode, setDeveloperMode] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'code' | 'branding' | 'legal'>('code');

  // Android Emulator Sync State
  const [appTheme, setAppTheme] = useState<'light' | 'dark'>('light');
  const [locations, setLocations] = useState<LocationNote[]>(() => {
    const saved = localStorage.getItem('routebook_sim_db');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as LocationNote[];
        // Ensure ABC Medical is preserved in offline DB
        if (!parsed.some(l => l.id === '4')) {
          const abc = INITIAL_LOCATIONS.find(l => l.id === '4');
          if (abc) parsed.push(abc);
        }
        return parsed;
      } catch (err) {
        return INITIAL_LOCATIONS;
      }
    }
    return INITIAL_LOCATIONS;
  });

  const [activeScreen, setActiveScreen] = useState<'home' | 'picker' | 'details' | 'view_details'>('home');
  const [selectedLocation, setSelectedLocation] = useState<LocationNote | null>(null);

  // Auth Sync States
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'pending'>('idle');
  const [importSummary, setImportSummary] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  // Monitor Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        handleTriggerCloudSync(user, locations, 'restore');
      }
    });
    return () => unsubscribe();
  }, []);

  // Monitor location edits to automatically back up to local storage
  useEffect(() => {
    localStorage.setItem('routebook_sim_db', JSON.stringify(locations));
    if (currentUser) {
      handleTriggerCloudSync(currentUser, locations, 'backup');
    }
  }, [locations]);

  // Combined Cloud Sync Logic
  const handleTriggerCloudSync = async (user: FirebaseUser, currentList: LocationNote[], direction: 'backup' | 'restore') => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncStatus('syncing');

    try {
      if (direction === 'backup') {
        await backupLocationsToCloud(user.uid, currentList);
        setSyncStatus('synced');
      } else {
        const remoteData = await restoreLocationsFromCloud(user.uid);
        if (remoteData) {
          const merged = mergeLocations(currentList, remoteData);
          setLocations(merged);
          setSyncStatus('synced');
        } else {
          // If no cloud data exists, back up current preseeds
          await backupLocationsToCloud(user.uid, currentList);
          setSyncStatus('synced');
        }
      }
    } catch (err) {
      console.error("Cloud Sync failed:", err);
      setSyncStatus('error');
    } finally {
      isSyncingRef.current = false;
    }
  };

  const handleManualSync = () => {
    if (currentUser) {
      handleTriggerCloudSync(currentUser, locations, 'restore');
    }
  };

  const handleSignInGoogle = async () => {
    try {
      const user = await signInWithGoogle();
      setCurrentUser(user);
    } catch (error) {
      console.error("Google sign in failed:", error);
    }
  };

  const handleSignOutUser = async () => {
    try {
      await signOutUser();
      setCurrentUser(null);
      setSyncStatus('idle');
    } catch (error) {
      console.error("Signout failed:", error);
    }
  };

  // Robust CSV Parser
  const parseCSVData = (csvText: string): Partial<LocationNote>[] => {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentLine += '"';
          i++; // skip next double quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === '\n' || char === '\r') {
        if (inQuotes) {
          currentLine += char;
        } else {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          lines.push(currentLine);
          currentLine = '';
        }
      } else {
        currentLine += char;
      }
    }
    if (currentLine) lines.push(currentLine);
    if (lines.length < 2) return [];

    const parseRow = (line: string): string[] => {
      const fields: string[] = [];
      let field = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQ = !inQ;
        } else if (char === ',' && !inQ) {
          fields.push(field);
          field = '';
        } else {
          field += char;
        }
      }
      fields.push(field);
      return fields;
    };

    const headers = parseRow(lines[0]).map(h => h.trim().toLowerCase());
    const parsedLocations: Partial<LocationNote>[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = parseRow(lines[i]);
      const record: any = {};

      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });

      const shopName = record['shop name'] || record['shopname'] || record['name'] || '';
      if (!shopName) continue;

      const category = record['category'] || 'Other';
      const address = record['address'] || 'Imported Location';
      const latitude = parseFloat(record['latitude'] || record['lat'] || '0') || 30.2672;
      const longitude = parseFloat(record['longitude'] || record['lng'] || '0') || -97.7431;
      const notes = record['notes'] || '';
      const isFavorite = record['favorite'] === 'true' || record['is_favorite'] === 'true' || record['favorite'] === 'Yes';
      
      let colorLabel = record['priority'] || record['colorlabel'] || 'green';
      if (!['red', 'green', 'blue', 'yellow'].includes(colorLabel)) {
        colorLabel = 'green';
      }

      parsedLocations.push({
        id: record['id'] || `loc-csv-${Math.random().toString(36).substring(2, 7)}-${Date.now()}`,
        shopName,
        category: category as any,
        address,
        latitude,
        longitude,
        notes,
        isFavorite,
        colorLabel: colorLabel as any,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    return parsedLocations;
  };

  // Excel spreadsheet importing (.csv, .json)
  const handleImportFile = (file: File) => {
    setImportError(null);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setImportError("Empty file uploaded");
        return;
      }

      try {
        let list: Partial<LocationNote>[] = [];
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          list = Array.isArray(parsed) ? parsed : [parsed];
        } else if (file.name.endsWith('.csv')) {
          list = parseCSVData(text);
        } else {
          setImportError("Please upload .csv or .json files.");
          return;
        }

        if (list.length === 0) {
          setImportError("No locations parsed successfully.");
          return;
        }

        let addedCount = 0;
        let updatedCount = 0;
        const mergedMap = new Map<string, LocationNote>();

        for (const loc of locations) {
          mergedMap.set(loc.id, loc);
        }

        for (const imp of list) {
          if (!imp.shopName) continue;
          const completeItem: LocationNote = {
            id: imp.id || `loc-imp-${Math.random().toString(36).substring(2, 7)}-${Date.now()}`,
            shopName: imp.shopName,
            category: imp.category || 'Other',
            address: imp.address || 'Imported Location',
            latitude: imp.latitude || 30.2672,
            longitude: imp.longitude || -97.7431,
            notes: imp.notes || '',
            createdAt: imp.createdAt || Date.now(),
            updatedAt: imp.updatedAt || Date.now(),
            isFavorite: imp.isFavorite || false,
            colorLabel: imp.colorLabel || 'green',
            contactInfo: imp.contactInfo,
            richNotes: imp.richNotes,
            visitHistory: imp.visitHistory || []
          };

          const existing = mergedMap.get(completeItem.id);
          if (!existing) {
            mergedMap.set(completeItem.id, completeItem);
            addedCount++;
          } else {
            mergedMap.set(completeItem.id, { ...existing, ...completeItem, id: existing.id });
            updatedCount++;
          }
        }

        const finalResult = Array.from(mergedMap.values());
        setLocations(finalResult);
        setImportSummary({ added: addedCount, updated: updatedCount });

      } catch (err: any) {
        console.error("Parse error:", err);
        setImportError("Failed to parse document structure.");
      }
    };

    reader.readAsText(file);
  };

  // Export spreadsheet using xlsx
  const handleExportExcel = () => {
    const flatData = locations.map(loc => ({
      ID: loc.id,
      'Shop Name': loc.shopName,
      Category: loc.category,
      Address: loc.address,
      Latitude: loc.latitude,
      Longitude: loc.longitude,
      Notes: loc.notes,
      Favorite: loc.isFavorite ? 'Yes' : 'No',
      Priority: loc.colorLabel || 'green',
      'Owner Name': loc.contactInfo?.ownerName || '',
      Phone: loc.contactInfo?.phone || '',
      WhatsApp: loc.contactInfo?.whatsapp || '',
      Email: loc.contactInfo?.email || '',
      'Total Visits Recorded': loc.visitHistory?.length || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Locations");
    XLSX.writeFile(workbook, `RouteBook_Locations_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <div className="min-h-screen bg-[#121115] text-[#1C1B1F] flex items-center justify-center font-sans relative overflow-hidden p-6 select-none">
        
        {/* Dynamic Vector grid lines styling desktop layout context */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(103,80,164,0.08),transparent_50%)] pointer-events-none hidden lg:block" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none hidden lg:block" />

        {/* Side-by-side Dashboard Panel Layout */}
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10">
          
          {/* Left / Developer panel: Source file explorer */}
          <div className="lg:col-span-7 xl:col-span-8 h-[740px] hidden lg:block">
            <AndroidCodeExplorer
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              copiedFile={copiedFile}
              setCopiedFile={setCopiedFile}
              rightPanelTab={rightPanelTab}
              setRightPanelTab={setRightPanelTab}
              locationsCount={locations.length}
              developerMode={developerMode}
              setDeveloperMode={setDeveloperMode}
              appTheme={appTheme}
            />
          </div>

          {/* Right panel: Live smartphone mockup device */}
          <div className="lg:col-span-5 xl:col-span-4 flex items-center justify-center">
            <AndroidEmulator
              locations={locations}
              setLocations={setLocations}
              activeScreen={activeScreen}
              setActiveScreen={setActiveScreen}
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
              appTheme={appTheme}
              setAppTheme={setAppTheme}
              currentUser={currentUser}
              onSignIn={handleSignInGoogle}
              onSignOut={handleSignOutUser}
              syncStatus={syncStatus}
              onManualSync={handleManualSync}
              onExportExcel={handleExportExcel}
              onImportFile={handleImportFile}
              importSummary={importSummary}
              importError={importError}
              setImportSummary={setImportSummary}
              setImportError={setImportError}
            />
          </div>

        </div>
      </div>
    </APIProvider>
  );
}
