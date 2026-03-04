// Theme Configuration - Change primary color here to update entire app
export const theme = {
  primary: {
    50: '#e8eef7',
    100: '#d1ddef',
    200: '#a3bbe0',
    300: '#7599d0',
    400: '#4777c1',
    500: '#1A3567', // Main primary color
    600: '#152a52',
    700: '#10203e',
    800: '#0b1529',
    900: '#050b15',
  },
  // Derived colors from primary
  get main() {
    return this.primary[500];
  },
  get hover() {
    return this.primary[600];
  },
  get light() {
    return this.primary[50];
  },
  get dark() {
    return this.primary[700];
  }
};
