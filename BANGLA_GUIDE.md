# ERP Order Management System - বাংলা গাইড

## প্রজেক্ট সম্পর্কে

এটি একটি premium, professional Enterprise Resource Planning (ERP) সিস্টেম যা knitting order management এর জন্য তৈরি করা হয়েছে।

## নতুন Features

### ✅ Sidebar Improvements
- Header এ lighter background color (bg-primary-600)
- Border visibility improve করা হয়েছে (border-primary-700)
- Toggle button sidebar header এর top-right corner এ
- Mobile এ toggle icon proper position এ
- Active state এ primary-400 (lighter shade) use করা হয়েছে

### ✅ Fixed Header System
- সব page এ header fixed থাকে scroll করলেও
- Dynamic title - প্রতিটি page এর জন্য আলাদা title
- Consistent spacing সব জায়গায়

### ✅ Reusable Components
- **Input Component**: সব form field এর জন্য একটি component
- **DashboardLayout**: সব page এর জন্য consistent layout

## ডিজাইন ফিলোসফি

✅ Minimal এবং clean design  
✅ কোন shadow নেই, শুধু border ব্যবহার  
✅ Rounded corners: `rounded-md` only  
✅ Professional navy blue color (#1A3567)  
✅ lucide-react icons ব্যবহার  
✅ Full width content  
✅ সব device এ sidebar toggle  

## কিভাবে চালাবেন

### ইনস্টল করুন

```bash
npm install
```

### Development সার্ভার চালান

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

## Component ব্যবহার

### Input Component

সব form field এর জন্য এই component use করুন:

```jsx
<Input
  label="Field Name"
  name="fieldName"
  type="text" // অথবা "date" অথবা "select"
  value={value}
  onChange={handleChange}
  required={true}
  placeholder="Enter value"
  options={[]} // Select এর জন্য
/>
```

### DashboardLayout Component

সব page এ এই layout use করুন:

```jsx
<DashboardLayout title="Page Title">
  {/* আপনার content এখানে */}
</DashboardLayout>
```

## কালার সিস্টেম

### Primary Color: #1A3567

- **50**: #e8eef7 (সবচেয়ে হালকা - backgrounds)
- **100**: #d1ddef
- **200**: #a3bbe0 (Borders, hover)
- **300**: #7599d0
- **400**: #4777c1 (Active sidebar items)
- **500**: #1A3567 (Main color - buttons, sidebar)
- **600**: #152a52 (Sidebar header)
- **700**: #10203e (Borders)
- **800**: #0b1529
- **900**: #050b15 (সবচেয়ে গাঢ়)

## কালার পরিবর্তন করার নিয়ম

পুরো সিস্টেমের কালার একটি জায়গা থেকে পরিবর্তন করা যায়:

1. `tailwind.config.js` ফাইল খুলুন
2. `primary` এর `500` value পরিবর্তন করুন
3. সব বাটন, sidebar, এবং UI elements automatically আপডেট হবে

## Sidebar Features

### Desktop
- **Width**: 256px (expanded), 80px (collapsed)
- **Toggle**: Header এর top-right corner এ
- **Icons**: ChevronLeft (expanded), ChevronRight (collapsed)
- **Active State**: bg-primary-400 (lighter shade)
- **Hover State**: bg-primary-600

### Mobile
- **Toggle Button**: Top-left এ fixed (sidebar এর বাইরে)
- **Close Button**: Sidebar header এর top-right এ
- **Overlay**: Semi-transparent black background
- **Animation**: Left থেকে smooth slide

## পেজ সমূহ

### 1. Dashboard (Home)

**Features:**
- Stats cards with icons
- Factory buttons grid
- Recent orders table
- Fixed header with "Dashboard" title

### 2. Add New Order

**ফিল্ড সমূহ:**
- Work Order Place Date (তারিখ)
- Work Order No (নম্বর)
- Month (মাস - dropdown)
- Sales Contract No (চুক্তি নম্বর - dropdown)
- Buyer (ক্রেতা - dropdown)
- Job No (কাজের নম্বর)
- PO No (PO নম্বর)
- Style (স্টাইল)
- Color (রঙ)
- Composition (গঠন)

**বাটন:**
- Create Order (Save icon সহ)
- Cancel (X icon সহ)

**Grid Layout:**
- Desktop: 3 columns
- Tablet: 2 columns
- Mobile: 1 column

### 3. Knitting Orders

**Features:**
- Search section (4 inputs)
- Responsive table
- Edit button (Edit2 icon)
- Delete button (Trash2 icon)
- Empty state (Package icon সহ)
- Fixed header with "Knitting Orders" title

## Design Elements

### Cards
```css
bg-white rounded-md border border-gray-200
```

### Inputs
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
bg-primary-500 (main background)
bg-primary-600 (header background)
border-r border-gray-300
border-b border-primary-700 (header border)
```

### Active Sidebar Item
```css
bg-primary-400 text-white (lighter shade of primary)
```

## Icons Used (lucide-react)

### Navigation
- LayoutDashboard - Dashboard
- Package - Knitting Orders
- Palette - Yarn Dyeing
- FileText - AOP Orders
- PlusCircle - Add New Order

### Actions
- Save - Save button
- X - Cancel/Close
- Search - Search button
- Edit2 - Edit action
- Trash2 - Delete action

### Toggle
- Menu - Mobile menu open
- ChevronLeft - Collapse sidebar
- ChevronRight - Expand sidebar

### Stats
- TrendingUp, Users, DollarSign - Dashboard stats

## Responsive Design

### Mobile (< 640px)
- Hamburger menu
- Full width content
- Vertical form layout
- Touch-friendly buttons
- Fixed toggle button

### Tablet (640px - 1024px)
- 2 column grid
- Sidebar visible
- Optimized spacing

### Desktop (> 1024px)
- 3 column grid
- Collapsible sidebar
- Full width content
- Hover effects

## Best Practices

1. **সব form field এর জন্য Input component use করুন**
2. **সব page DashboardLayout দিয়ে wrap করুন**
3. **Primary color এর different shades use করুন**
4. **Border minimal রাখুন** (border-gray-200)
5. **কোন shadow use করবেন না** - শুধু borders
6. **সব rounded corners** - rounded-md
7. **Icons** - 18-20px buttons এর জন্য, 24px stats এর জন্য

## ডাটা স্টোরেজ

বর্তমানে LocalStorage ব্যবহার করা হচ্ছে। পরবর্তীতে backend API যুক্ত করার জন্য `src/utils/localStorage.js` ফাইলে সব function তৈরি করা আছে।

## পরবর্তী উন্নতি

- [ ] Backend API integration
- [ ] User authentication
- [ ] Loading states
- [ ] Toast notifications
- [ ] Form validation feedback
- [ ] Advanced filtering
- [ ] Excel/PDF export
- [ ] Dark mode support
- [ ] Keyboard shortcuts

## সাহায্য প্রয়োজন?

কোন সমস্যা হলে বা প্রশ্ন থাকলে জানান।

## File Structure

```
src/
├── components/
│   ├── DashboardLayout.jsx  (Fixed header wrapper)
│   ├── Input.jsx            (Reusable input component)
│   ├── Header.jsx
│   └── Modal.jsx
├── dashboard/
│   ├── pages/
│   │   ├── Home.jsx         (Dashboard with stats)
│   │   ├── KnittingOrders.jsx
│   │   └── NewOrder.jsx
│   └── Sidebar.jsx          (Improved sidebar)
├── routes/
├── config/
│   └── theme.js
└── utils/
    └── localStorage.js
```
