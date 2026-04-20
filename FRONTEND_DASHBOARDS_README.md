# Hospital Frontend-Decoupled Dashboards Integration

This document outlines the integration of the 5 hospital dashboards (Doctor, Lab, Pharmacy, Reception, Portal) as **frontend-decoupled components** in Odoo 18.

## Overview

The integration follows a **frontend-decoupled architecture** where the dashboards are served as standalone web pages that communicate with Odoo's backend via **JSON-RPC API** instead of using OWL components directly.

**Key Benefits:**
- 🎯 Clean separation of frontend and backend
- 🔄 Full preservation of original button functionality
- 📡 Communication via JSON-RPC `/web/dataset/call_kw` endpoint
- 🎨 Complete control over UI/UX without Odoo backend limitations
- 📱 Responsive design with modern CSS
- ⚡ Fast loading and independent frontend updates

## Architecture

### File Structure

```
addons/base_hospital_management/
├── controllers/
│   ├── __init__.py              # Updated to import frontend_dashboards
│   ├── frontend_dashboards.py   # NEW: Routes for 5 dashboards
│   ├── patient_booking.py
│   ├── portal.py
│   └── view_portal.py
├── static/src/
│   ├── css/
│   │   ├── doctor_dashboard.css           # NEW: Copied from design/
│   │   ├── hospital_portal.css            # NEW: Portal styling
│   │   ├── lab_dashboard.css              # NEW
│   │   ├── pharmacy_dashboard_modern.css  # NEW
│   │   ├── reception_dashboard.css        # NEW
│   │   └── [existing OWL CSS files]
│   └── js/
│       ├── hospital_api_helper.js         # NEW: JSON-RPC wrapper
│       ├── doctor_dashboard_frontend.js   # NEW: Doctor dashboard
│       ├── lab_dashboard_frontend.js      # NEW: Lab dashboard
│       ├── pharmacy_dashboard_frontend.js # NEW: Pharmacy dashboard
│       ├── reception_dashboard_frontend.js # NEW: Reception dashboard
│       ├── hospital_portal_frontend.js    # NEW: Hospital portal
│       └── [existing OWL JS files]
├── views/
│   ├── frontend_dashboards_templates.xml  # NEW: Template wrappers
│   └── [existing template files]
├── __manifest__.py               # Updated with new assets & routes
└── [existing model files]
```

### 5 Dashboard Routes

| Dashboard | Route | Class | User Type |
|-----------|-------|-------|-----------|
| Doctor Dashboard | `/hospital/doctor` | DoctorDashboardFrontend | Doctors |
| Lab Dashboard | `/hospital/lab` | LabDashboardFrontend | Lab Technicians |
| Pharmacy Dashboard | `/hospital/pharmacy` | PharmacyDashboardFrontend | Pharmacists |
| Reception Dashboard | `/hospital/reception` | ReceptionDashboardFrontend | Reception Staff |
| Hospital Portal | `/hospital/portal` | HospitalPortalFrontend | Patients |

## JSON-RPC API Communication

### API Helper (`hospital_api_helper.js`)

All frontend dashboards use the `HospitalOdooAPI` class for backend communication:

```javascript
import { HospitalOdooAPI } from './hospital_api_helper.js';

const api = new HospitalOdooAPI();

// Search records
const records = await api.searchRead('hospital.outpatient', 
    [['op_date', '=', '2024-01-15']], 
    ['patient_id', 'symptoms', 'state']
);

// Count records
const count = await api.searchCount('hospital.inpatient', [['state', '=', 'admit']]);

// Call custom methods
const result = await api.call('hospital.outpatient', 'get_dashboard_statistics', []);
```

### JSON-RPC Request Format

```json
{
    "jsonrpc": "2.0",
    "method": "call",
    "params": {
        "service": "object",
        "args": ["model.name", "method_name", ...args],
        "kwargs": {...}
    },
    "id": "unique_id"
}
```

## Dashboard Features

### 1. Doctor Dashboard (/hospital/doctor)

**File:** `doctor_dashboard_frontend.js`

**Features:**
- ✅ Patient statistics (total, consultations today, inpatients, allocations)
- ✅ Monthly consultation chart (Chart.js)
- ✅ Admission type distribution (doughnut chart)
- ✅ Weekly workload charts
- ✅ Recent activities list
- ✅ Preserved button functions:
  - `fetch_consultation()` - Get today's consultations
  - `list_patient_data()` - List all patients
  - `action_list_inpatient()` - List active inpatients
  - `fetch_doctors_schedule()` - Get doctor schedule
  - `fetch_allocation_lines()` - Get doctor slots

**Key Models Used:**
- `res.partner` - Patient data
- `hospital.outpatient` - Consultations
- `hospital.inpatient` - Inpatient admissions
- `doctor.allocation` - Doctor allocations
- `doctor.slot` - Doctor time slots

### 2. Lab Dashboard (/hospital/lab)

**File:** `lab_dashboard_frontend.js`

**Features:**
- ✅ Lab statistics (pending tests, completed, processed samples)
- ✅ Multi-view system:
  - Main View: All test lines
  - In Process: Tests being processed
  - Published Results: Completed results
  - Analytics: Statistical charts
- ✅ Test processing interface
- ✅ Sidebar menu navigation

**Key Models Used:**
- `patient.lab.test` - Lab tests
- `lab.test.line` - Individual test lines

### 3. Pharmacy Dashboard (/hospital/pharmacy)

**File:** `pharmacy_dashboard_frontend.js`

**Features:**
- ✅ 4 KPI cards (inventory, low stock, prescriptions, pending orders)
- ✅ Real-time alerts for low stock items
- ✅ Inventory management table
- ✅ Medicine ordering system
- ✅ Financial tracking (with Chart.js)
- ✅ Sidebar navigation for different sections

**Key Models Used:**
- `hospital.pharmacy` - Pharmacy inventory
- `stock.picking` - Stock orders

### 4. Reception Dashboard (/hospital/reception)

**File:** `reception_dashboard_frontend.js`

**Features:**
- ✅ Patient registration form
- ✅ Appointment management (create, view, check-in, cancel)
- ✅ Room/Ward assignment
- ✅ Today's appointment list
- ✅ Room availability tracking
- ✅ Multi-section navigation

**Key Models Used:**
- `res.partner` - Patient data
- `hospital.outpatient` - Outpatient appointments
- `hospital.inpatient` - Inpatient admissions
- `hospital.patient.room` - Room management
- `hospital.ward` - Ward management

### 5. Hospital Portal (/hospital/portal)

**File:** `hospital_portal_frontend.js`

**Features:**
- ✅ Patient self-service portal
- ✅ View appointments
- ✅ Download lab results
- ✅ View prescriptions
- ✅ Access medical records
- ✅ Update profile information
- ✅ Activity history

**Key Models Used:**
- `res.partner` - Patient profile
- `hospital.outpatient` - Appointments
- `patient.lab.test` - Lab results
- `clinic.patient.prescription` - Prescriptions
- `hospital.patient.record` - Medical records

## Button Preservation

All original button functionality has been preserved:

### Doctor Dashboard Buttons
```javascript
fetch_consultation()          // Get today's consultations
list_patient_data()          // List all patients
action_list_inpatient()      // List active inpatients
fetch_doctors_schedule()     // Get doctor schedule
fetch_allocation_lines()     // Get doctor time slots
```

Each button calls the appropriate JSON-RPC API to fetch data from Odoo without requiring OWL components.

## Implementation Details

### Template Wrapper (`frontend_dashboards_templates.xml`)

Each dashboard is wrapped in a pseudo `web.layout` template:

```xml
<template id="hospital_doctor_dashboard" name="Doctor Dashboard">
    <t t-call="web.layout">
        <t t-set="head_">
            <title>Doctor Dashboard - Hospital Management</title>
            <link rel="stylesheet" href="/base_hospital_management/static/src/css/doctor_dashboard.css"/>
        </t>
        <div id="hospital-dashboard-doctor" class="hospital-dashboard">
            <!-- Dashboard content populated by JS -->
        </div>
        <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script type="module" src="/base_hospital_management/static/src/js/doctor_dashboard_frontend.js"></script>
    </t>
</template>
```

### CSS Scoping

All CSS selectors are scoped under dashboard-specific IDs:
- `#hospital-dashboard-doctor`
- `#hospital-dashboard-lab`
- `#hospital-dashboard-pharmacy`
- `#hospital-dashboard-reception`
- `#hospital-dashboard-portal`

This prevents styling conflicts with Odoo's main interface.

### Controller Routes (`controllers/frontend_dashboards.py`)

```python
@http.route('/hospital/doctor', type='http', auth="user", website=True)
def doctor_dashboard(self):
    """Doctor Dashboard - Route for doctor-specific dashboard"""
    if not self._check_access('base_hospital_management.group_hospital_doctor'):
        return request.redirect('/web/login')
    
    values = {
        'user': request.env.user.name,
        'user_email': request.env.user.email,
    }
    return request.render(
        "base_hospital_management.hospital_doctor_dashboard", values)
```

## CSS Color Scheme

### Odoo Standard Colors (Doctor, Lab, Reception)
```css
--odoo-primary: #714B67;    /* Odoo purple */
--odoo-secondary: #875A7B;
--odoo-accent: #D4A5C3;
```

### Portal Colors
```css
--primary-color: #017E84;   /* Teal */
--secondary-color: #00A09D;
--accent-color: #875A7B;
```

### Pharmacy Colors
```css
--plum: #5C3D5E;
--teal: #0D9E8A;
--red: #C0392B;
--orange: #D35400;
```

## Usage Instructions

### For Users

1. **Doctor Dashboard**: Navigate to `/hospital/doctor` to view consultations and patient data
2. **Lab Dashboard**: Navigate to `/hospital/lab` to manage lab tests
3. **Pharmacy Dashboard**: Navigate to `/hospital/pharmacy` to manage inventory
4. **Reception Dashboard**: Navigate to `/hospital/reception` to register patients and manage appointments
5. **Hospital Portal**: Patients navigate to `/hospital/portal` for self-service access

### For Developers

1. **Edit Frontend Code**: Modify JS files in `static/src/js/`
2. **Edit Styles**: Modify CSS files in `static/src/css/`
3. **Add Features**: Update the dashboard classes (e.g., `DoctorDashboardFrontend`)
4. **API Calls**: Use `HospitalOdooAPI` class for backend communication
5. **Restart Odoo**: `./odoo-bin --dev=reload` to reload assets

## Performance Considerations

- **Lazy Loading**: Dashboards load data on demand via JSON-RPC
- **Caching**: Implement caching strategies in the API helper if needed
- **Chart.js**: Loaded from CDN for optimal performance
- **CSS Utilities**: Minimal CSS with CSS Variables for theming

## Security

- All routes require authentication (`auth="user"`)
- Access control checks via group membership
- JSON-RPC calls inherit Odoo's ORM security rules
- CSRF protection via Odoo's default mechanisms

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox support required
- ES6 Module syntax (fetch API, async/await)
- Chart.js compatibility (IE11+ with polyfills)

## Troubleshooting

### Dashboard Not Loading
1. Check browser console for JS errors
2. Verify routes are registered: `GET /hospital/doctor`
3. Check module is installed and assets are compiled

### API Calls Failing
1. Verify model permissions in security rules
2. Check JSON-RPC endpoint: `/web/dataset/call_kw`
3. Use browser DevTools Network tab to inspect requests

### Styling Issues
1. Check CSS scoping ID matches (e.g., `#hospital-dashboard-doctor`)
2. Verify CSS files are loaded in browser DevTools
3. Clear browser cache (Ctrl+Shift+Delete)

### Charts Not Displaying
1. Verify Chart.js CDN link is accessible
2. Check canvas element IDs match JS references
3. Verify data is being fetched from API

## Future Enhancements

- [ ] Real-time data updates via WebSocket
- [ ] Export functionality (PDF, Excel)
- [ ] User preferences and customization
- [ ] Mobile app integration
- [ ] Advanced analytics and reporting
- [ ] Notification system
- [ ] Role-based dashboard customization

## File Summary

| File | Purpose | Lines |
|------|---------|-------|
| hospital_api_helper.js | JSON-RPC API wrapper | ~150 |
| doctor_dashboard_frontend.js | Doctor dashboard component | ~400 |
| lab_dashboard_frontend.js | Lab dashboard component | ~350 |
| pharmacy_dashboard_frontend.js | Pharmacy dashboard component | ~380 |
| reception_dashboard_frontend.js | Reception dashboard component | ~450 |
| hospital_portal_frontend.js | Hospital portal component | ~500 |
| frontend_dashboards_templates.xml | Template wrappers | ~200 |
| frontend_dashboards.py | Controller routes | ~100 |

**Total New Code**: ~2,530 lines (excluding CSS)

## Support & Contact

For issues or feature requests, refer to the Odoo Hospital Management module documentation.

---

**Module Version**: 18.0.1.0.0  
**Last Updated**: 2024  
**Architecture**: Frontend-Decoupled with JSON-RPC API
