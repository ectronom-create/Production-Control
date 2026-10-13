import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

function fwSyncPlugin() {
  return {
    name: 'fw-sync-plugin',
    configureServer(server) {
      server.middlewares.use('/api/sync-fw', (req, res) => {
        try {
          const url = new URL(req.url, 'http://localhost:5173');
          const targetDate = url.searchParams.get('date'); // YYYY-MM-DD
          const targetShift = url.searchParams.get('shift'); // Morning or Evening

          if (!targetDate || !targetShift) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'Missing date or shift parameter' }));
          }

          const [yStr, mStr, dStr] = targetDate.split('-');
          const y = parseInt(yStr, 10);
          const m = parseInt(mStr, 10);
          const d = parseInt(dStr, 10);
          const targetDateDmy = String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0') + '/' + yStr;

          const nextDate = new Date(y, m - 1, d);
          nextDate.setDate(nextDate.getDate() + 1);
          const nextDateDmy = String(nextDate.getDate()).padStart(2, '0') + '/' +
                              String(nextDate.getMonth() + 1).padStart(2, '0') + '/' +
                              nextDate.getFullYear();

          const files = [
            'H:/Other computers/Update PC 1/LOG_CSV/LOG.csv',
            'H:/Other computers/Update PC 2/LOG_CSV/LOG.csv'
          ];

          const uniqueSn = new Set();
          const pcStats = {};

          files.forEach(f => {
            if (!fs.existsSync(f)) return;
            const content = fs.readFileSync(f, 'utf8');
            const lines = content.split('\n');
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              const parts = line.split(';');
              if (parts.length < 7) continue;
              const rDate = parts[0]?.trim();
              const rTime = parts[1]?.trim();
              const sn = parts[2]?.trim();
              const status = parts[6]?.trim()?.toUpperCase();
              const pc = parts[7]?.trim() || 'Unknown';

              if (status !== 'PASS' || !sn) continue;

              const hour = parseInt((rTime || '00:00:00').split(':')[0], 10);

              let isMatch = false;
              if (targetShift === 'Morning') {
                if (rDate === targetDateDmy && hour >= 6 && hour < 18) isMatch = true;
              } else {
                if (rDate === targetDateDmy && hour >= 18) isMatch = true;
                else if (rDate === nextDateDmy && hour < 6) isMatch = true;
              }

              if (isMatch) {
                uniqueSn.add(sn);
                pcStats[pc] = (pcStats[pc] || 0) + 1;
              }
            }
          });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            date: targetDate,
            shift: targetShift,
            count: uniqueSn.size,
            pcStats
          }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), fwSyncPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});

