# ERP Order Management System

A premium, professional Enterprise Resource Planning (ERP) system for managing knitting orders with a minimal, expensive design aesthetic.

## Design Philosophy

- **Minimal & Clean**: No shadows, only borders
- **Professional Color**: Navy Blue (#1A3567)
- **Consistent Rounded**: `rounded-md` throughout
- **Border Focus**: Subtle border opacity changes instead of rings
- **Full Width**: Content spans full available width
- **Icon System**: lucide-react for consistent iconography

## Features

✅ Create new orders with comprehensive form inputs  
✅ View all knitting orders in a clean table layout  
✅ Search and filter orders by buyer, job number, and style  
✅ Edit and delete existing orders  
✅ LocalStorage-based data persistence (ready for backend integration)  
✅ Fully responsive design for all devices  
✅ Collapsible sidebar on all screen sizes  
✅ Professional UI with smooth animations  
✅ Centralized color theme system  

## Technology Stack

- React 18
- React Router DOM
- Tailwind CSS
- Vite
- lucide-react (Icons)
- LocalStorage (temporary, ready for API integration)

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── Header.jsx
│   └── Modal.jsx
├── dashboard/
│   ├── pages/          # Dashboard pages
│   │   ├── Home.jsx
│   │   ├── KnittingOrders.jsx
│   │   └── NewOrder.jsx
│   └── Sidebar.jsx     # Navigation sidebar with toggle
├── routes/             # Route configuration
├── config/             # Theme configuration
└── utils/              # Utility functions (localStorage)
```

## Color Theme

The entire application uses a centralized color system based on **#1A3567** (Professional Navy Blue).

### To Change Primary Color:

1. Edit `tailwind.config.js`
2. Modify the `primary[500]` value
3. All UI elements will automatically update

```javascript
primary: {
  500: '#1A3567',  // Change this value
}
```

See `COLOR_GUIDE.md` for detailed instructions and professional color scheme examples.

## Design Elements

### Cards & Containers
```css
bg-white rounded-md border border-gray-200
```

### Input Fields
```css
border border-gray-200 rounded-md
focus:border-primary-500 focus:border-opacity-50
```

### Buttons
```css
bg-primary-500 text-white rounded-md border border-primary-600
hover:bg-primary-600
```

### Sidebar
```css
bg-primary-500 border-r border-gray-200
```

## Features in Detail

### Sidebar Navigation
- **Desktop**: Toggle button to collapse/expand
- **Mobile**: Hamburger menu with overlay
- **Icons**: lucide-react icons for all menu items
- **Active State**: White background with primary text color
- **Smooth Transitions**: 300ms ease-in-out animations

### Add New Order
- Date picker for work order placement
- Dropdown selects for buyer, month, and sales contract
- Text inputs for job number, PO number, style, color, and composition
- Form validation (all fields required)
- Auto-save to localStorage
- Automatic redirect to orders list after creation
- Save and Cancel buttons with icons

### Knitting Orders List
- Display all orders in a responsive table
- Search functionality by buyer, job number, and style
- Edit and delete actions with icon buttons
- Empty state with package icon when no orders exist
- Hover effects on table rows
- Minimal action buttons with icons

### Responsive Design

#### Mobile (320px - 768px)
- Hamburger menu for sidebar
- Full width content
- Vertical form layout
- Touch-friendly buttons (44px minimum)

#### Tablet (768px - 1024px)
- 2 column grid layout
- Visible sidebar
- Optimized spacing

#### Desktop (1024px+)
- 3 column grid layout
- Collapsible sidebar
- Full width content
- Hover effects enabled

## Icons Used

All icons from `lucide-react`:

- `LayoutDashboard` - Dashboard
- `Package` - Knitting Orders
- `Palette` - Yarn Dyeing Orders
- `FileText` - AOP Orders
- `PlusCircle` - Add New Order
- `Menu` / `X` - Mobile menu toggle
- `ChevronLeft` / `ChevronRight` - Sidebar toggle
- `Search` - Search functionality
- `Edit2` - Edit action
- `Trash2` - Delete action
- `Save` - Save button

## Data Storage

Currently using LocalStorage for data persistence. All storage functions are centralized in `src/utils/localStorage.js` for easy backend integration.

### Available Functions:
- `getOrders()` - Retrieve all orders
- `saveOrder(order)` - Save new order
- `updateOrder(id, data)` - Update existing order
- `deleteOrder(id)` - Delete order
- `searchOrders(filters)` - Search with filters

## Future Enhancements

- [ ] Backend API integration
- [ ] User authentication system
- [ ] Advanced filtering and sorting
- [ ] Export to Excel/PDF
- [ ] Order status tracking
- [ ] Multi-user support
- [ ] Real-time notifications
- [ ] Dark mode support
- [ ] Audit logs
- [ ] Batch operations

## Documentation

- `README.md` - This file (English)
- `BANGLA_GUIDE.md` - Complete guide in Bengali
- `COLOR_GUIDE.md` - Color customization guide

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

---

**Note**: This is a frontend-only application. For production use, integrate with a backend API and implement proper authentication and authorization.
