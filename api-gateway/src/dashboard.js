export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Commerce Microservices Engine</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    body { font-family: 'Inter', sans-serif; }
    pre, code { font-family: 'JetBrains Mono', monospace; }
    .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <!-- Top Navigation -->
  <header class="border-b border-slate-800 bg-slate-900/60 sticky top-0 z-50 backdrop-blur-md">
    <div class="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <i class="fa-solid fa-boxes-stacked text-white text-lg"></i>
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Distributed E-Commerce Engine
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Live on EC2</span>
          </h1>
          <p class="text-xs text-slate-400">Production Microservices &bull; Traefik/Express Gateway &bull; Redis Lock &bull; RabbitMQ</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <a href="http://" + window.location.hostname + ":15672" target="_blank" id="rabbitLink" class="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition">
          <i class="fa-solid fa-server"></i> RabbitMQ UI (Port 15672)
        </a>
        <a href="/healthz" target="_blank" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition border border-slate-700">
          <i class="fa-solid fa-heart-pulse text-emerald-400"></i> /healthz
        </a>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 py-8 space-y-8">
    <!-- Cluster Architecture & Status Grid -->
    <section>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <i class="fa-solid fa-network-wired text-indigo-400"></i> Active Architecture & Service Mesh
        </h2>
        <button onclick="checkHealth()" class="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
          <i class="fa-solid fa-rotate-right"></i> Refresh Nodes
        </button>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3" id="nodesGrid">
        <div class="glass p-3 rounded-xl border border-slate-800 text-center">
          <div class="w-2 h-2 rounded-full bg-emerald-400 mx-auto mb-2 animate-pulse"></div>
          <div class="text-xs font-semibold text-slate-200">API Gateway</div>
          <div class="text-[10px] text-slate-400">:3000 &bull; Express</div>
        </div>
        <div class="glass p-3 rounded-xl border border-slate-800 text-center">
          <div class="w-2 h-2 rounded-full bg-emerald-400 mx-auto mb-2"></div>
          <div class="text-xs font-semibold text-slate-200">Auth Service</div>
          <div class="text-[10px] text-slate-400">:3001 &bull; JWT</div>
        </div>
        <div class="glass p-3 rounded-xl border border-slate-800 text-center">
          <div class="w-2 h-2 rounded-full bg-emerald-400 mx-auto mb-2"></div>
          <div class="text-xs font-semibold text-slate-200">Order Service</div>
          <div class="text-[10px] text-slate-400">:3002 &bull; Events</div>
        </div>
        <div class="glass p-3 rounded-xl border border-slate-800 text-center">
          <div class="w-2 h-2 rounded-full bg-emerald-400 mx-auto mb-2"></div>
          <div class="text-xs font-semibold text-slate-200">Inventory</div>
          <div class="text-[10px] text-slate-400">:3003 &bull; Lock</div>
        </div>
        <div class="glass p-3 rounded-xl border border-slate-800 text-center">
          <div class="w-2 h-2 rounded-full bg-emerald-400 mx-auto mb-2"></div>
          <div class="text-xs font-semibold text-slate-200">Notification</div>
          <div class="text-[10px] text-slate-400">:3004 &bull; Worker</div>
        </div>
        <div class="glass p-3 rounded-xl border border-slate-800 text-center">
          <div class="w-2 h-2 rounded-full bg-emerald-400 mx-auto mb-2"></div>
          <div class="text-xs font-semibold text-slate-200">MySQL 8.0</div>
          <div class="text-[10px] text-slate-400">:3306 &bull; Data</div>
        </div>
        <div class="glass p-3 rounded-xl border border-slate-800 text-center">
          <div class="w-2 h-2 rounded-full bg-emerald-400 mx-auto mb-2"></div>
          <div class="text-xs font-semibold text-slate-200">Redis 7</div>
          <div class="text-[10px] text-slate-400">:6379 &bull; Lock/Cache</div>
        </div>
        <div class="glass p-3 rounded-xl border border-slate-800 text-center">
          <div class="w-2 h-2 rounded-full bg-emerald-400 mx-auto mb-2"></div>
          <div class="text-xs font-semibold text-slate-200">RabbitMQ</div>
          <div class="text-[10px] text-slate-400">:5672 &bull; Broker</div>
        </div>
      </div>
    </section>

    <!-- Main Workspace (2-Column) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Left Column: Operations -->
      <div class="lg:col-span-7 space-y-6">
        <!-- 1. Authentication -->
        <div class="glass p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-base text-white flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">1</span>
              Authentication & JWT Token
            </h3>
            <span id="authStatusBadge" class="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">Not Logged In</span>
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 block mb-1">Email</label>
                <input id="authEmail" type="email" value="tester@ecommerce.com" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
              </div>
              <div>
                <label class="text-xs text-slate-400 block mb-1">Password</label>
                <input id="authPassword" type="password" value="Password123!" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
              </div>
            </div>

            <div class="flex gap-3">
              <button onclick="handleRegister()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg text-xs transition border border-slate-700 flex items-center justify-center gap-2">
                <i class="fa-solid fa-user-plus text-indigo-400"></i> Register New User
              </button>
              <button onclick="handleLogin()" class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg text-xs transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2">
                <i class="fa-solid fa-right-to-bracket"></i> Login & Issue JWT
              </button>
            </div>

            <div id="tokenContainer" class="hidden bg-slate-950/80 p-3 rounded-xl border border-indigo-500/30">
              <div class="flex justify-between items-center text-[11px] text-slate-400 mb-1">
                <span>Active JWT (Bearer Token)</span>
                <button onclick="copyToken()" class="text-indigo-400 hover:text-indigo-300">Copy</button>
              </div>
              <p id="tokenDisplay" class="text-xs text-emerald-400 font-mono break-all line-clamp-2 select-all"></p>
            </div>
          </div>
        </div>

        <!-- 2. Inventory & Distributed Locking -->
        <div class="glass p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-base text-white flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">2</span>
              Live Product Catalog & Stock
            </h3>
            <div class="flex gap-2">
              <button onclick="handleSeed()" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition">
                <i class="fa-solid fa-database text-emerald-400"></i> Seed Sample Data
              </button>
              <button onclick="fetchInventory()" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition">
                <i class="fa-solid fa-rotate"></i> Refresh
              </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-slate-400 border-b border-slate-800">
                <tr>
                  <th class="pb-2">ID</th>
                  <th class="pb-2">Product</th>
                  <th class="pb-2">SKU</th>
                  <th class="pb-2">Price</th>
                  <th class="pb-2">Stock</th>
                  <th class="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody id="inventoryTable" class="divide-y divide-slate-800/60 text-slate-300">
                <tr><td colspan="6" class="py-4 text-center text-slate-500">Please login to fetch inventory</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 3. Checkout & Message Broker Order Placement -->
        <div class="glass p-6 rounded-2xl border border-slate-800 shadow-xl">
          <h3 class="font-bold text-base text-white flex items-center gap-2 mb-4">
            <span class="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">3</span>
            Order Checkout & RabbitMQ Event Dispatch
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label class="text-xs text-slate-400 block mb-1">Product ID</label>
              <input id="orderProductId" type="number" value="1" min="1" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
            </div>
            <div>
              <label class="text-xs text-slate-400 block mb-1">Quantity</label>
              <input id="orderQuantity" type="number" value="1" min="1" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
            </div>
            <div>
              <label class="text-xs text-slate-400 block mb-1">Unit Price ($)</label>
              <input id="orderPrice" type="number" step="0.01" value="349.99" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
            </div>
          </div>

          <button onclick="handleCreateOrder()" class="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2.5 rounded-lg text-sm transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
            <i class="fa-solid fa-cart-shopping"></i> Place Order & Trigger Asynchronous Worker
          </button>
        </div>
      </div>

      <!-- Right Column: Live Terminal & Order History -->
      <div class="lg:col-span-5 space-y-6">
        <!-- Live Orders List -->
        <div class="glass p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-sm text-white flex items-center gap-2">
              <i class="fa-solid fa-receipt text-indigo-400"></i> My Orders History
            </h3>
            <button onclick="fetchOrders()" class="text-xs text-indigo-400 hover:text-indigo-300">
              <i class="fa-solid fa-rotate"></i>
            </button>
          </div>
          <div id="ordersList" class="space-y-3 max-h-64 overflow-y-auto pr-1">
            <div class="text-center py-6 text-xs text-slate-500">No orders placed yet</div>
          </div>
        </div>

        <!-- Real-Time Activity Log / Console -->
        <div class="glass p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div class="flex justify-between items-center mb-3">
            <h3 class="font-bold text-sm text-white flex items-center gap-2">
              <i class="fa-solid fa-terminal text-emerald-400"></i> Gateway & Distributed Tracing Log
            </h3>
            <button onclick="clearConsole()" class="text-[11px] text-slate-500 hover:text-slate-400">Clear</button>
          </div>
          <div id="consoleOutput" class="bg-slate-950 p-4 rounded-xl border border-slate-900 text-xs font-mono text-emerald-400 h-80 overflow-y-auto space-y-2">
            <div class="text-slate-500">[system] Connected to API Gateway on EC2 (32.236.235.235:3000)</div>
            <div class="text-slate-500">[system] W3C traceparent and x-request-id active</div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <script>
    let authToken = localStorage.getItem('jwt_token') || '';

    document.getElementById('rabbitLink').href = 'http://' + window.location.hostname + ':15672';

    if (authToken) {
      updateAuthUI(authToken);
      fetchInventory();
      fetchOrders();
    }

    function log(msg, type = 'info') {
      const consoleEl = document.getElementById('consoleOutput');
      const time = new Date().toLocaleTimeString();
      let color = 'text-emerald-400';
      if (type === 'error') color = 'text-rose-400';
      if (type === 'warn') color = 'text-amber-400';
      if (type === 'sys') color = 'text-slate-500';

      const entry = document.createElement('div');
      entry.className = color;
      entry.innerHTML = \`<span class="text-slate-600">[\${time}]</span> \${msg}\`;
      consoleEl.appendChild(entry);
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    function clearConsole() {
      document.getElementById('consoleOutput').innerHTML = '';
    }

    function updateAuthUI(token) {
      authToken = token;
      localStorage.setItem('jwt_token', token);
      const badge = document.getElementById('authStatusBadge');
      const container = document.getElementById('tokenContainer');
      const display = document.getElementById('tokenDisplay');

      badge.className = 'text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      badge.textContent = 'Authenticated';
      container.classList.remove('hidden');
      display.textContent = token;
    }

    async function handleRegister() {
      const email = document.getElementById('authEmail').value;
      const password = document.getElementById('authPassword').value;
      log(\`Registering user: \${email}...\`);

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Web User', email, password })
        });
        const data = await res.json();
        if (res.ok) {
          log(\`User registered successfully! ID: \${data.id}\`);
          handleLogin();
        } else {
          log(\`Registration error: \${JSON.stringify(data)}\`, 'error');
        }
      } catch (err) {
        log(\`Network error: \${err.message}\`, 'error');
      }
    }

    async function handleLogin() {
      const email = document.getElementById('authEmail').value;
      const password = document.getElementById('authPassword').value;
      log(\`Authenticating with \${email}...\`);

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          log(\`Login successful! Issued JWT valid for 24 hours.\`);
          updateAuthUI(data.token);
          fetchInventory();
          fetchOrders();
        } else {
          log(\`Login failed: \${JSON.stringify(data)}\`, 'error');
        }
      } catch (err) {
        log(\`Network error: \${err.message}\`, 'error');
      }
    }

    async function handleSeed() {
      if (!authToken) { alert('Please login first!'); return; }
      log('Seeding sample products to MySQL & Redis...');
      try {
        const res = await fetch('/api/inventory/seed', {
          method: 'POST',
          headers: { 'Authorization': \`Bearer \${authToken}\` }
        });
        const data = await res.json();
        log(\`Seed complete: \${data.message || JSON.stringify(data)}\`);
        fetchInventory();
      } catch (err) {
        log(\`Seed failed: \${err.message}\`, 'error');
      }
    }

    async function fetchInventory() {
      if (!authToken) return;
      try {
        const res = await fetch('/api/inventory', {
          headers: { 'Authorization': \`Bearer \${authToken}\` }
        });
        const data = await res.json();
        const tbody = document.getElementById('inventoryTable');
        const products = data.products || data.data || [];

        if (products.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-slate-500">No products found. Click "Seed Sample Data".</td></tr>';
          return;
        }

        tbody.innerHTML = products.map(p => \`
          <tr class="hover:bg-slate-900/40 transition">
            <td class="py-2.5 font-mono text-slate-400">#\${p.id}</td>
            <td class="py-2.5 font-medium text-white">\${p.name}</td>
            <td class="py-2.5 font-mono text-slate-400">\${p.sku}</td>
            <td class="py-2.5 text-emerald-400 font-semibold">$\${Number(p.price).toFixed(2)}</td>
            <td class="py-2.5">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold \${p.stock > 10 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">
                \${p.stock} in stock
              </span>
            </td>
            <td class="py-2.5 text-right">
              <button onclick="selectProduct(\${p.id}, \${p.price})" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300">
                Select
              </button>
            </td>
          </tr>
        \`).join('');
        log(\`Loaded \${products.length} catalog items from Inventory Service.\`);
      } catch (err) {
        log(\`Failed to fetch inventory: \${err.message}\`, 'error');
      }
    }

    function selectProduct(id, price) {
      document.getElementById('orderProductId').value = id;
      document.getElementById('orderPrice').value = price;
      log(\`Selected Product #\${id} ($ \${price})\`);
    }

    async function handleCreateOrder() {
      if (!authToken) { alert('Please login first!'); return; }
      const productId = parseInt(document.getElementById('orderProductId').value);
      const quantity = parseInt(document.getElementById('orderQuantity').value);
      const price = parseFloat(document.getElementById('orderPrice').value);

      log(\`Submitting checkout for Product #\${productId} (Qty: \${quantity})...\`);
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${authToken}\`
          },
          body: JSON.stringify({
            items: [{ productId, quantity, price }]
          })
        });
        const data = await res.json();
        if (res.ok) {
          log(\`Order #\${data.id || data.orderId} created! Status: \${data.status}. Published 'order.created' to RabbitMQ.\`);
          fetchOrders();
          fetchInventory();
        } else {
          log(\`Order creation failed: \${JSON.stringify(data)}\`, 'error');
        }
      } catch (err) {
        log(\`Order request error: \${err.message}\`, 'error');
      }
    }

    async function fetchOrders() {
      if (!authToken) return;
      try {
        const res = await fetch('/api/orders', {
          headers: { 'Authorization': \`Bearer \${authToken}\` }
        });
        const data = await res.json();
        const list = document.getElementById('ordersList');
        const orders = data.orders || [];

        if (orders.length === 0) {
          list.innerHTML = '<div class="text-center py-6 text-xs text-slate-500">No orders placed yet</div>';
          return;
        }

        list.innerHTML = orders.map(o => \`
          <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex justify-between items-center">
            <div>
              <div class="font-semibold text-white">Order #\${o.id} &bull; $\${Number(o.total).toFixed(2)}</div>
              <div class="text-[10px] text-slate-500">\${new Date(o.createdAt || o.created_at).toLocaleString()}</div>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              \${o.status}
            </span>
          </div>
        \`).join('');
      } catch (err) {
        console.error(err);
      }
    }

    async function checkHealth() {
      log('Running health audit on Gateway...');
      try {
        const res = await fetch('/healthz');
        const data = await res.json();
        log(\`Gateway Health: \${JSON.stringify(data)}\`);
      } catch (err) {
        log(\`Healthcheck failed: \${err.message}\`, 'error');
      }
    }

    function copyToken() {
      navigator.clipboard.writeText(authToken);
      log('JWT token copied to clipboard.');
    }
  </script>
</body>
</html>`;
