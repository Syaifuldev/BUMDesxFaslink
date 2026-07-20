import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=').map(s => s.trim()))
)

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLogin() {
  const email = 'operator123@guestsync.app'
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: 'password123',
  })
  
  if (error) {
    console.log('LOGIN ERROR:')
    console.log(JSON.stringify(error, null, 2))
    console.log('Error name:', error.name)
    console.log('Error message:', error.message)
    console.log('Is Error?', error instanceof Error)
  } else {
    console.log('LOGIN SUCCESS')
  }
}

testLogin()
