#!/bin/bash

echo "🔍 Verificando configuración de Supabase..."
echo ""

if [ -f .env ]; then
  echo "✅ Archivo .env encontrado"
  echo ""
  
  SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d '=' -f 2)
  SUPABASE_KEY=$(grep VITE_SUPABASE_ANON_KEY .env | cut -d '=' -f 2)
  
  if [ -n "$SUPABASE_URL" ]; then
    echo "✅ VITE_SUPABASE_URL está configurado"
    echo "   URL: ${SUPABASE_URL:0:30}..."
  else
    echo "❌ VITE_SUPABASE_URL no está configurado"
  fi
  
  if [ -n "$SUPABASE_KEY" ]; then
    echo "✅ VITE_SUPABASE_ANON_KEY está configurado"
    echo "   KEY: ${SUPABASE_KEY:0:30}..."
  else
    echo "❌ VITE_SUPABASE_ANON_KEY no está configurado"
  fi
else
  echo "❌ Archivo .env NO encontrado"
  echo "   Por favor crea el archivo .env con las credenciales de Supabase"
fi

echo ""
echo "📝 Variables requeridas en .env:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
