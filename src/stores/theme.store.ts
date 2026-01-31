import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  mounted: boolean;
  initTheme: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'light',
  mounted: false,

  initTheme: () => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      set({ theme: savedTheme, mounted: true });
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      set({ theme: 'dark', mounted: true });
      document.documentElement.classList.add('dark');
    } else {
      set({ mounted: true });
    }
  },

  setTheme: (newTheme: Theme) => {
    set({ theme: newTheme });
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(newTheme);
  },
}));
