# ERP System - Features Documentation

## Design Improvements

### Sidebar Enhancements
✅ **Header Background**: Lighter shade (bg-primary-600) for better contrast  
✅ **Border Visibility**: Changed to border-primary-700 for better visibility  
✅ **Toggle Button Position**: Positioned at top-right corner of sidebar header  
✅ **Mobile Toggle**: Fixed position with proper icon placement  
✅ **Active State**: Uses primary-400 (lighter shade) instead of white  
✅ **Smooth Transitions**: 300ms ease-in-out for all state changes  

### Fixed Header System
✅ **Sticky Navigation**: Header stays fixed while scrolling  
✅ **Dynamic Titles**: Page title changes based on current route  
✅ **Consistent Spacing**: Proper padding and margins throughout  

### Reusable Components

#### Input Component (`src/components/Input.jsx`)
- Supports text, date, and select inputs
- Consistent styling across all forms
- Built-in label and required field indicator
- Border-gray-200 for all inputs
- Focus state with border-primary-500 opacity

**Usage:**
```jsx
<Input
  label="Field Name"
  name="fieldName"
  type="text" // or "date" or "select"
  value={value}
  onChange={handleChange}
  required={true}
  placeholder="Enter value"
  options={[]} // For select type
/>
```

#### DashboardLayout Component (`src/components/DashboardLayout.jsx`)
- Fixed header with dynamic title
- Consistent layout wrapper
- Proper spacing and borders

**Usage:**
```jsx
<DashboardLayout title="Page Title">
  {/* Your content here */}
</DashboardLayout>
```

## Color System

### Primary Color: #1A3567
- **50**: #e8eef7 (Lightest - backgrounds)
- **100**: #d1ddef
- **200**: #a3bbe0 (Borders, hover states)
- **300**: #7599d0
- **400**: #4777c1 (Active sidebar items)
- **500**: #1A3567 (Main color - buttons, sidebar)
- **600**: #152a52 (Sidebar header)
- **700**: #10203e (Borders)
- **800**: #0b1529
- **900**: #050b15 (Darkest)

## Sidebar Features

### Desktop View
- **Width**: 256px (expanded), 80px (collapsed)
- **Toggle**: Top-right corner of header
- **Icons**: ChevronLeft (expanded), ChevronRight (collapsed)
- **Active State**: bg-primary-400 with white text
- **Hover State**: bg-primary-600

### Mobile View
- **Toggle Button**: Fixed at top-left (outside sidebar)
- **Close Button**: Top-right inside sidebar header
- **Overlay**: Semi-transparent black background
- **Animation**: Slide from left with smooth transition

## Form System

### Input Fields
- **Border**: border-gray-200
- **Focus**: border-primary-500 with 50% opacity
- **Rounded**: rounded-md
- **Padding**: px-4 py-2.5

### Select Dropdowns
- **Background**: bg-white
- **Border**: border-gray-200
- **Options**: Properly styled with consistent spacing

### Buttons
- **Primary**: bg-primary-500 hover:bg-primary-600
- **Secondary**: bg-white hover:bg-gray-50
- **Border**: Consistent with background color
- **Icons**: lucide-react icons with 18px size

## Page Layouts

### Dashboard (Home)
- Stats cards with icons
- Factory buttons grid
- Recent orders table
- All using DashboardLayout wrapper

### Add New Order
- 3-column grid on desktop
- 2-column on tablet
- 1-column on mobile
- Reusable Input components
- Save and Cancel buttons with icons

### Knitting Orders
- Search section with 4 inputs
- Responsive table
- Edit and Delete actions with icons
- Empty state with Package icon

## Responsive Breakpoints

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md, lg)
- **Desktop**: > 1024px (lg, xl)

## Icons Used (lucide-react)

### Navigation
- LayoutDashboard
- Package
- Palette
- FileText
- PlusCircle

### Actions
- Save
- X (Cancel/Close)
- Search
- Edit2
- Trash2

### Toggle
- Menu
- ChevronLeft
- ChevronRight

### Stats
- TrendingUp
- Users
- DollarSign

## Best Practices

1. **Always use Input component** for form fields
2. **Wrap pages with DashboardLayout** for consistent headers
3. **Use primary color shades** for different states
4. **Keep borders minimal** (border-gray-200)
5. **No shadows** - only borders for depth
6. **Rounded corners** - always rounded-md
7. **Icons** - 18-20px for buttons, 24px for stats

## Future Enhancements

- [ ] Add loading states
- [ ] Implement toast notifications
- [ ] Add form validation feedback
- [ ] Create more reusable components
- [ ] Add keyboard shortcuts
- [ ] Implement search functionality
- [ ] Add export features
