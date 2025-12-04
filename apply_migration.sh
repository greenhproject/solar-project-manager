#!/bin/bash
# Script para aplicar migración automáticamente
echo "Aplicando migración de base de datos..."
echo -e "\n\n\n\n\n\n\n\n\n\n" | pnpm db:push
echo "Migración completada"
