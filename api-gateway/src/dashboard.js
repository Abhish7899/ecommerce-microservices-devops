export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Distributed E-Commerce Engine</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    body { font-family: 'Inter', sans-serif; }
    pre, code, .font-mono { font-family: 'JetBrains Mono', monospace; }
    .custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
    .custom-scroll::-webkit-scrollbar-track { background: transparent; }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 9999px; }
    .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
  </style>
</head>
<body class="bg-[#121820] text-slate-100 min-h-screen flex flex-col selection:bg-blue-600 selection:text-white">

  <!-- ========================================================================= -->
  <!-- TOP HEADER (Matching Reference Design) -->
  <!-- ========================================================================= -->
  <header class="bg-[#1a232f] border-b border-slate-800/80 sticky top-0 z-40 shadow-sm">
    <div class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        
        <!-- Left: Logo & Engine Meta -->
        <div class="flex items-center space-x-3 cursor-pointer" onclick="switchNavTab('dashboard')">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-sky-500/20">
            <i class="fa-solid fa-boxes-stacked text-white text-lg"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base sm:text-lg font-bold text-white tracking-tight">Distributed E-Commerce Engine</h1>
              <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live on EC2
              </span>
            </div>
            <p class="text-[11px] text-slate-400 hidden sm:block">
              Production Microservices &bull; Traefik/Express Gateway &bull; Redis Lock &bull; RabbitMQ
            </p>
          </div>
        </div>

        <!-- Right: Utility Links & Badges -->
        <div class="flex items-center space-x-3">
          <a href="http://" + window.location.hostname + ":15672" target="_blank" id="topRabbitLink" class="text-xs bg-[#241e17] hover:bg-[#32281c] text-amber-400 border border-amber-500/40 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition font-medium">
            <i class="fa-solid fa-server text-xs"></i> RabbitMQ UI <span class="text-slate-400 text-[10px]">(Port 15672)</span>
          </a>
          <a href="/healthz" target="_blank" class="text-xs bg-[#152723] hover:bg-[#1a352f] text-emerald-400 border border-emerald-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition font-medium">
            <i class="fa-solid fa-heart-pulse text-xs text-emerald-400"></i> /healthz
          </a>
        </div>
      </div>

      <!-- Sub Navigation Bar (Dashboard, Catalog, Orders, Customers, Settings) -->
      <nav class="flex space-x-8 text-sm font-medium border-t border-slate-800/60 pt-2 pb-2.5 overflow-x-auto">
        <button onclick="switchNavTab('dashboard')" id="navTab-dashboard" class="nav-link text-sky-400 border-b-2 border-sky-400 pb-1 font-semibold flex items-center gap-2">
          Dashboard
        </button>
        <button onclick="switchNavTab('catalog')" id="navTab-catalog" class="nav-link text-slate-400 hover:text-white pb-1 transition flex items-center gap-2">
          Catalog
        </button>
        <button onclick="switchNavTab('orders')" id="navTab-orders" class="nav-link text-slate-400 hover:text-white pb-1 transition flex items-center gap-2">
          Orders
          <span id="ordersTabCount" class="hidden text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">0</span>
        </button>
        <button onclick="switchNavTab('customers')" id="navTab-customers" class="nav-link text-slate-400 hover:text-white pb-1 transition flex items-center gap-2">
          Customers
        </button>
        <button onclick="switchNavTab('settings')" id="navTab-settings" class="nav-link text-slate-400 hover:text-white pb-1 transition flex items-center gap-2">
          Settings
        </button>
      </nav>
    </div>
  </header>

  <!-- ========================================================================= -->
  <!-- MAIN WORKSPACE CONTAINER -->
  <!-- ========================================================================= -->
  <main class="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

    <!-- --------------------------------------------------------------------- -->
    <!-- VIEW 1: DASHBOARD / STOREFRONT (Matching Exact Image Structure) -->
    <!-- --------------------------------------------------------------------- -->
    <div id="view-dashboard" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- LEFT COLUMN: Search & Product Catalog Cards (approx 9 cols) -->
      <div class="lg:col-span-9 space-y-6">
        
        <!-- Search & Category Bar -->
        <div class="space-y-3">
          <div class="relative w-full">
            <i class="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-slate-400 text-sm"></i>
            <input id="productSearchInput" oninput="applyCatalogFilters()" type="text" placeholder="Search products..." class="w-full bg-white text-slate-900 border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-sm placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
          </div>

          <!-- Category Tags -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1" id="categoryChips">
            <button onclick="filterByCategory('all')" class="cat-chip active px-3.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 text-white transition whitespace-nowrap shadow-sm">
              All Items
            </button>
            <button onclick="filterByCategory('Electronics')" class="cat-chip px-3.5 py-1 rounded-lg text-xs font-medium bg-[#1e293b] text-slate-300 hover:bg-slate-800 transition whitespace-nowrap border border-slate-700/60">
              Modern Electronics
            </button>
            <button onclick="filterByCategory('Fashion')" class="cat-chip px-3.5 py-1 rounded-lg text-xs font-medium bg-[#1e293b] text-slate-300 hover:bg-slate-800 transition whitespace-nowrap border border-slate-700/60">
              Fashion & Apparel
            </button>
            <button onclick="filterByCategory('Accessories')" class="cat-chip px-3.5 py-1 rounded-lg text-xs font-medium bg-[#1e293b] text-slate-300 hover:bg-slate-800 transition whitespace-nowrap border border-slate-700/60">
              Accessories
            </button>
            <button onclick="filterByCategory('Keyboards')" class="cat-chip px-3.5 py-1 rounded-lg text-xs font-medium bg-[#1e293b] text-slate-300 hover:bg-slate-800 transition whitespace-nowrap border border-slate-700/60">
              Keyboards & Mice
            </button>
          </div>
        </div>

        <!-- Product Cards Grid (Clean White Cards matching image) -->
        <div id="productGridContainer" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          <!-- Dynamically Populated by renderProducts() -->
          <div class="col-span-full py-20 text-center text-slate-400">
            <i class="fa-solid fa-spinner fa-spin text-2xl text-blue-500 mb-3"></i>
            <p class="text-sm">Connecting to Inventory Service...</p>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: Sidebar (Your Cart, Quick Actions, Live Activity) -->
      <div class="lg:col-span-3 space-y-6">

        <!-- CARD 1: "Your Cart" (Clean White Card) -->
        <div class="bg-white text-slate-900 rounded-2xl p-5 shadow-lg border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 class="text-base font-bold text-slate-900">Your Cart</h3>
              <p class="text-[11px] text-slate-400">My Orders History</p>
            </div>
            <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 text-white text-xs font-bold shadow-sm">
              <i class="fa-solid fa-bag-shopping text-[10px] text-blue-400"></i>
              <span id="cartHeaderBadge">0 Items</span>
            </span>
          </div>

          <!-- Cart Item List -->
          <div id="cartItemsList" class="divide-y divide-slate-100 py-3 space-y-3 max-h-72 overflow-y-auto custom-scroll">
            <div class="py-8 text-center text-slate-400 space-y-2">
              <i class="fa-solid fa-cart-shopping text-2xl text-slate-300"></i>
              <p class="text-xs">Your cart is currently empty</p>
              <p class="text-[10px] text-slate-400">Click "Add to Cart" on any product</p>
            </div>
          </div>

          <!-- Total Calculation -->
          <div class="pt-3 border-t border-slate-100 space-y-2 text-xs">
            <div class="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span id="cartSubtotalText" class="font-bold text-slate-800 font-mono">$0.00</span>
            </div>
            <div class="flex justify-between text-slate-500">
              <span>Concurrency Lock</span>
              <span class="text-emerald-600 font-semibold font-mono">Redis SETNX</span>
            </div>
            <div class="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-100">
              <span>Total</span>
              <span id="cartTotalText" class="text-base font-mono text-slate-950">$0.00</span>
            </div>
          </div>

          <!-- Checkout Now Button -->
          <button id="cartCheckoutBtn" onclick="openCheckoutModal()" class="w-full mt-4 bg-slate-950 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed">
            <i class="fa-solid fa-bolt text-xs text-blue-400"></i> Checkout Now
          </button>
        </div>

        <!-- CARD 2: "Quick Actions" (Dark Card with 3 Blue Buttons) -->
        <div class="bg-[#182230] border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">
            Quick Actions
          </h3>
          <div class="space-y-2">
            <button onclick="openAddProductModal()" class="w-full bg-[#1e60d5] hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2">
              <i class="fa-solid fa-plus text-xs"></i> Add New Product
            </button>
            <button onclick="switchNavTab('orders')" class="w-full bg-[#1e60d5] hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2">
              <i class="fa-solid fa-receipt text-xs"></i> View All Orders
            </button>
            <button onclick="handleSeedCatalog()" class="w-full bg-[#1e60d5] hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2">
              <i class="fa-solid fa-database text-xs"></i> Seed Product Catalog
            </button>
          </div>
        </div>

        <!-- CARD 3: "Live Activity / Events" (Dark Card with Green Glow Bullets) -->
        <div class="bg-[#182230] border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Live Activity Stream
            </h3>
            <span class="text-[10px] text-slate-500 font-mono">RabbitMQ</span>
          </div>

          <div id="liveActivityFeed" class="space-y-2.5 text-xs">
            <div class="flex items-start space-x-2">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0"></span>
              <div>
                <p class="font-semibold text-slate-200">Product Stock Updated</p>
                <p class="text-[10px] text-slate-400">Inventory cached with 60s TTL</p>
              </div>
            </div>
            <div class="flex items-start space-x-2">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0"></span>
              <div>
                <p class="font-semibold text-slate-200">Order Service Ready</p>
                <p class="text-[10px] text-slate-400">MySQL transaction pool active</p>
              </div>
            </div>
            <div class="flex items-start space-x-2">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0"></span>
              <div>
                <p class="font-semibold text-slate-200">Notification Worker Active</p>
                <p class="text-[10px] text-slate-400">Listening to 'ecommerce.events'</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- --------------------------------------------------------------------- -->
    <!-- VIEW 2: FULL CATALOG TABLE -->
    <!-- --------------------------------------------------------------------- -->
    <div id="view-catalog" class="hidden space-y-4">
      <div class="flex justify-between items-center pb-2 border-b border-slate-800">
        <div>
          <h2 class="text-xl font-bold text-white">Inventory Catalog Management</h2>
          <p class="text-xs text-slate-400">Real-time stock quantities coordinated by MySQL 8.0 and Redis</p>
        </div>
        <div class="flex gap-2">
          <button onclick="handleSeedCatalog()" class="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg border border-slate-700 transition">
            <i class="fa-solid fa-database text-emerald-400"></i> Seed Catalog
          </button>
          <button onclick="fetchInventory()" class="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition">
            <i class="fa-solid fa-rotate"></i> Refresh
          </button>
        </div>
      </div>

      <div class="bg-[#182230] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-900/80 text-slate-400 border-b border-slate-800">
            <tr>
              <th class="p-3.5">ID</th>
              <th class="p-3.5">Product Name</th>
              <th class="p-3.5">SKU</th>
              <th class="p-3.5">Price</th>
              <th class="p-3.5">Stock Level</th>
              <th class="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody id="catalogTableBody" class="divide-y divide-slate-800 text-slate-300">
            <!-- Populated dynamically -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- --------------------------------------------------------------------- -->
    <!-- VIEW 3: ORDERS MANAGEMENT & DETAIL VIEW -->
    <!-- --------------------------------------------------------------------- -->
    <div id="view-orders" class="hidden space-y-4">
      <div class="flex justify-between items-center pb-2 border-b border-slate-800">
        <div>
          <h2 class="text-xl font-bold text-white">Placed Customer Orders</h2>
          <p class="text-xs text-slate-400">Orders written to MySQL and published to RabbitMQ topic exchange</p>
        </div>
        <button onclick="fetchOrders()" class="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
          <i class="fa-solid fa-rotate"></i> Refresh Orders
        </button>
      </div>

      <div id="ordersListContainer" class="space-y-3">
        <!-- Populated dynamically -->
      </div>
    </div>

    <!-- --------------------------------------------------------------------- -->
    <!-- VIEW 4: CUSTOMERS / AUTH PROFILES -->
    <!-- --------------------------------------------------------------------- -->
    <div id="view-customers" class="hidden max-w-2xl mx-auto space-y-6">
      <div class="bg-[#182230] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div class="flex items-center justify-between pb-4 border-b border-slate-800">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-lg font-bold">
              <i class="fa-solid fa-user-shield"></i>
            </div>
            <div>
              <h3 id="customerNameHeader" class="text-base font-bold text-white">Active Customer Profile</h3>
              <p id="customerEmailHeader" class="text-xs text-slate-400">customer@ecommerce.local</p>
            </div>
          </div>
          <span class="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
            JWT Authenticated
          </span>
        </div>

        <!-- Auth Switching Form -->
        <div class="space-y-3">
          <h4 class="text-xs font-bold uppercase text-slate-400">Switch / Register User Account</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input id="switchEmailInput" type="email" value="customer@ecommerce.local" placeholder="Email" class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500">
            <input id="switchPassInput" type="password" value="Password123!" placeholder="Password" class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500">
          </div>
          <div class="flex gap-2 pt-1">
            <button onclick="handleUserLogin()" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-xl text-xs transition">
              Sign In (Generate Token)
            </button>
            <button onclick="handleUserRegister()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 rounded-xl text-xs transition border border-slate-700">
              Register New User
            </button>
          </div>
        </div>

        <!-- Token inspect -->
        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
          <div class="flex justify-between items-center text-[11px] text-slate-400">
            <span>Current Bearer Token:</span>
            <button onclick="copyTokenToClipboard()" class="text-blue-400 hover:underline">Copy</button>
          </div>
          <p id="jwtTokenString" class="text-[10px] font-mono text-emerald-400 break-all select-all"></p>
        </div>
      </div>
    </div>

    <!-- --------------------------------------------------------------------- -->
    <!-- VIEW 5: SETTINGS / SYSTEM HEALTH -->
    <!-- --------------------------------------------------------------------- -->
    <div id="view-settings" class="hidden max-w-3xl mx-auto space-y-6">
      <div class="bg-[#182230] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 class="text-base font-bold text-white pb-3 border-b border-slate-800">
          Platform Configuration & Microservices Mesh
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div class="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div class="text-slate-400 font-mono">Gateway</div>
            <div class="text-white font-bold mt-1">Port 3000</div>
            <div class="text-emerald-400 text-[10px]">Healthy</div>
          </div>
          <div class="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div class="text-slate-400 font-mono">Auth</div>
            <div class="text-white font-bold mt-1">Port 3001</div>
            <div class="text-emerald-400 text-[10px]">Healthy</div>
          </div>
          <div class="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div class="text-slate-400 font-mono">Orders</div>
            <div class="text-white font-bold mt-1">Port 3002</div>
            <div class="text-emerald-400 text-[10px]">Healthy</div>
          </div>
          <div class="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div class="text-slate-400 font-mono">Inventory</div>
            <div class="text-white font-bold mt-1">Port 3003</div>
            <div class="text-emerald-400 text-[10px]">Healthy</div>
          </div>
        </div>

        <div class="pt-4 flex justify-between items-center border-t border-slate-800 text-xs">
          <span class="text-slate-400">Direct Infrastructure Links</span>
          <div class="flex gap-2">
            <a href="http://" + window.location.hostname + ":15672" target="_blank" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg border border-slate-700">
              RabbitMQ Console
            </a>
            <a href="/healthz" target="_blank" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700">
              Raw /healthz
            </a>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- ========================================================================= -->
  <!-- CHECKOUT MODAL -->
  <!-- ========================================================================= -->
  <div id="checkoutModal" class="hidden fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white text-slate-900 max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5">
      <div class="flex justify-between items-center pb-3 border-b border-slate-100">
        <div>
          <h3 class="text-lg font-bold text-slate-900">Confirm Order Checkout</h3>
          <p class="text-xs text-slate-500">Atomic stock reservation via Redis distributed lock</p>
        </div>
        <button onclick="closeCheckoutModal()" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Itemized Cart Review -->
      <div id="checkoutModalItems" class="space-y-2 max-h-56 overflow-y-auto custom-scroll pr-1 divide-y divide-slate-100">
        <!-- Dynamically injected -->
      </div>

      <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
        <div class="flex justify-between text-slate-600">
          <span>Total Order Value:</span>
          <span id="checkoutModalTotal" class="font-bold text-base font-mono text-slate-900">$0.00</span>
        </div>
        <div class="flex justify-between text-slate-500 text-[11px]">
          <span>Event Message Target:</span>
          <span class="font-mono text-blue-600">amqp://ecommerce.events/order.created</span>
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button onclick="closeCheckoutModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition">
          Continue Shopping
        </button>
        <button id="confirmOrderBtn" onclick="executeCheckoutOrder()" class="flex-1 bg-slate-950 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2">
          <i class="fa-solid fa-lock text-xs text-emerald-400"></i> Place Order
        </button>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- ORDER DETAILS POPUP MODAL (For My Orders history) -->
  <!-- ========================================================================= -->
  <div id="orderDetailPopup" class="hidden fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white text-slate-900 max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5">
      <div class="flex justify-between items-center pb-3 border-b border-slate-100">
        <div>
          <span id="popupOrderId" class="text-xs font-mono font-bold text-blue-600">Order #1</span>
          <h3 class="text-lg font-bold text-slate-900">Receipt & Item Breakdown</h3>
        </div>
        <button onclick="closeOrderDetailPopup()" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
        <div class="flex justify-between text-slate-600">
          <span>Status:</span>
          <span id="popupOrderStatus" class="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-[10px]">PENDING</span>
        </div>
        <div class="flex justify-between text-slate-600">
          <span>Date Placed:</span>
          <span id="popupOrderDate" class="font-mono text-slate-800">--</span>
        </div>
        <div class="flex justify-between text-slate-600">
          <span>Event Queue:</span>
          <span class="text-emerald-600 font-mono font-semibold">notification.order.created (Acked)</span>
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Purchased Items</h4>
        <div id="popupOrderItemsList" class="space-y-2 max-h-48 overflow-y-auto custom-scroll pr-1 divide-y divide-slate-100">
          <!-- Dynamically populated -->
        </div>
      </div>

      <div class="flex justify-between items-center pt-3 border-t border-slate-100">
        <span class="text-sm font-semibold text-slate-700">Total Billed:</span>
        <span id="popupOrderTotal" class="text-xl font-bold font-mono text-slate-950">$0.00</span>
      </div>

      <button onclick="closeOrderDetailPopup()" class="w-full bg-slate-950 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs transition">
        Close Window
      </button>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- COLLAPSIBLE TERMINAL / DEVELOPER DEBUG DRAWER (AT BOTTOM) -->
  <!-- ========================================================================= -->
  <div id="bottomDebugDrawer" class="sticky bottom-0 z-30 transition-all duration-300 bg-[#151d27] border-t border-slate-800 shadow-2xl">
    <!-- Header Bar (Discrete, Clean Strip) -->
    <div onclick="toggleBottomDrawer()" class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex justify-between items-center cursor-pointer select-none">
      <div class="flex items-center space-x-3 text-xs">
        <span class="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-mono font-bold flex items-center gap-1.5">
          <i class="fa-solid fa-terminal text-[10px]"></i> DevOps Trace Drawer
        </span>
        <span class="text-slate-400 hidden sm:inline">&bull; 8 Microservices Healthy</span>
        <span id="drawerEventCounter" class="text-emerald-400 font-mono text-[11px]">0 events logged</span>
      </div>

      <div class="flex items-center space-x-4 text-xs">
        <span id="drawerChevron" class="text-slate-400 flex items-center gap-1">
          <span class="text-[11px] hidden sm:inline" id="drawerStateLabel">Show Logs</span>
          <i class="fa-solid fa-chevron-up transition-transform duration-200"></i>
        </span>
      </div>
    </div>

    <!-- Drawer Terminal Body (Collapsed by Default) -->
    <div id="bottomDrawerBody" class="hidden max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-4">
      <div class="flex justify-between items-center mb-2 text-xs">
        <span class="text-slate-400 font-mono text-[11px]">W3C traceparent & Distributed OpenTelemetry Stream:</span>
        <button onclick="clearDebugTerminal()" class="text-slate-500 hover:text-slate-300 text-[11px]">Clear Console</button>
      </div>
      <div id="terminalStream" class="h-44 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono space-y-1 custom-scroll text-slate-300">
        <div class="text-slate-500">[system] Gateway reverse proxy ready on port 3000</div>
        <div class="text-slate-500">[system] W3C traceparent context propagation active</div>
      </div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toastNotification" class="fixed bottom-14 right-6 z-50 transform translate-y-24 opacity-0 transition-all duration-300 bg-slate-900 border border-blue-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-sm">
    <i id="toastNotificationIcon" class="fa-solid fa-circle-check text-emerald-400 text-base"></i>
    <span id="toastNotificationText">Success</span>
  </div>

  <!-- ========================================================================= -->
  <!-- JAVASCRIPT APPLICATION CORE -->
  <!-- ========================================================================= -->
  <script>
    // State management
    let jwtToken = localStorage.getItem('app_jwt_token') || '';
    let authenticatedUser = JSON.parse(localStorage.getItem('app_user') || 'null');
    let catalogItems = [];
    let shoppingCart = JSON.parse(localStorage.getItem('app_cart') || '[]');
    let userOrders = [];
    let activeCategory = 'all';
    let isDrawerOpen = false;

    // High quality product images mapping
    const productImages = {
      1: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&auto=format&fit=crop&q=80', // Monitor
      2: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=80', // Keyboard
      3: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&auto=format&fit=crop&q=80', // Mouse
      4: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80', // Headphones
      5: 'https://images.unsplash.com/photo-1622434641406-a158123450f9?w=500&auto=format&fit=crop&q=80', // Dock
      6: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=80', // Smartphone
      7: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&auto=format&fit=crop&q=80', // Dress
      8: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=80'  // Jacket
    };

    window.addEventListener('DOMContentLoaded', () => {
      document.getElementById('topRabbitLink').href = 'http://' + window.location.hostname + ':15672';
      
      if (!jwtToken) {
        initAutoLogin();
      } else {
        updateProfileDisplay();
        fetchInventory();
        fetchOrders();
      }
      renderCartUI();
    });

    // -------------------------------------------------------------------------
    // Logging / Terminal Drawer
    // -------------------------------------------------------------------------
    function pushTrace(msg, type = 'info') {
      const term = document.getElementById('terminalStream');
      const time = new Date().toLocaleTimeString();
      let color = 'text-emerald-400';
      if (type === 'error') color = 'text-rose-400';
      if (type === 'warn') color = 'text-amber-400';
      if (type === 'sys') color = 'text-slate-500';

      const line = document.createElement('div');
      line.className = color;
      line.innerHTML = \`<span class="text-slate-600">[\${time}]</span> \${msg}\`;
      term.appendChild(line);
      term.scrollTop = term.scrollHeight;

      const count = term.children.length;
      document.getElementById('drawerEventCounter').textContent = \`\${count} events logged\`;
    }

    function clearDebugTerminal() {
      document.getElementById('terminalStream').innerHTML = '';
      document.getElementById('drawerEventCounter').textContent = '0 events logged';
    }

    function toggleBottomDrawer() {
      isDrawerOpen = !isDrawerOpen;
      const body = document.getElementById('bottomDrawerBody');
      const chevron = document.querySelector('#drawerChevron i');
      const label = document.getElementById('drawerStateLabel');

      if (isDrawerOpen) {
        body.classList.remove('hidden');
        chevron.classList.add('rotate-180');
        label.textContent = 'Hide Logs';
      } else {
        body.classList.add('hidden');
        chevron.classList.remove('rotate-180');
        label.textContent = 'Show Logs';
      }
    }

    function popToast(msg, type = 'success') {
      const toast = document.getElementById('toastNotification');
      const text = document.getElementById('toastNotificationText');
      const icon = document.getElementById('toastNotificationIcon');

      text.textContent = msg;
      if (type === 'error') {
        icon.className = 'fa-solid fa-circle-xmark text-rose-400 text-base';
      } else {
        icon.className = 'fa-solid fa-circle-check text-emerald-400 text-base';
      }

      toast.classList.remove('translate-y-24', 'opacity-0');
      setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
      }, 3000);
    }

    // -------------------------------------------------------------------------
    // Navigation Routing
    // -------------------------------------------------------------------------
    function switchNavTab(tabName) {
      ['dashboard', 'catalog', 'orders', 'customers', 'settings'].forEach(name => {
        const view = document.getElementById(\`view-\${name}\`);
        if (view) view.classList.add('hidden');
        const link = document.getElementById(\`navTab-\${name}\`);
        if (link) {
          link.className = 'nav-link text-slate-400 hover:text-white pb-1 transition flex items-center gap-2';
        }
      });

      const activeView = document.getElementById(\`view-\${tabName}\`);
      if (activeView) activeView.classList.remove('hidden');
      const activeLink = document.getElementById(\`navTab-\${tabName}\`);
      if (activeLink) {
        activeLink.className = 'nav-link text-sky-400 border-b-2 border-sky-400 pb-1 font-semibold flex items-center gap-2';
      }

      if (tabName === 'catalog') renderCatalogTable();
      if (tabName === 'orders') fetchOrders();
    }

    // -------------------------------------------------------------------------
    // Authentication
    // -------------------------------------------------------------------------
    async function initAutoLogin() {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'customer@ecommerce.local', password: 'Password123!' })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          storeAuth(data.token, data.user);
        } else {
          await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'DevOps Customer', email: 'customer@ecommerce.local', password: 'Password123!' })
          });
          const retry = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'customer@ecommerce.local', password: 'Password123!' })
          });
          const retryData = await retry.json();
          if (retry.ok && retryData.token) {
            storeAuth(retryData.token, retryData.user);
          }
        }
      } catch (err) {
        pushTrace('Auth bootstrap: ' + err.message, 'sys');
      } finally {
        fetchInventory();
        fetchOrders();
      }
    }

    function storeAuth(token, user) {
      jwtToken = token;
      authenticatedUser = user;
      localStorage.setItem('app_jwt_token', token);
      localStorage.setItem('app_user', JSON.stringify(user));
      updateProfileDisplay();
      pushTrace(\`Session established for \${user.email || 'customer'}\`);
    }

    function updateProfileDisplay() {
      const email = authenticatedUser ? (authenticatedUser.email || 'customer@ecommerce.local') : 'customer@ecommerce.local';
      const name = authenticatedUser ? (authenticatedUser.name || 'Customer') : 'Customer';
      document.getElementById('customerEmailHeader').textContent = email;
      document.getElementById('customerNameHeader').textContent = name;
      document.getElementById('jwtTokenString').textContent = jwtToken;
    }

    async function handleUserLogin() {
      const email = document.getElementById('switchEmailInput').value;
      const password = document.getElementById('switchPassInput').value;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          storeAuth(data.token, data.user);
          popToast('Logged in successfully!');
        } else {
          popToast(data.message || 'Login failed', 'error');
        }
      } catch (e) {
        popToast(e.message, 'error');
      }
    }

    async function handleUserRegister() {
      const email = document.getElementById('switchEmailInput').value;
      const password = document.getElementById('switchPassInput').value;
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Store Customer', email, password })
        });
        const data = await res.json();
        if (res.ok) {
          popToast('Registration successful! Signing in...');
          handleUserLogin();
        } else {
          popToast(data.message || 'Registration failed', 'error');
        }
      } catch (e) {
        popToast(e.message, 'error');
      }
    }

    function copyTokenToClipboard() {
      navigator.clipboard.writeText(jwtToken);
      popToast('Token copied to clipboard');
    }

    // -------------------------------------------------------------------------
    // Product Catalog & Inventory
    // -------------------------------------------------------------------------
    async function fetchInventory() {
      try {
        const headers = jwtToken ? { 'Authorization': \`Bearer \${jwtToken}\` } : {};
        const res = await fetch('/api/inventory?limit=50', { headers });
        const data = await res.json();
        catalogItems = data.products || data.data || [];

        if (catalogItems.length === 0) {
          await handleSeedCatalog(false);
          return;
        }

        renderProducts(catalogItems);
        renderCatalogTable();
        pushTrace(\`Catalog synchronized: \${catalogItems.length} products loaded from port 3003\`);
      } catch (err) {
        pushTrace('Inventory sync failure: ' + err.message, 'error');
      }
    }

    async function handleSeedCatalog(notify = true) {
      try {
        const headers = jwtToken ? { 'Authorization': \`Bearer \${jwtToken}\` } : {};
        const res = await fetch('/api/inventory/seed', { method: 'POST', headers });
        const data = await res.json();
        if (notify) popToast(data.message || 'Products seeded!');
        const fetchRes = await fetch('/api/inventory?limit=50', { headers });
        const fetchData = await fetchRes.json();
        catalogItems = fetchData.products || fetchData.data || [];
        renderProducts(catalogItems);
        renderCatalogTable();
      } catch (err) {
        if (notify) popToast('Seeding error: ' + err.message, 'error');
      }
    }

    function filterByCategory(category) {
      activeCategory = category;
      document.querySelectorAll('#categoryChips .cat-chip').forEach(c => {
        c.className = 'cat-chip px-3.5 py-1 rounded-lg text-xs font-medium bg-[#1e293b] text-slate-300 hover:bg-slate-800 transition whitespace-nowrap border border-slate-700/60';
      });
      event.target.className = 'cat-chip active px-3.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 text-white transition whitespace-nowrap shadow-sm';
      applyCatalogFilters();
    }

    function applyCatalogFilters() {
      const q = document.getElementById('productSearchInput').value.toLowerCase();
      const filtered = catalogItems.filter(p => {
        const matchesQuery = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
        let matchesCat = true;
        if (activeCategory !== 'all') {
          matchesCat = p.name.toLowerCase().includes(activeCategory.toLowerCase()) || 
                       p.sku.toLowerCase().includes(activeCategory.substring(0, 3).toLowerCase());
        }
        return matchesQuery && matchesCat;
      });
      renderProducts(filtered);
    }

    // Render White Cards matching reference image
    function renderProducts(products) {
      const container = document.getElementById('productGridContainer');
      if (products.length === 0) {
        container.innerHTML = \`
          <div class="col-span-full py-16 text-center text-slate-400 space-y-2">
            <i class="fa-solid fa-box-open text-3xl text-slate-500"></i>
            <p class="text-xs">No products found matching your filter criteria</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = products.map((p, idx) => {
        const imgUrl = productImages[p.id] || productImages[(idx % 8) + 1];
        return \`
          <div class="bg-white text-slate-900 rounded-2xl p-3.5 shadow-md border border-slate-200/90 hover:shadow-xl transition-all duration-200 flex flex-col justify-between group">
            <div>
              <!-- Product Image Container -->
              <div class="h-36 rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center mb-3 relative">
                <img src="\${imgUrl}" alt="\${p.name}" class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300">
                <span class="absolute top-2 left-2 bg-slate-950/70 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                  \${p.sku}
                </span>
              </div>

              <!-- Product Info -->
              <h3 class="font-bold text-xs text-slate-800 leading-tight mb-1 truncate" title="\${p.name}">\${p.name}</h3>
              <p class="text-[10px] text-slate-400 mb-2">\${p.stock > 0 ? \`\${p.stock} in stock\` : 'Out of stock'}</p>
            </div>

            <!-- Price & Add to Cart -->
            <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span class="text-sm font-extrabold text-slate-900 font-mono">$\${Number(p.price).toFixed(2)}</span>
              <button onclick="addProductToCart(\${p.id})" class="bg-[#1e60d5] hover:bg-blue-600 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-sm">
                <i class="fa-solid fa-cart-plus text-[10px]"></i> Add to Cart
              </button>
            </div>
          </div>
        \`;
      }).join('');
    }

    function renderCatalogTable() {
      const tbody = document.getElementById('catalogTableBody');
      if (!tbody) return;
      tbody.innerHTML = catalogItems.map(p => \`
        <tr class="hover:bg-slate-900/40 transition">
          <td class="p-3.5 font-mono text-slate-400">#\${p.id}</td>
          <td class="p-3.5 font-semibold text-white">\${p.name}</td>
          <td class="p-3.5 font-mono text-slate-400">\${p.sku}</td>
          <td class="p-3.5 font-bold font-mono text-emerald-400">$\${Number(p.price).toFixed(2)}</td>
          <td class="p-3.5">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold \${p.stock > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400'}">
              \${p.stock} Units
            </span>
          </td>
          <td class="p-3.5 text-right">
            <button onclick="addProductToCart(\${p.id}); switchNavTab('dashboard');" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold">
              Add to Cart
            </button>
          </td>
        </tr>
      \`).join('');
    }

    // -------------------------------------------------------------------------
    // Shopping Cart & Checkout
    // -------------------------------------------------------------------------
    function addProductToCart(productId) {
      const product = catalogItems.find(p => p.id === productId);
      if (!product) return;

      const existing = shoppingCart.find(i => i.id === productId);
      if (existing) {
        if (existing.quantity >= product.stock) {
          popToast('Max available stock in cart', 'error');
          return;
        }
        existing.quantity += 1;
      } else {
        shoppingCart.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.price),
          quantity: 1,
          maxStock: product.stock
        });
      }

      persistCart();
      renderCartUI();
      popToast(\`Added \${product.name} to cart\`);
      pushTrace(\`Cart: Added item #\${product.id} (Qty: 1)\`);
    }

    function modifyCartItemQuantity(productId, delta) {
      const item = shoppingCart.find(i => i.id === productId);
      if (!item) return;

      item.quantity += delta;
      if (item.quantity <= 0) {
        shoppingCart = shoppingCart.filter(i => i.id !== productId);
      } else if (item.quantity > item.maxStock) {
        item.quantity = item.maxStock;
        popToast('Max available stock reached', 'error');
      }

      persistCart();
      renderCartUI();
    }

    function persistCart() {
      localStorage.setItem('app_cart', JSON.stringify(shoppingCart));
    }

    function renderCartUI() {
      const listEl = document.getElementById('cartItemsList');
      const countBadge = document.getElementById('cartHeaderBadge');
      const subtotalEl = document.getElementById('cartSubtotalText');
      const totalEl = document.getElementById('cartTotalText');
      const checkoutBtn = document.getElementById('cartCheckoutBtn');

      persistCart();

      const totalItemCount = shoppingCart.reduce((acc, item) => acc + item.quantity, 0);
      countBadge.textContent = \`\${totalItemCount} Items\`;

      if (shoppingCart.length === 0) {
        listEl.innerHTML = \`
          <div class="py-8 text-center text-slate-400 space-y-2">
            <i class="fa-solid fa-cart-shopping text-2xl text-slate-300"></i>
            <p class="text-xs">Your cart is currently empty</p>
            <p class="text-[10px] text-slate-400">Click "Add to Cart" on any product</p>
          </div>
        \`;
        subtotalEl.textContent = '$0.00';
        totalEl.textContent = '$0.00';
        checkoutBtn.disabled = true;
        return;
      }

      checkoutBtn.disabled = false;
      let grandTotal = 0;

      listEl.innerHTML = shoppingCart.map((item, idx) => {
        const itemLineTotal = item.price * item.quantity;
        grandTotal += itemLineTotal;
        const imgUrl = productImages[item.id] || productImages[(idx % 8) + 1];

        return \`
          <div class="py-2.5 flex items-center justify-between gap-3 text-xs">
            <img src="\${imgUrl}" class="w-10 h-10 object-cover rounded-lg border border-slate-200">
            <div class="flex-1 min-w-0">
              <h4 class="font-bold text-slate-800 truncate" title="\${item.name}">\${item.name}</h4>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-[10px] text-slate-400 font-mono">$\${item.price.toFixed(2)}</span>
                <div class="flex items-center gap-1.5 bg-slate-100 rounded px-1.5 py-0.5">
                  <button onclick="modifyCartItemQuantity(\${item.id}, -1)" class="text-slate-600 hover:text-black">&minus;</button>
                  <span class="font-bold text-slate-800 text-[10px]">\${item.quantity}</span>
                  <button onclick="modifyCartItemQuantity(\${item.id}, 1)" class="text-slate-600 hover:text-black">&plus;</button>
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-bold font-mono text-slate-900">$\${itemLineTotal.toFixed(2)}</div>
              <button onclick="modifyCartItemQuantity(\${item.id}, -999)" class="text-[10px] text-rose-500 hover:underline">Remove</button>
            </div>
          </div>
        \`;
      }).join('');

      subtotalEl.textContent = \`$\${grandTotal.toFixed(2)}\`;
      totalEl.textContent = \`$\${grandTotal.toFixed(2)}\`;
    }

    function openCheckoutModal() {
      if (shoppingCart.length === 0) return;
      const modal = document.getElementById('checkoutModal');
      const itemsContainer = document.getElementById('checkoutModalItems');
      const totalEl = document.getElementById('checkoutModalTotal');

      let grandTotal = 0;
      itemsContainer.innerHTML = shoppingCart.map(item => {
        const line = item.price * item.quantity;
        grandTotal += line;
        return \`
          <div class="py-2 flex justify-between items-center text-xs">
            <div>
              <div class="font-bold text-slate-800">\${item.name}</div>
              <div class="text-[10px] text-slate-400">Qty: \${item.quantity} &times; $\${item.price.toFixed(2)}</div>
            </div>
            <span class="font-mono font-bold text-slate-900">$\${line.toFixed(2)}</span>
          </div>
        \`;
      }).join('');

      totalEl.textContent = \`$\${grandTotal.toFixed(2)}\`;
      modal.classList.remove('hidden');
    }

    function closeCheckoutModal() {
      document.getElementById('checkoutModal').classList.add('hidden');
    }

    async function executeCheckoutOrder() {
      if (!jwtToken) {
        popToast('Please authenticate first', 'error');
        closeCheckoutModal();
        switchNavTab('customers');
        return;
      }

      const btn = document.getElementById('confirmOrderBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Locking Stock via Redis...';

      const items = shoppingCart.map(i => ({
        productId: i.id,
        quantity: i.quantity,
        price: i.price
      }));

      pushTrace(\`Executing order checkout for \${items.length} unique products...\`);

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${jwtToken}\`
          },
          body: JSON.stringify({ items })
        });
        const data = await res.json();

        if (res.ok) {
          pushTrace(\`Order #\${data.id || data.orderId} written to MySQL. RabbitMQ event broadcast.\`);
          shoppingCart = [];
          persistCart();
          renderCartUI();
          closeCheckoutModal();

          popToast(\`Order #\${data.id || data.orderId} confirmed successfully!\`);
          fetchOrders();
          fetchInventory();
          switchNavTab('orders');
        } else {
          popToast(data.message || 'Checkout error', 'error');
          pushTrace(\`Checkout rejected: \${JSON.stringify(data)}\`, 'error');
        }
      } catch (err) {
        popToast('Checkout network exception: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-lock text-xs text-emerald-400"></i> Place Order';
      }
    }

    // -------------------------------------------------------------------------
    // Order History & Detail Modal
    // -------------------------------------------------------------------------
    async function fetchOrders() {
      if (!jwtToken) return;
      try {
        const res = await fetch('/api/orders', {
          headers: { 'Authorization': \`Bearer \${jwtToken}\` }
        });
        const data = await res.json();
        userOrders = data.orders || [];

        const tabBadge = document.getElementById('ordersTabCount');
        if (userOrders.length > 0) {
          tabBadge.textContent = userOrders.length;
          tabBadge.classList.remove('hidden');
        } else {
          tabBadge.classList.add('hidden');
        }

        renderOrdersList(userOrders);
        pushTrace(\`Fetched \${userOrders.length} order history records from MySQL\`);
      } catch (err) {
        pushTrace('Order history fetch error: ' + err.message, 'error');
      }
    }

    function renderOrdersList(orders) {
      const container = document.getElementById('ordersListContainer');
      if (!container) return;

      if (orders.length === 0) {
        container.innerHTML = \`
          <div class="bg-[#182230] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
            <i class="fa-solid fa-receipt text-3xl text-slate-600"></i>
            <p class="text-sm font-medium">No order transactions found.</p>
            <button onclick="switchNavTab('dashboard')" class="text-xs text-sky-400 hover:underline">Explore Products</button>
          </div>
        \`;
        return;
      }

      container.innerHTML = orders.map(o => {
        const dateStr = new Date(o.createdAt || o.created_at).toLocaleString();
        const count = o.items ? o.items.length : 1;
        return \`
          <div class="bg-[#182230] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition shadow-md">
            <div>
              <div class="flex items-center gap-3">
                <span class="font-mono text-sm font-bold text-white">Order #\${o.id}</span>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  \${o.status.toUpperCase()}
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-1">
                <span>\${dateStr}</span> &bull; <span>\${count} \${count === 1 ? 'item' : 'items'}</span>
              </p>
            </div>

            <div class="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <div class="text-right">
                <span class="text-[10px] text-slate-400 uppercase font-semibold block">Total</span>
                <span class="text-base font-bold font-mono text-emerald-400">$\${Number(o.total).toFixed(2)}</span>
              </div>
              <button onclick="openOrderDetailPopup(\${o.id})" class="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm">
                <i class="fa-solid fa-file-invoice text-xs"></i> View Receipt
              </button>
            </div>
          </div>
        \`;
      }).join('');
    }

    function openOrderDetailPopup(orderId) {
      const order = userOrders.find(o => o.id === orderId);
      if (!order) return;

      document.getElementById('popupOrderId').textContent = \`Order #\${order.id}\`;
      document.getElementById('popupOrderStatus').textContent = order.status.toUpperCase();
      document.getElementById('popupOrderDate').textContent = new Date(order.createdAt || order.created_at).toLocaleString();
      document.getElementById('popupOrderTotal').textContent = \`$\${Number(order.total).toFixed(2)}\`;

      const listContainer = document.getElementById('popupOrderItemsList');
      const items = order.items || [];

      if (items.length === 0) {
        listContainer.innerHTML = '<div class="py-2 text-xs text-slate-400">Item records stored in MySQL order_items</div>';
      } else {
        listContainer.innerHTML = items.map(item => {
          const match = catalogItems.find(p => p.id === (item.productId || item.product_id));
          const name = match ? match.name : \`Product Item #\${item.productId || item.product_id}\`;
          const lineTotal = Number(item.price) * Number(item.quantity);
          return \`
            <div class="py-2 flex justify-between items-center text-xs">
              <div>
                <div class="font-bold text-slate-800">\${name}</div>
                <div class="text-[10px] text-slate-400">Qty: \${item.quantity} &times; $\${Number(item.price).toFixed(2)}</div>
              </div>
              <span class="font-mono font-bold text-slate-900">$\${lineTotal.toFixed(2)}</span>
            </div>
          \`;
        }).join('');
      }

      document.getElementById('orderDetailPopup').classList.remove('hidden');
    }

    function closeOrderDetailPopup() {
      document.getElementById('orderDetailPopup').classList.add('hidden');
    }

    function openAddProductModal() {
      popToast('Seeding new product catalog items...');
      handleSeedCatalog();
    }
  </script>
</body>
</html>`;
