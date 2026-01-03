#!/bin/bash
export PATH=/opt/alt/alt-nodejs20/root/usr/bin:$PATH
cd /home/u875310796/domains/cortexbuildpro.com/public_html/__backend__

# Check if node process is already running
if pgrep -f 'node dist/index.js' > /dev/null; then
    echo "Backend already running"
else
    echo "Starting backend..."
    nohup node dist/index.js >> backend.log 2>&1 &
    echo "Backend started with PID $!"
fi
