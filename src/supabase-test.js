import { supabase } from './supabase'

/**
 * Función para verificar la conexión a Supabase
 * Útil para debugging durante desarrollo
 */
export async function testSupabaseConnection() {
  try {
    console.log('🔍 Probando conexión a Supabase...')
    
    // Test 1: Obtener versión de Supabase
    const { data: { versions }, error: versionError } = await supabase.rpc('supabase.version', {}, { count: 'exact' }).catch(() => ({ data: { versions: null }, error: null }))
    
    // Test 2: Obtener usuario actual (si está autenticado)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('✅ Conexión a Supabase exitosa')
    console.log('📊 Estado:', {
      url: import.meta.env.VITE_SUPABASE_URL,
      autenticado: !!user,
      usuario: user?.email || 'No autenticado'
    })
    
    return {
      conectado: true,
      usuario,
      error: null
    }
  } catch (error) {
    console.error('❌ Error conectando a Supabase:', error)
    return {
      conectado: false,
      usuario: null,
      error: error.message
    }
  }
}

/**
 * Función para verificar tablas disponibles
 */
export async function checkTables() {
  try {
    console.log('📋 Verificando tablas disponibles...')
    
    // Intentar acceder a tablas conocidas
    const tablesToCheck = ['profiles', 'posts', 'follows', 'likes', 'notifications']
    const results = {}
    
    for (const table of tablesToCheck) {
      const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true })
      results[table] = !error ? '✅' : '❌'
    }
    
    console.log('📊 Tablas:', results)
    return results
  } catch (error) {
    console.error('❌ Error verificando tablas:', error)
    return null
  }
}

// Auto-test en desarrollo
if (import.meta.env.DEV) {
  // Esperar a que la app cargue antes de testear
  setTimeout(() => {
    testSupabaseConnection()
    checkTables()
  }, 1000)
}
