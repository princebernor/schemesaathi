export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

/** District headquarters with approximate coordinates, used for offline "nearest district" lookup. */
type D = [name: string, lat: number, lng: number];

export const DISTRICTS: Record<string, D[]> = {
  'Tamil Nadu': [
    ['Ariyalur', 11.14, 79.08], ['Chengalpattu', 12.69, 79.98], ['Chennai', 13.08, 80.27], ['Coimbatore', 11.02, 76.96],
    ['Cuddalore', 11.75, 79.75], ['Dharmapuri', 12.13, 78.16], ['Dindigul', 10.36, 77.98], ['Erode', 11.34, 77.72],
    ['Kallakurichi', 11.74, 78.96], ['Kancheepuram', 12.83, 79.7], ['Kanniyakumari', 8.18, 77.41], ['Karur', 10.96, 78.08],
    ['Krishnagiri', 12.52, 78.21], ['Madurai', 9.93, 78.12], ['Mayiladuthurai', 11.1, 79.65], ['Nagapattinam', 10.77, 79.84],
    ['Namakkal', 11.22, 78.17], ['Nilgiris', 11.41, 76.7], ['Perambalur', 11.23, 78.88], ['Pudukkottai', 10.38, 78.82],
    ['Ramanathapuram', 9.37, 78.83], ['Ranipet', 12.93, 79.33], ['Salem', 11.66, 78.15], ['Sivaganga', 9.85, 78.48],
    ['Tenkasi', 8.96, 77.3], ['Thanjavur', 10.79, 79.14], ['Theni', 10.01, 77.48], ['Thoothukudi', 8.76, 78.13],
    ['Tiruchirappalli', 10.79, 78.7], ['Tirunelveli', 8.71, 77.76], ['Tirupathur', 12.5, 78.57], ['Tiruppur', 11.11, 77.34],
    ['Tiruvallur', 13.14, 79.91], ['Tiruvannamalai', 12.23, 79.07], ['Tiruvarur', 10.77, 79.64], ['Vellore', 12.92, 79.13],
    ['Viluppuram', 11.94, 79.49], ['Virudhunagar', 9.58, 77.96],
  ],
  Karnataka: [['Bengaluru Urban', 12.97, 77.59], ['Mysuru', 12.3, 76.64], ['Dakshina Kannada', 12.91, 74.86], ['Belagavi', 15.85, 74.5], ['Kalaburagi', 17.33, 76.83], ['Dharwad', 15.46, 75.01]],
  Kerala: [['Thiruvananthapuram', 8.52, 76.94], ['Ernakulam', 9.98, 76.28], ['Kozhikode', 11.26, 75.78], ['Thrissur', 10.53, 76.21], ['Kannur', 11.87, 75.37]],
  'Andhra Pradesh': [['Visakhapatnam', 17.69, 83.22], ['NTR (Vijayawada)', 16.51, 80.65], ['Guntur', 16.31, 80.44], ['Tirupati', 13.63, 79.42], ['Kurnool', 15.83, 78.04]],
  Telangana: [['Hyderabad', 17.39, 78.49], ['Hanumakonda (Warangal)', 17.97, 79.59], ['Karimnagar', 18.44, 79.13], ['Nizamabad', 18.67, 78.1]],
  Maharashtra: [['Mumbai', 19.08, 72.88], ['Pune', 18.52, 73.86], ['Nagpur', 21.15, 79.09], ['Nashik', 20.0, 73.79]],
  Delhi: [['New Delhi', 28.61, 77.21], ['South Delhi', 28.53, 77.22], ['North Delhi', 28.7, 77.2]],
  'Uttar Pradesh': [['Lucknow', 26.85, 80.95], ['Varanasi', 25.32, 82.97], ['Kanpur Nagar', 26.45, 80.33], ['Agra', 27.18, 78.01]],
  'West Bengal': [['Kolkata', 22.57, 88.36], ['Howrah', 22.59, 88.31], ['Darjeeling', 27.04, 88.26]],
  Gujarat: [['Ahmedabad', 23.02, 72.57], ['Surat', 21.17, 72.83], ['Vadodara', 22.31, 73.18]],
  Rajasthan: [['Jaipur', 26.91, 75.79], ['Jodhpur', 26.24, 73.02], ['Udaipur', 24.59, 73.71]],
  Bihar: [['Patna', 25.59, 85.14], ['Gaya', 24.8, 85.0], ['Muzaffarpur', 26.12, 85.39]],
  Puducherry: [['Puducherry', 11.94, 79.81], ['Karaikal', 10.92, 79.84]],
};

export const districtsFor = (state: string) => (DISTRICTS[state] ?? []).map((d) => d[0]);

/** Nearest known district within ~120 km, or null. Runs fully offline. */
export function nearestDistrict(lat: number, lng: number): { state: string; district: string; km: number } | null {
  let best: { state: string; district: string; km: number } | null = null;
  for (const [state, list] of Object.entries(DISTRICTS)) {
    for (const [district, dlat, dlng] of list) {
      const km = haversine(lat, lng, dlat, dlng);
      if (!best || km < best.km) best = { state, district, km };
    }
  }
  return best && best.km < 120 ? best : null;
}

function haversine(a: number, b: number, c: number, d: number) {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
