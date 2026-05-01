import { createClient } from '@/lib/supabase'

export default async function Home() {
  const supabase = createClient()
  const { data: staff, error } = await supabase
    .from('staff')
    .select('full_name, position')
    .limit(5)

  if (error) {
    return <p>Error: {error.message}</p>
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Salary Manager</h1>
      <p>Connected to Supabase. First 5 staff:</p>
      <ul>
        {staff.map((s) => (
          <li key={s.full_name}>
            {s.full_name} — {s.position}
          </li>
        ))}
      </ul>
    </main>
  )
}