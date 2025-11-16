# 🚀 Guía Paso a Paso - Subir a GitHub

## 📊 Estado Actual

✅ Código completamente preparado
✅ Commit listo para subir
✅ Remoto configurado: `https://github.com/BerunHaider/Xbi.git`

## ⚠️ Error Detectado

```
Error 403: Permission denied
```

Esto significa que necesitas:
1. Crear el repositorio en GitHub, O
2. Configurar autenticación correcta

## 🔑 Solución Rápida: Token Personal

### Paso 1: Crear Token en GitHub

1. Abre: https://github.com/settings/tokens/new
2. Dale un nombre: `xbi-push`
3. Selecciona: `repo` (acceso completo)
4. Expira en: 30 días (o más)
5. Click: "Generate token"
6. **Copia el token** (solo aparece una vez)

### Paso 2: Crear Repositorio (si no existe)

1. Ve a: https://github.com/new
2. Nombre: `Xbi`
3. Descripción: `Red Social X Clone - React + Supabase`
4. Público
5. NO marques "Add a README"
6. Click: "Create repository"

### Paso 3: Hacer Push

En la terminal, ejecuta:

```bash
cd /workspaces/codespaces-blank

# Haz push
git push -u origin main

# Cuando pida:
# Username: BerunHaider
# Password: [Tu token aquí]
```

### Paso 4: Verificar

Abre: https://github.com/BerunHaider/Xbi

Deberías ver tu código uploaded.

## 📝 Commit Queue

El siguiente cambio está listo:

```
🎨 Mejoras: Animaciones, NavigationMenu, Supabase Config
- 12 animaciones CSS suaves
- NavigationMenu funcional completo
- Componentes mejorados
- Documentación completa
```

## ✅ Verificación

```bash
cd /workspaces/codespaces-blank

# Ver estado
git status

# Ver log
git log --oneline -5

# Ver remoto
git remote -v
```

---

**¿Problemas?** Intenta con SSH en lugar de HTTPS:

```bash
# Agregar clave SSH (si la tienes)
git remote set-url origin git@github.com:BerunHaider/Xbi.git
git push -u origin main
```
