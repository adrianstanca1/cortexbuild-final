#!/bin/bash
echo "=========================================="
echo "Production Verification Script"
echo "=========================================="

echo "Checking Frontend (https://cortexbuildpro.com)..."
if curl -s -I "https://cortexbuildpro.com" | head -n 1 | grep -q "200\|2.."; then
    echo "✅ Frontend is Online"
else
    echo "❌ Frontend unreachable"
fi

echo ""
echo "Checking Backend (https://cortexbuildpro.com/api/health)..."
HEALTH_RESPONSE=$(curl -s "https://cortexbuildpro.com/api/health")

if echo "$HEALTH_RESPONSE" | grep -q "online"; then
    echo "✅ Backend is Online!"
    echo "Response: $HEALTH_RESPONSE"
else
    echo "❌ Backend is Offline / Stopped"
    echo "Raw Response: $HEALTH_RESPONSE"
    echo ""
    echo "Diagnosis:"
    echo "If you see '503 Service Unavailable', the app is STOPPED in hPanel."
fi
echo "=========================================="
