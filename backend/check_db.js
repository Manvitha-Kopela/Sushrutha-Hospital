
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkData() {
    console.log('Connecting to:', SUPABASE_URL)
    const { data, error } = await supabase.from('appointments').select('*').order('created_at', { ascending: false }).limit(5)
    if (error) {
        console.error('Error fetching data:', error)
    } else {
        console.log('Recent appointments:', JSON.stringify(data, null, 2))
    }
}

checkData()
