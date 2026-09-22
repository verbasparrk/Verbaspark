import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./cloud-tests',workers:1,use:{baseURL:'http://127.0.0.1:5174',browserName:'chromium'},webServer:{command:'npm run dev -- --port 5174 --strictPort',url:'http://127.0.0.1:5174',reuseExistingServer:false,env:{VITE_SUPABASE_URL:'http://127.0.0.1:59999',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_only'}}});
