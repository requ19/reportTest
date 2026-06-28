import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://depcmecboubrszgabbzd.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcGNtZWNib3VicnN6Z2FiYnpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1OTM0MzQsImV4cCI6MjA5ODE2OTQzNH0.7iigjwYjZX5NGcaX3wlp3PcTiiMW2GhZaMNwcM2c9ag'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
