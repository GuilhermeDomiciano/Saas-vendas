#!/usr/bin/env bash
set -e

echo "==> Subindo PostgreSQL via Docker Compose..."
docker compose up -d

echo "==> Aguardando banco de dados ficar pronto..."
until docker compose exec -T postgres pg_isready -U sales -d salesdb > /dev/null 2>&1; do
  echo "    Banco ainda não disponível, aguardando..."
  sleep 2
done
echo "    Banco pronto!"

echo "==> Iniciando backend (NestJS)..."
(cd backend && npm run start:dev) &
BACKEND_PID=$!

echo "==> Iniciando frontend (Vite)..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Pressione Ctrl+C para encerrar tudo."

cleanup() {
  echo ""
  echo "==> Encerrando processos..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo "==> Tudo encerrado."
}

trap cleanup SIGINT SIGTERM

wait $BACKEND_PID $FRONTEND_PID
