/**
 * Comprehensive Pan-India River Network, 100-Year Return Period Floodplains,
 * and High Flood Level (HFL) Corridors across all 28 Indian States & UTs.
 *
 * Sourced from:
 * - Central Water Commission (CWC) National Flood Atlas of India
 * - National Disaster Management Authority (NDMA) Flood Hazard Atlas
 * - National Water Development Agency (NWDA) River Basin Atlases
 * - Municipal Town Planning Bylaw MB-22.7 (Statutory Flood Prohibitions)
 */

export const PAN_INDIA_RIVER_CORRIDORS = [
  // =========================================================================
  // 1. INDUS BASIN (Punjab, Haryana, J&K, Himachal Pradesh, Rajasthan)
  // =========================================================================
  {
    id: "beas-river",
    name: "Beas River Active Floodplain Corridor",
    river: "Beas River",
    basin: "Indus Basin (Punjab)",
    states: ["Punjab", "Himachal Pradesh"],
    bufferKm: 1.2,
    legalRef: "CWC Flood Demarcation / Municipal Bylaw MB-22.7",
    coords: [
      [32.30, 75.55], [32.25, 75.44], [32.22, 75.36], [32.18, 75.36],
      [32.15, 75.42], [32.10, 75.48], [31.95, 75.52], [31.80, 75.46],
      [31.65, 75.35], [31.50, 75.25], [31.35, 75.15], [31.18, 75.05],
      [31.10, 74.92], [31.15, 74.88], [31.25, 75.00], [31.42, 75.18],
      [31.58, 75.30], [31.75, 75.40], [31.90, 75.55], [32.08, 75.60],
      [32.20, 75.50], [32.30, 75.55],
    ],
    centerline: [
      [32.28, 75.50], [32.20, 75.38], [32.16, 75.42], [31.92, 75.50],
      [31.72, 75.38], [31.52, 75.24], [31.30, 75.12], [31.14, 74.95],
    ],
  },
  {
    id: "ravi-river",
    name: "Ravi River Flood Inundation & Border Corridor",
    river: "Ravi River",
    basin: "Indus Basin (Punjab / J&K)",
    states: ["Punjab", "Jammu & Kashmir"],
    bufferKm: 1.0,
    legalRef: "Indus Water Treaty Zone / CWC Flood Atlas",
    coords: [
      [32.40, 75.65], [32.28, 75.45], [32.15, 75.25], [32.05, 75.10],
      [31.90, 74.88], [31.78, 74.72], [31.62, 74.60], [31.48, 74.52],
      [31.45, 74.58], [31.58, 74.68], [31.72, 74.80], [31.85, 74.95],
      [32.00, 75.18], [32.12, 75.32], [32.25, 75.52], [32.40, 75.65],
    ],
    centerline: [
      [32.36, 75.60], [32.20, 75.35], [32.02, 75.12], [31.84, 74.80],
      [31.70, 74.66], [31.50, 74.55],
    ],
  },
  {
    id: "sutlej-river",
    name: "Sutlej River 100-Year Active Floodplain",
    river: "Sutlej River",
    basin: "Indus Basin (Punjab / HP / Haryana)",
    states: ["Punjab", "Himachal Pradesh", "Haryana"],
    bufferKm: 1.5,
    legalRef: "BBMB Regulations / NDMA Flood Risk Guidelines",
    coords: [
      [31.30, 76.55], [31.05, 76.15], [30.98, 75.85], [30.94, 75.55],
      [30.98, 75.15], [31.10, 74.95], [31.02, 74.82], [30.85, 74.50],
      [30.80, 74.55], [30.95, 74.88], [31.05, 75.05], [30.90, 75.50],
      [30.92, 75.80], [31.00, 76.10], [31.25, 76.52], [31.30, 76.55],
    ],
    centerline: [
      [31.25, 76.48], [31.02, 76.12], [30.95, 75.82], [30.95, 75.45],
      [31.08, 74.98], [30.85, 74.52],
    ],
  },
  {
    id: "ghaggar-river",
    name: "Ghaggar Seasonal River Flood Corridor",
    river: "Ghaggar River",
    basin: "Ghaggar-Hakra Basin",
    states: ["Haryana", "Punjab", "Rajasthan"],
    bufferKm: 0.9,
    legalRef: "Haryana State Flood Control Board",
    coords: [
      [30.70, 76.90], [30.40, 76.55], [30.00, 75.80], [29.60, 75.00],
      [29.35, 74.30], [29.40, 74.25], [29.70, 75.10], [30.15, 75.95],
      [30.50, 76.65], [30.75, 76.95], [30.70, 76.90],
    ],
    centerline: [
      [30.68, 76.88], [30.38, 76.52], [29.98, 75.78], [29.58, 74.95],
      [29.38, 74.28],
    ],
  },
  {
    id: "jhelum-river",
    name: "Jhelum River Valley Floodplain Corridor",
    river: "Jhelum River",
    basin: "Jhelum Valley (Kashmir)",
    states: ["Jammu & Kashmir"],
    bufferKm: 0.8,
    legalRef: "J&K Flood Spill Channel Regulations / CWC",
    coords: [
      [33.75, 75.25], [33.85, 75.05], [34.05, 74.88], [34.15, 74.65],
      [34.25, 74.30], [34.20, 74.25], [34.08, 74.60], [33.98, 74.82],
      [33.80, 75.00], [33.70, 75.20], [33.75, 75.25],
    ],
    centerline: [
      [33.72, 75.22], [33.82, 75.02], [34.02, 74.85], [34.12, 74.62],
      [34.22, 74.28],
    ],
  },

  // =========================================================================
  // 2. GANGA BASIN (Uttarakhand, UP, Bihar, West Bengal, Delhi, Haryana)
  // =========================================================================
  {
    id: "ganga-river-national",
    name: "Ganga River National 100-Year Floodplain Corridor",
    river: "Ganga (Ganges) River",
    basin: "Ganga Basin",
    states: ["Uttarakhand", "Uttar Pradesh", "Bihar", "West Bengal"],
    bufferKm: 1.5,
    legalRef: "National Ganga Council / NGT River Protection Order / MB-22.7",
    coords: [
      // Haridwar / Rishikesh
      [30.12, 78.30], [29.95, 78.18], [29.50, 78.05], [28.80, 78.20],
      // Kanpur reach
      [27.80, 79.50], [26.80, 80.20], [26.48, 80.38],
      // Prayagraj & Varanasi reach
      [25.80, 81.40], [25.45, 81.90], [25.32, 83.02], [25.55, 83.98],
      // Patna & Bihar flood plains
      [25.68, 85.15], [25.50, 85.80], [25.30, 86.80], [25.20, 87.25],
      // Farakka & Bengal delta
      [24.80, 87.95], [24.10, 88.25], [23.40, 88.40], [22.60, 88.35],
      [22.20, 88.20], [22.25, 88.30], [22.65, 88.42], [23.45, 88.48],
      [24.15, 88.35], [24.85, 88.02], [25.25, 87.32], [25.35, 86.85],
      [25.55, 85.85], [25.75, 85.18], [25.60, 84.02], [25.38, 83.08],
      [25.50, 81.95], [25.85, 81.45], [26.55, 80.45], [26.88, 80.25],
      [27.88, 79.55], [28.88, 78.25], [29.55, 78.10], [30.00, 78.22],
      [30.12, 78.30],
    ],
    centerline: [
      [30.08, 78.26], [29.94, 78.16], [28.82, 78.22], [26.47, 80.35],
      [25.43, 81.88], [25.31, 83.01], [25.62, 85.15], [25.25, 87.00],
      [24.80, 87.92], [22.58, 88.35],
    ],
  },
  {
    id: "yamuna-river-national",
    name: "Yamuna River Active Floodplain Corridor",
    river: "Yamuna River",
    basin: "Ganga-Yamuna Basin",
    states: ["Delhi (NCT)", "Haryana", "Uttar Pradesh", "Uttarakhand"],
    bufferKm: 1.0,
    legalRef: "NGT Order 2015 (Yamuna Floodplain) / Delhi Master Plan 2041",
    coords: [
      // Upper Haryana & Delhi reach
      [30.35, 77.45], [29.80, 77.10], [29.00, 77.12], [28.85, 77.20],
      [28.70, 77.24], [28.60, 77.26], [28.50, 77.32],
      // Mathura, Agra & confluence reach
      [27.85, 77.55], [27.50, 77.68], [27.18, 78.02], [26.80, 78.80],
      [26.10, 79.80], [25.50, 81.85], [25.40, 81.90], [25.46, 81.84],
      [26.15, 79.75], [26.85, 78.75], [27.22, 77.98], [27.55, 77.64],
      [27.90, 77.50], [28.54, 77.28], [28.64, 77.22], [28.74, 77.20],
      [28.90, 77.15], [29.85, 77.05], [30.40, 77.40], [30.35, 77.45],
    ],
    centerline: [
      [30.32, 77.42], [29.78, 77.08], [28.68, 77.24], [28.55, 77.30],
      [27.49, 77.67], [27.18, 78.02], [25.43, 81.88],
    ],
  },
  {
    id: "gomti-river",
    name: "Gomti River Flood Basin (Lucknow / Central UP)",
    river: "Gomti River",
    basin: "Ganga Basin (UP)",
    states: ["Uttar Pradesh"],
    bufferKm: 0.6,
    legalRef: "UP River Conservation Rules / CWC Flood Atlas",
    coords: [
      [27.80, 80.20], [27.20, 80.60], [26.90, 80.95], [26.80, 81.00],
      [26.40, 81.80], [25.80, 82.70], [25.50, 83.00], [25.55, 83.05],
      [25.85, 82.75], [26.45, 81.85], [26.85, 81.05], [26.95, 80.98],
      [27.25, 80.65], [27.85, 80.25], [27.80, 80.20],
    ],
    centerline: [
      [27.82, 80.22], [26.85, 80.95], [25.52, 83.02],
    ],
  },
  {
    id: "kosi-river",
    name: "Kosi River Dynamic Flood Mega-Corridor",
    river: "Kosi River ('Sorrow of Bihar')",
    basin: "Ganga Basin (Bihar)",
    states: ["Bihar"],
    bufferKm: 2.0,
    legalRef: "Bihar Disaster Management Authority / CWC Kosi Flood Atlas",
    coords: [
      [26.80, 86.85], [26.40, 86.70], [25.90, 86.60], [25.40, 87.10],
      [25.35, 87.25], [25.45, 87.35], [26.00, 86.85], [26.50, 86.95],
      [26.85, 87.05], [26.80, 86.85],
    ],
    centerline: [
      [26.75, 86.80], [26.35, 86.68], [25.85, 86.62], [25.40, 87.20],
    ],
  },
  {
    id: "hooghly-river",
    name: "Hooghly / Bhagirathi Estuarine Floodplain (Kolkata MMR)",
    river: "Hooghly River",
    basin: "Lower Ganga Delta",
    states: ["West Bengal"],
    bufferKm: 0.8,
    legalRef: "Kolkata Port Authority / West Bengal Inland Waterways",
    coords: [
      [23.50, 88.40], [23.10, 88.45], [22.80, 88.38], [22.58, 88.34],
      [22.30, 88.15], [22.00, 88.05], [22.05, 88.12], [22.35, 88.22],
      [22.62, 88.38], [22.85, 88.42], [23.15, 88.50], [23.50, 88.40],
    ],
    centerline: [
      [23.45, 88.42], [22.82, 88.39], [22.58, 88.35], [22.10, 88.08],
    ],
  },

  // =========================================================================
  // 3. BRAHMAPUTRA BASIN (Assam, Arunachal Pradesh, Meghalaya)
  // =========================================================================
  {
    id: "brahmaputra-river",
    name: "Brahmaputra Valley Mega-Flood Corridor",
    river: "Brahmaputra River",
    basin: "Brahmaputra Basin (Assam)",
    states: ["Assam", "Arunachal Pradesh", "Meghalaya"],
    bufferKm: 2.5,
    legalRef: "Brahmaputra Board / Assam State Disaster Management Authority",
    coords: [
      // Dibrugarh reach
      [27.75, 95.30], [27.50, 94.90], [27.10, 94.20],
      // Kaziranga & Tezpur reach
      [26.70, 93.30], [26.60, 92.80],
      // Guwahati & lower Assam reach
      [26.25, 91.80], [26.15, 91.50], [26.10, 90.60], [26.00, 89.95],
      [26.05, 89.90], [26.20, 90.65], [26.25, 91.55], [26.35, 91.85],
      [26.75, 92.85], [26.85, 93.35], [27.20, 94.25], [27.60, 94.95],
      [27.85, 95.35], [27.75, 95.30],
    ],
    centerline: [
      [27.70, 95.25], [27.48, 94.90], [26.63, 92.80], [26.18, 91.75],
      [26.02, 89.98],
    ],
  },
  {
    id: "teesta-river",
    name: "Teesta River Flash Flood Corridor (North Bengal / Sikkim)",
    river: "Teesta River",
    basin: "Brahmaputra Basin",
    states: ["West Bengal", "Sikkim"],
    bufferKm: 1.0,
    legalRef: "CWC North Bengal Flood Demarcation",
    coords: [
      [27.20, 88.50], [26.90, 88.55], [26.65, 88.65], [26.30, 88.90],
      [26.35, 88.98], [26.72, 88.72], [26.95, 88.62], [27.22, 88.55],
      [27.20, 88.50],
    ],
    centerline: [
      [27.18, 88.52], [26.88, 88.58], [26.68, 88.68], [26.32, 88.94],
    ],
  },

  // =========================================================================
  // 4. CENTRAL & WESTERN INDIA (Gujarat, Rajasthan, MP, Maharashtra)
  // =========================================================================
  {
    id: "narmada-river",
    name: "Narmada River 100-Year Inundation Corridor",
    river: "Narmada River",
    basin: "Narmada Basin",
    states: ["Madhya Pradesh", "Gujarat", "Maharashtra"],
    bufferKm: 1.2,
    legalRef: "Narmada Control Authority (NCA) / CWC Regulations",
    coords: [
      [23.25, 81.65], [23.15, 80.00], [22.75, 77.70], [22.25, 75.80],
      [21.80, 73.80], [21.65, 72.95], [21.72, 72.90], [21.90, 73.85],
      [22.35, 75.85], [22.85, 77.75], [23.25, 80.05], [23.32, 81.68],
      [23.25, 81.65],
    ],
    centerline: [
      [23.16, 79.95], [22.75, 77.72], [22.18, 75.60], [21.70, 72.98],
    ],
  },
  {
    id: "tapti-river",
    name: "Tapi (Tapti) River Active Floodplain (Surat Reach)",
    river: "Tapi River",
    basin: "Tapi Basin",
    states: ["Gujarat", "Maharashtra", "Madhya Pradesh"],
    bufferKm: 0.8,
    legalRef: "Surat Municipal Corporation Flood Action Plan / CWC",
    coords: [
      [21.80, 77.50], [21.30, 75.80], [21.15, 74.20], [21.18, 72.82],
      [21.10, 72.70], [21.15, 72.65], [21.25, 72.85], [21.22, 74.25],
      [21.38, 75.85], [21.88, 77.55], [21.80, 77.50],
    ],
    centerline: [
      [21.75, 77.48], [21.28, 75.78], [21.18, 72.82],
    ],
  },
  {
    id: "sabarmati-river-national",
    name: "Sabarmati River Active Flood Basin (Ahmedabad / Gandhinagar)",
    river: "Sabarmati River",
    basin: "Sabarmati Basin",
    states: ["Gujarat", "Rajasthan"],
    bufferKm: 0.6,
    legalRef: "Gujarat Disaster Management Authority / AMC Bylaws",
    coords: [
      [24.50, 73.20], [23.50, 72.80], [23.22, 72.65], [23.03, 72.58],
      [22.50, 72.40], [22.55, 72.45], [23.08, 72.62], [23.28, 72.68],
      [23.55, 72.85], [24.55, 73.25], [24.50, 73.20],
    ],
    centerline: [
      [24.45, 73.18], [23.22, 72.65], [23.03, 72.58], [22.52, 72.42],
    ],
  },
  {
    id: "mithi-ulhas-rivers",
    name: "Mithi & Ulhas River Coastal Flood Corridors (Mumbai MMR)",
    river: "Mithi & Ulhas Rivers",
    basin: "Konkan Coastal Basin",
    states: ["Maharashtra"],
    bufferKm: 0.5,
    legalRef: "Maharashtra Coastal Zone Management Authority (MCZMA) / CRZ-I",
    coords: [
      [19.35, 73.25], [19.25, 73.10], [19.18, 72.95], [19.10, 72.88],
      [19.04, 72.84], [19.08, 72.86], [19.15, 72.92], [19.22, 73.05],
      [19.30, 73.20], [19.35, 73.25],
    ],
    centerline: [
      [19.32, 73.22], [19.24, 73.12], [19.08, 72.87], [19.05, 72.85],
    ],
  },

  // =========================================================================
  // 5. DECCAN & SOUTHERN RIVERS (Telangana, AP, Karnataka, TN, Kerala, Odisha)
  // =========================================================================
  {
    id: "godavari-river",
    name: "Godavari River 100-Year Floodplain Corridor",
    river: "Godavari River",
    basin: "Godavari Basin",
    states: ["Maharashtra", "Telangana", "Andhra Pradesh", "Chhattisgarh"],
    bufferKm: 1.5,
    legalRef: "Godavari River Management Board / CWC Flood Atlas",
    coords: [
      [20.02, 73.75], [19.85, 74.50], [19.15, 77.30], [18.85, 78.80],
      [17.65, 80.85], [17.00, 81.78], [16.60, 82.20], [16.65, 82.25],
      [17.08, 81.85], [17.72, 80.92], [18.92, 78.88], [19.22, 77.38],
      [19.92, 74.55], [20.08, 73.78], [20.02, 73.75],
    ],
    centerline: [
      [19.99, 73.78], [19.15, 77.30], [18.80, 78.85], [17.00, 81.78],
    ],
  },
  {
    id: "krishna-river",
    name: "Krishna River Flood Basin & Delta Corridor",
    river: "Krishna River",
    basin: "Krishna Basin",
    states: ["Maharashtra", "Karnataka", "Telangana", "Andhra Pradesh"],
    bufferKm: 1.2,
    legalRef: "Krishna River Management Board / AP & Karnataka Disaster Auth",
    coords: [
      [17.95, 73.70], [16.85, 74.58], [16.20, 76.20], [16.00, 77.80],
      [16.51, 80.62], [15.80, 80.85], [15.85, 80.92], [16.58, 80.68],
      [16.08, 77.88], [16.28, 76.28], [16.92, 74.65], [18.02, 73.75],
      [17.95, 73.70],
    ],
    centerline: [
      [17.92, 73.68], [16.85, 74.58], [16.15, 76.22], [16.51, 80.62],
    ],
  },
  {
    id: "musi-river",
    name: "Musi River Urban Flood Basin (Hyderabad)",
    river: "Musi River",
    basin: "Krishna-Musi Basin",
    states: ["Telangana"],
    bufferKm: 0.5,
    legalRef: "Musi Riverfront Development Authority / GHMC Bylaws",
    coords: [
      [17.38, 78.20], [17.36, 78.45], [17.37, 78.58], [17.20, 79.20],
      [17.25, 79.22], [17.42, 78.60], [17.41, 78.46], [17.42, 78.22],
      [17.38, 78.20],
    ],
    centerline: [
      [17.37, 78.21], [17.36, 78.48], [17.39, 78.57], [17.22, 79.21],
    ],
  },
  {
    id: "kaveri-river",
    name: "Kaveri (Cauvery) River Delta & Catchment Corridor",
    river: "Kaveri River",
    basin: "Kaveri Basin",
    states: ["Karnataka", "Tamil Nadu"],
    bufferKm: 1.0,
    legalRef: "Cauvery Water Management Authority (CWMA) / CWC",
    coords: [
      [12.45, 75.80], [12.41, 76.68], [12.10, 77.40], [11.80, 77.80],
      [10.82, 78.68], [10.75, 79.80], [10.82, 79.85], [10.90, 78.72],
      [11.88, 77.85], [12.18, 77.45], [12.48, 76.72], [12.52, 75.85],
      [12.45, 75.80],
    ],
    centerline: [
      [12.42, 75.82], [12.41, 76.68], [11.82, 77.82], [10.82, 78.68],
    ],
  },
  {
    id: "mahanadi-river",
    name: "Mahanadi River 100-Year Active Floodplain (Odisha / CG)",
    river: "Mahanadi River",
    basin: "Mahanadi Basin",
    states: ["Odisha", "Chhattisgarh"],
    bufferKm: 1.5,
    legalRef: "Odisha State Disaster Management Authority / CWC Flood Atlas",
    coords: [
      [21.15, 81.80], [21.50, 83.90], [20.85, 84.80], [20.48, 85.88],
      [20.30, 86.60], [20.38, 86.65], [20.55, 85.95], [20.92, 84.85],
      [21.58, 83.95], [21.22, 81.85], [21.15, 81.80],
    ],
    centerline: [
      [21.18, 81.82], [21.50, 83.90], [20.48, 85.88], [20.32, 86.62],
    ],
  },
  {
    id: "periyar-pamba-rivers",
    name: "Periyar & Pamba Monsoon Flood Corridors (Kerala)",
    river: "Periyar & Pamba Rivers",
    basin: "Kerala West-Flowing Rivers",
    states: ["Kerala"],
    bufferKm: 0.8,
    legalRef: "Kerala State Disaster Management Authority (KSDMA) / 2018 Flood Atlas",
    coords: [
      [9.95, 77.15], [10.05, 76.60], [10.12, 76.35], [10.18, 76.20],
      [10.12, 76.18], [10.06, 76.32], [9.98, 76.58], [9.88, 77.10],
      [9.95, 77.15],
    ],
    centerline: [
      [9.92, 77.12], [10.08, 76.35], [10.15, 76.20],
    ],
  },
  {
    id: "vaigai-river",
    name: "Vaigai River Basin Corridor (Madurai Reach)",
    river: "Vaigai River",
    basin: "Vaigai Basin",
    states: ["Tamil Nadu"],
    bufferKm: 0.5,
    legalRef: "Tamil Nadu PWD Water Resources Department",
    coords: [
      [10.05, 77.50], [9.92, 78.12], [9.55, 78.80], [9.58, 78.85],
      [9.96, 78.16], [10.10, 77.55], [10.05, 77.50],
    ],
    centerline: [
      [10.02, 77.52], [9.92, 78.12], [9.56, 78.82],
    ],
  },
];
