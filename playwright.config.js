import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests',use:{baseURL:'http://127.0.0.1:5175',browserName:'chromium'},webServer:{command:'npm run dev -- --port 5175 --strictPort',url:'http://127.0.0.1:5175',reuseExistingServer:false,env:{VITE_SUPABASE_URL:'',VITE_SUPABASE_PUBLISHABLE_KEY:''}}});
