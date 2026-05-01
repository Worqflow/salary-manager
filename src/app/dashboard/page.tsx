import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: staff } = await supabase
    .from('staff')
    .select('full_name, position, is_active')
    .eq('is_active', true)
    .order('full_name')

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Salary Manager</h1>
          <p style={{ color: '#666', margin: '0.25rem 0 0' }}>{user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button style={{
            padding: '0.5rem 1rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            background: 'white',
            cursor: 'pointer'
          }}>
            Sign out
          </button>
        </form>
      </div>

      <div style={{
        background: 'white',
        border: '1px solid #eee',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #eee' }}>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>
            Active Staff — {staff?.length ?? 0} members
          </h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', color: '#666', fontWeight: 500 }}>Name</th>
              <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', color: '#666', fontWeight: 500 }}>Position</th>
            </tr>
          </thead>
          <tbody>
            {staff?.map((s) => (
              <tr key={s.full_name} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem 1.5rem', fontWeight: 500 }}>{s.full_name}</td>
                <td style={{ padding: '0.75rem 1.5rem', color: '#666' }}>{s.position}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}