# 🔧 Guía de Debugging - Supabase

## Verificar Conexión a Supabase

### En el Navegador (DevTools)

1. Abre la **Consola** (F12 → Console)
2. Ejecuta:
```javascript
// Verificar que import.meta.env tiene las variables
console.log('SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('SUPABASE_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 30) + '...')
```

3. Debería mostrar:
```
SUPABASE_URL: https://jyfrjwyxlhfhenubrbpk.supabase.co
SUPABASE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Importar módulo de prueba

```javascript
import { testSupabaseConnection, checkTables } from './supabase-test'

// Test conexión
await testSupabaseConnection()

// Verificar tablas
await checkTables()
```

## Errores Comunes

### ❌ "VITE_SUPABASE_URL is not set"

**Causa**: El archivo `.env` no existe o está mal ubicado

**Solución**:
```bash
# Verificar que existe
ls -la .env

# Si no existe, crear:
echo "VITE_SUPABASE_URL=https://jyfrjwyxlhfhenubrbpk.supabase.co" > .env
echo "VITE_SUPABASE_ANON_KEY=tu_key_aqui" >> .env
```

### ❌ "Access denied" desde Supabase

**Causa**: Credenciales inválidas o permisos RLS incorrectos

**Solución**:
1. Verificar que VITE_SUPABASE_ANON_KEY es correcto
2. Revisar Row Level Security (RLS) en Supabase Dashboard
3. Ejecutar scripts SQL de setup si están disponibles

### ❌ Variables de entorno no se cargan

**Causa**: Cambios en .env sin reiniciar servidor dev

**Solución**:
```bash
# Detener servidor (Ctrl+C)
# Reiniciar
npm run dev
```

## Verificación Paso a Paso

### 1. Verificar archivo .env
```bash
cd /workspaces/codespaces-blank
cat .env
```

Debe mostrar:
```
VITE_SUPABASE_URL=https://jyfrjwyxlhfhenubrbpk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Verificar que Vite lo carga
```javascript
// En DevTools Console
console.log(import.meta.env)
```

### 3. Verificar cliente Supabase
```javascript
// En DevTools Console
import { supabase } from './src/supabase.js'
console.log(supabase)
```

### 4. Test de conexión real
```javascript
// En DevTools Console
const { data, error } = await supabase.auth.getSession()
console.log('Session:', data)
console.log('Error:', error)
```

## Logs Útiles

### En src/App.jsx, agregar:
```javascript
import { testSupabaseConnection } from './supabase-test'

useEffect(() => {
  testSupabaseConnection()
}, [])
```

Esto mostrará en la consola los tests automáticos de conexión.

## Recursos

- 📚 [Docs Supabase](https://supabase.com/docs)
- 🔑 [Supabase Auth](https://supabase.com/docs/guides/auth)
- 📊 [Supabase Database](https://supabase.com/docs/guides/database)
- 🌐 [Vite Env Variables](https://vitejs.dev/guide/env-and-mode.html)

---

**Última actualización**: 16 de Noviembre de 2025
