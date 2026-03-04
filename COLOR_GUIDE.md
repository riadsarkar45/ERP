# Color Theme Guide

## Current Primary Color: #1A3567 (Professional Navy Blue)

This ERP system uses a centralized color system. You can change the entire app's color scheme by modifying just one place.

## How to Change the Primary Color

### Edit `tailwind.config.js`

Change the `primary` color values in the `colors` section:

```javascript
colors: {
  primary: {
    50: '#e8eef7',   // Lightest shade
    100: '#d1ddef',
    200: '#a3bbe0',
    300: '#7599d0',
    400: '#4777c1',
    500: '#1A3567',  // Main color - CHANGE THIS
    600: '#152a52',  // Hover states
    700: '#10203e',
    800: '#0b1529',
    900: '#050b15',  // Darkest shade
  }
}
```

## Design Philosophy

- Minimal and clean design
- No shadows, only borders
- Border color: `border-gray-200`
- Rounded corners: `rounded-md` only
- Focus states: Border opacity change (no ring)
- Professional and expensive look

## Where Colors Are Used

- Sidebar background: `bg-primary-500`
- Active navigation: `bg-white text-primary-500`
- Buttons: `bg-primary-500 hover:bg-primary-600`
- Form focus: `focus:border-primary-500 focus:border-opacity-50`
- Icons: lucide-react icons throughout

## Popular Professional Color Schemes

### Navy Blue (Current - Corporate)
```javascript
500: '#1A3567',
```

### Deep Teal (Modern Professional)
```javascript
500: '#0f4c5c',
```

### Charcoal (Sophisticated)
```javascript
500: '#2d3748',
```

### Forest Green (Growth)
```javascript
500: '#1e4620',
```

### Burgundy (Luxury)
```javascript
500: '#6b1e3f',
```

### Slate Blue (Tech)
```javascript
500: '#334e68',
```

## Design Elements

- All cards: `bg-white rounded-md border border-gray-200`
- All inputs: `border border-gray-200 rounded-md`
- All buttons: `rounded-md border`
- Sidebar: Full color background with border
- Content: Full width, no max-width constraints
- Toggle: Available on all devices

After changing the primary color value, the entire application will automatically update!
