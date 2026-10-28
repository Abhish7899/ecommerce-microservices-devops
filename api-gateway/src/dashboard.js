export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ApexStore &mdash; Distributed E-Commerce</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    pre, code, .font-mono { font-family: 'JetBrains Mono', monospace; }
    .glass-card { background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .glass-nav { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
    .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scroll::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.6); border-radius: 9999px; }
    .badge-glow { box-shadow: 0 0 12px rgba(16, 185, 129, 0.3); }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">

  <!-- ========================================================================= -->
  <!-- TOP NAVIGATION HEADER -->
  <!-- ========================================================================= -->
  <header class="glass-nav sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Brand Logo -->
        <div class="flex items-center space-x-3 cursor-pointer" onclick="switchTab('catalog')">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <i class="fa-solid fa-bolt-lightning text-white text-lg"></i>
          </div>
          <div>
            <div class="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              ApexStore
            </div>
            <div class="text-[10px] text-emerald-400 font-medium tracking-wide flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Microservices Live
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <nav class="hidden md:flex items-center space-x-1">
          <button onclick="switchTab('catalog')" id="tabBtn-catalog" class="tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-800 border border-slate-700 transition flex items-center gap-2">
            <i class="fa-solid fa-shop text-indigo-400"></i> Store Catalog
          </button>
          <button onclick="switchTab('orders')" id="tabBtn-orders" class="tab-btn px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition flex items-center gap-2">
            <i class="fa-solid fa-box-archive text-slate-400"></i> My Orders
            <span id="ordersCountBadge" class="hidden px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-bold">0</span>
          </button>
          <button onclick="switchTab('account')" id="tabBtn-account" class="tab-btn px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition flex items-center gap-2">
            <i class="fa-solid fa-user text-slate-400"></i> Account
            <span id="accountStatusDot" class="w-2 h-2 rounded-full bg-amber-400"></span>
          </button>
        </nav>

        <!-- Right Side: Cart Button & Quick User -->
        <div class="flex items-center space-x-3">
          <button onclick="handleSeedCatalog()" title="Seed Demo Products" class="hidden sm:flex text-xs text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-lg transition items-center gap-1.5">
            <i class="fa-solid fa-database text-emerald-400"></i> Seed Catalog
          </button>

          <!-- Shopping Cart Button with Live Counter -->
          <button onclick="toggleCartDrawer(true)" class="relative bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-lg shadow-indigo-600/30 flex items-center gap-2.5">
            <i class="fa-solid fa-bag-shopping text-base"></i>
            <span class="hidden sm:inline">Cart</span>
            <span id="cartCountBadge" class="bg-white text-indigo-900 text-xs font-black px-2 py-0.5 rounded-full shadow-sm">0</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation Sub-bar -->
    <div class="md:hidden flex border-t border-slate-800/80 bg-slate-900/60 px-4 py-2 justify-around text-xs">
      <button onclick="switchTab('catalog')" class="py-1 text-indigo-400 font-semibold flex items-center gap-1">
        <i class="fa-solid fa-shop"></i> Store
      </button>
      <button onclick="switchTab('orders')" class="py-1 text-slate-400 hover:text-white flex items-center gap-1">
        <i class="fa-solid fa-box-archive"></i> Orders
      </button>
      <button onclick="switchTab('account')" class="py-1 text-slate-400 hover:text-white flex items-center gap-1">
        <i class="fa-solid fa-user"></i> Account
      </button>
    </div>
  </header>

  <!-- ========================================================================= -->
  <!-- MAIN CONTENT CONTAINER -->
  <!-- ========================================================================= -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

    <!-- --------------------------------------------------------------------- -->
    <!-- TAB 1: PRODUCT CATALOG & STOREFRONT -->
    <!-- --------------------------------------------------------------------- -->
    <div id="tabContent-catalog" class="space-y-6">
      
      <!-- Storefront Hero Banner -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/20 p-8 shadow-2xl">
        <div class="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="max-w-2xl relative z-10 space-y-3">
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
            Redis Concurrency Engine &bull; Zero Overselling
          </span>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            High-Performance Hardware & Accessories
          </h2>
          <p class="text-sm text-slate-300 leading-relaxed">
            All purchases are protected by Redis distributed locking (<code class="text-emerald-400">SETNX</code>) and asynchronous order processing powered by RabbitMQ message queues.
          </p>
        </div>
      </div>

      <!-- Search, Categories & Filter Bar -->
      <div class="glass-card p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center">
        <!-- Search Input -->
        <div class="relative w-full md:w-80">
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
          <input id="searchInput" oninput="filterCatalog()" type="text" placeholder="Search by product name or SKU..." class="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition">
        </div>

        <!-- Category Filters -->
        <div class="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0" id="categoryFilterBar">
          <button onclick="setCategoryFilter('all')" class="cat-pill active px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white transition whitespace-nowrap">
            All Products
          </button>
          <button onclick="setCategoryFilter('Monitors')" class="cat-pill px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition whitespace-nowrap">
            Monitors
          </button>
          <button onclick="setCategoryFilter('Keyboards')" class="cat-pill px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition whitespace-nowrap">
            Keyboards
          </button>
          <button onclick="setCategoryFilter('Audio')" class="cat-pill px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition whitespace-nowrap">
            Audio
          </button>
          <button onclick="setCategoryFilter('Accessories')" class="cat-pill px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition whitespace-nowrap">
            Accessories
          </button>
        </div>

        <!-- Live Refresh & View Controls -->
        <div class="flex items-center space-x-2 w-full md:w-auto justify-end">
          <button onclick="fetchInventory()" class="text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl transition flex items-center gap-1.5">
            <i class="fa-solid fa-rotate text-indigo-400"></i> Refresh
          </button>
        </div>
      </div>

      <!-- Products Grid -->
      <div id="productsGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <!-- Rendered Dynamically -->
        <div class="col-span-full py-16 text-center text-slate-500">
          <i class="fa-solid fa-spinner fa-spin text-2xl mb-3 text-indigo-400"></i>
          <p class="text-sm">Connecting to Inventory Service on port 3003...</p>
        </div>
      </div>
    </div>

    <!-- --------------------------------------------------------------------- -->
    <!-- TAB 2: MY ORDERS HISTORY -->
    <!-- --------------------------------------------------------------------- -->
    <div id="tabContent-orders" class="hidden space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-white tracking-tight">Order History</h2>
          <p class="text-xs text-slate-400">Live order records retrieved directly from Order Service & MySQL database</p>
        </div>
        <button onclick="fetchOrders()" class="text-xs text-indigo-400 hover:text-indigo-300 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl transition flex items-center gap-1.5">
          <i class="fa-solid fa-rotate"></i> Refresh Orders
        </button>
      </div>

      <!-- Orders List Container -->
      <div id="ordersContainer" class="space-y-4">
        <div class="glass-card p-12 text-center rounded-2xl text-slate-400 space-y-3">
          <i class="fa-solid fa-receipt text-3xl text-slate-600"></i>
          <p class="text-sm">No orders found for this account.</p>
          <button onclick="switchTab('catalog')" class="text-xs text-indigo-400 hover:underline">Explore the Catalog</button>
        </div>
      </div>
    </div>

    <!-- --------------------------------------------------------------------- -->
    <!-- TAB 3: ACCOUNT & AUTHENTICATION -->
    <!-- --------------------------------------------------------------------- -->
    <div id="tabContent-account" class="hidden max-w-2xl mx-auto space-y-6">
      <div class="glass-card p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        
        <!-- Account Status Header -->
        <div class="flex items-center justify-between pb-6 border-b border-slate-800">
          <div class="flex items-center space-x-4">
            <div class="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl font-bold">
              <i class="fa-solid fa-user-shield"></i>
            </div>
            <div>
              <h3 id="profileNameDisplay" class="text-lg font-bold text-white">Guest User</h3>
              <p id="profileEmailDisplay" class="text-xs text-slate-400">Not authenticated</p>
            </div>
          </div>
          <span id="profileBadge" class="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-400">
            Guest
          </span>
        </div>

        <!-- Authentication Form -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-white uppercase tracking-wider text-slate-300">
            Sign In or Register
          </h4>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Full Name (for new registration)</label>
              <input id="accNameInput" type="text" value="DevOps Customer" class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
              <input id="accEmailInput" type="email" value="customer@ecommerce.local" class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Password</label>
              <input id="accPassInput" type="password" value="Password123!" class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 pt-2">
            <button onclick="handleAccountLogin()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2">
              <i class="fa-solid fa-right-to-bracket"></i> Sign In
            </button>
            <button onclick="handleAccountRegister()" class="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-sm transition border border-slate-700 flex items-center justify-center gap-2">
              <i class="fa-solid fa-user-plus text-indigo-400"></i> Register New
            </button>
          </div>
        </div>

        <!-- Active JWT Token Inspect Box -->
        <div id="jwtTokenBox" class="hidden bg-slate-950/80 p-4 rounded-2xl border border-indigo-500/20 space-y-2">
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-400 font-medium">Active JWT Token (HS256)</span>
            <button onclick="copyAuthToken()" class="text-indigo-400 hover:text-indigo-300 font-semibold text-xs flex items-center gap-1">
              <i class="fa-regular fa-copy"></i> Copy Token
            </button>
          </div>
          <p id="jwtTokenDisplay" class="font-mono text-xs text-emerald-400 break-all select-all line-clamp-3"></p>
        </div>
      </div>
    </div>
  </main>

  <!-- ========================================================================= -->
  <!-- SHOPPING CART SLIDE-OVER DRAWER -->
  <!-- ========================================================================= -->
  <div id="cartDrawerBackdrop" onclick="toggleCartDrawer(false)" class="hidden fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 transition-opacity"></div>
  
  <div id="cartDrawer" class="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl z-50 transform translate-x-full transition-transform duration-300 flex flex-col">
    <!-- Cart Header -->
    <div class="p-6 border-b border-slate-800 flex justify-between items-center">
      <div class="flex items-center space-x-2">
        <i class="fa-solid fa-bag-shopping text-indigo-400 text-lg"></i>
        <h3 class="text-lg font-bold text-white">Your Shopping Cart</h3>
      </div>
      <button onclick="toggleCartDrawer(false)" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <!-- Cart Items List -->
    <div id="cartItemsContainer" class="flex-1 overflow-y-auto p-6 space-y-4 custom-scroll">
      <!-- Items dynamically added -->
      <div class="text-center py-16 text-slate-500 space-y-2">
        <i class="fa-solid fa-cart-arrow-down text-3xl text-slate-600"></i>
        <p class="text-sm">Your shopping cart is empty.</p>
        <button onclick="toggleCartDrawer(false)" class="text-xs text-indigo-400 hover:underline">Start Shopping</button>
      </div>
    </div>

    <!-- Cart Summary & Checkout -->
    <div class="p-6 border-t border-slate-800 bg-slate-950/60 space-y-4">
      <div class="space-y-1.5 text-xs">
        <div class="flex justify-between text-slate-400">
          <span>Subtotal</span>
          <span id="cartSubtotal" class="font-mono text-white">$0.00</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Shipping (Express)</span>
          <span class="text-emerald-400 font-semibold">FREE</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Tax</span>
          <span class="font-mono text-white">$0.00</span>
        </div>
        <div class="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
          <span>Total Amount</span>
          <span id="cartTotal" class="font-mono text-emerald-400">$0.00</span>
        </div>
      </div>

      <button id="checkoutBtn" onclick="handleCheckout()" class="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
        <i class="fa-solid fa-lock text-xs"></i> Place Order with Redis Lock
      </button>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- ORDER DETAILS POPUP MODAL -->
  <!-- ========================================================================= -->
  <div id="orderDetailModal" class="hidden fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="glass-card max-w-lg w-full rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-6">
      <div class="flex justify-between items-center pb-4 border-b border-slate-800">
        <div>
          <span class="text-xs font-mono text-indigo-400" id="modalOrderId">Order #1</span>
          <h3 class="text-lg font-bold text-white">Order Receipt & Details</h3>
        </div>
        <button onclick="closeOrderModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Status Timeline -->
      <div class="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-400">Status</span>
          <span id="modalOrderStatus" class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Pending</span>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-400">Order Placed At</span>
          <span id="modalOrderDate" class="text-slate-200 font-mono">--</span>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-400">Event Dispatched</span>
          <span class="text-emerald-400 font-mono flex items-center gap-1">
            <i class="fa-solid fa-check text-[10px]"></i> RabbitMQ 'order.created'
          </span>
        </div>
      </div>

      <!-- Itemized Table -->
      <div class="space-y-2">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Purchased Items</h4>
        <div id="modalOrderItems" class="space-y-2 max-h-48 overflow-y-auto custom-scroll pr-1">
          <!-- Dynamically populated -->
        </div>
      </div>

      <!-- Order Total -->
      <div class="flex justify-between items-center pt-4 border-t border-slate-800">
        <span class="text-sm font-semibold text-slate-300">Total Charged</span>
        <span id="modalOrderTotal" class="text-xl font-bold font-mono text-emerald-400">$0.00</span>
      </div>

      <button onclick="closeOrderModal()" class="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-sm transition">
        Close Receipt
      </button>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- COLLAPSIBLE TERMINAL / DEVELOPER DEBUG DRAWER (AT BOTTOM) -->
  <!-- ========================================================================= -->
  <div id="debugDrawer" class="sticky bottom-0 z-30 transition-all duration-300 bg-slate-900/95 border-t border-slate-800 backdrop-blur-xl shadow-2xl">
    <!-- Header Bar (Always Visible as a Clean Strip) -->
    <div onclick="toggleDebugDrawer()" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex justify-between items-center cursor-pointer select-none">
      <div class="flex items-center space-x-3 text-xs">
        <span class="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 font-mono font-bold flex items-center gap-1.5">
          <i class="fa-solid fa-terminal text-[10px]"></i> DevOps Trace Console
        </span>
        <span class="hidden sm:inline text-slate-400">&bull; 8 Microservices Healthy</span>
        <span id="drawerLogCount" class="text-emerald-400 font-mono text-[11px]">0 events logged</span>
      </div>
      <div class="flex items-center space-x-4">
        <a href="http://" + window.location.hostname + ":15672" target="_blank" onclick="event.stopPropagation()" class="hidden md:flex text-[11px] text-amber-400 hover:underline items-center gap-1">
          <i class="fa-solid fa-server"></i> RabbitMQ Portal
        </a>
        <a href="/healthz" target="_blank" onclick="event.stopPropagation()" class="hidden md:flex text-[11px] text-slate-400 hover:text-white items-center gap-1">
          <i class="fa-solid fa-heart-pulse text-emerald-400"></i> /healthz
        </a>
        <span id="debugChevron" class="text-xs text-slate-400 flex items-center gap-1">
          <span class="text-[11px] hidden sm:inline" id="debugStateText">Show Logs</span>
          <i class="fa-solid fa-chevron-up transition-transform duration-200"></i>
        </span>
      </div>
    </div>

    <!-- Expandable Drawer Body (Hidden by default) -->
    <div id="debugDrawerContent" class="hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
      <div class="flex justify-between items-center mb-2 text-xs">
        <span class="text-slate-400 font-mono">W3C Traceparent & Request Header Stream:</span>
        <button onclick="clearConsoleLog()" class="text-slate-500 hover:text-slate-300 text-[11px]">Clear Console</button>
      </div>
      <div id="consoleTerminal" class="h-48 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono space-y-1 custom-scroll text-slate-300">
        <div class="text-slate-500">[init] API Gateway reverse proxy active on port 3000</div>
        <div class="text-slate-500">[init] OpenTelemetry W3C traceparent header propagation enabled</div>
      </div>
    </div>
  </div>

  <!-- Toast Notification Container -->
  <div id="toast" class="fixed bottom-14 right-6 z-50 transform translate-y-24 opacity-0 transition-all duration-300 bg-slate-900 border border-indigo-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-sm">
    <i id="toastIcon" class="fa-solid fa-circle-check text-emerald-400 text-base"></i>
    <span id="toastMsg">Operation successful</span>
  </div>

  <!-- ========================================================================= -->
  <!-- JAVASCRIPT APPLICATION CONTROLLER -->
  <!-- ========================================================================= -->
  <script>
    // Global Application State
    let authToken = localStorage.getItem('apex_jwt_token') || '';
    let currentAuthUser = JSON.parse(localStorage.getItem('apex_user') || 'null');
    let allProducts = [];
    let cart = JSON.parse(localStorage.getItem('apex_cart') || '[]');
    let allOrders = [];
    let currentCategory = 'all';
    let isDebugOpen = false;

    // Initialize application
    window.addEventListener('DOMContentLoaded', () => {
      // Auto-login default demo user if no token exists to ensure instant shopping experience
      if (!authToken) {
        autoLoginDemoUser();
      } else {
        updateAuthHeader();
        fetchInventory();
        fetchOrders();
      }
      renderCart();
    });

    // -------------------------------------------------------------------------
    // Toast Notification Utility
    // -------------------------------------------------------------------------
    function showToast(msg, type = 'success') {
      const toast = document.getElementById('toast');
      const toastMsg = document.getElementById('toastMsg');
      const toastIcon = document.getElementById('toastIcon');

      toastMsg.textContent = msg;
      if (type === 'error') {
        toastIcon.className = 'fa-solid fa-circle-xmark text-rose-400 text-base';
      } else {
        toastIcon.className = 'fa-solid fa-circle-check text-emerald-400 text-base';
      }

      toast.classList.remove('translate-y-24', 'opacity-0');
      setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
      }, 3200);
    }

    // -------------------------------------------------------------------------
    // Logging / Terminal Drawer
    // -------------------------------------------------------------------------
    function logTrace(msg, type = 'info') {
      const term = document.getElementById('consoleTerminal');
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

      // Update count badge
      const count = term.children.length;
      document.getElementById('drawerLogCount').textContent = \`\${count} events logged\`;
    }

    function clearConsoleLog() {
      document.getElementById('consoleTerminal').innerHTML = '';
      document.getElementById('drawerLogCount').textContent = '0 events logged';
    }

    function toggleDebugDrawer() {
      isDebugOpen = !isDebugOpen;
      const content = document.getElementById('debugDrawerContent');
      const chevron = document.querySelector('#debugChevron i');
      const text = document.getElementById('debugStateText');

      if (isDebugOpen) {
        content.classList.remove('hidden');
        chevron.classList.add('rotate-180');
        text.textContent = 'Hide Logs';
      } else {
        content.classList.add('hidden');
        chevron.classList.remove('rotate-180');
        text.textContent = 'Show Logs';
      }
    }

    // -------------------------------------------------------------------------
    // Tab Navigation
    // -------------------------------------------------------------------------
    function switchTab(tabId) {
      ['catalog', 'orders', 'account'].forEach(id => {
        document.getElementById(\`tabContent-\${id}\`).classList.add('hidden');
        const btn = document.getElementById(\`tabBtn-\${id}\`);
        if (btn) {
          btn.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition flex items-center gap-2';
        }
      });

      document.getElementById(\`tabContent-\${tabId}\`).classList.remove('hidden');
      const activeBtn = document.getElementById(\`tabBtn-\${tabId}\`);
      if (activeBtn) {
        activeBtn.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-800 border border-slate-700 transition flex items-center gap-2';
      }

      if (tabId === 'orders') fetchOrders();
      if (tabId === 'catalog') fetchInventory();
    }

    // -------------------------------------------------------------------------
    // Authentication Operations
    // -------------------------------------------------------------------------
    async function autoLoginDemoUser() {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'customer@ecommerce.local', password: 'Password123!' })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          saveAuth(data.token, data.user);
        } else {
          // If login fails, try registration then login
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
            saveAuth(retryData.token, retryData.user);
          }
        }
      } catch (err) {
        logTrace(\`Auto-auth notice: \${err.message}\`, 'sys');
      } finally {
        fetchInventory();
        fetchOrders();
      }
    }

    function saveAuth(token, user) {
      authToken = token;
      currentAuthUser = user;
      localStorage.setItem('apex_jwt_token', token);
      localStorage.setItem('apex_user', JSON.stringify(user));
      updateAuthHeader();
      logTrace(\`Authenticated as \${user.email || 'customer'}. Token valid 24h.\`);
    }

    function updateAuthHeader() {
      const dot = document.getElementById('accountStatusDot');
      const badge = document.getElementById('profileBadge');
      const nameDisp = document.getElementById('profileNameDisplay');
      const emailDisp = document.getElementById('profileEmailDisplay');
      const tokenBox = document.getElementById('jwtTokenBox');
      const tokenDisp = document.getElementById('jwtTokenDisplay');

      if (authToken) {
        dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
        badge.className = 'text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        badge.textContent = 'Authenticated';
        nameDisp.textContent = currentAuthUser ? (currentAuthUser.name || 'Active Customer') : 'Active Customer';
        emailDisp.textContent = currentAuthUser ? (currentAuthUser.email || 'customer@ecommerce.local') : 'customer@ecommerce.local';
        tokenBox.classList.remove('hidden');
        tokenDisp.textContent = authToken;
      } else {
        dot.className = 'w-2 h-2 rounded-full bg-amber-400';
        badge.className = 'text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-400';
        badge.textContent = 'Guest';
        tokenBox.classList.add('hidden');
      }
    }

    async function handleAccountLogin() {
      const email = document.getElementById('accEmailInput').value;
      const password = document.getElementById('accPassInput').value;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          saveAuth(data.token, data.user);
          showToast('Welcome back! Logged in successfully.');
          fetchInventory();
          fetchOrders();
        } else {
          showToast(data.message || 'Login failed', 'error');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    async function handleAccountRegister() {
      const name = document.getElementById('accNameInput').value;
      const email = document.getElementById('accEmailInput').value;
      const password = document.getElementById('accPassInput').value;
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Account registered! Signing you in...');
          handleAccountLogin();
        } else {
          showToast(data.message || 'Registration failed', 'error');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    function copyAuthToken() {
      navigator.clipboard.writeText(authToken);
      showToast('JWT token copied to clipboard');
    }

    // -------------------------------------------------------------------------
    // Catalog & Inventory Operations
    // -------------------------------------------------------------------------
    async function fetchInventory() {
      try {
        const headers = authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {};
        const res = await fetch('/api/inventory?limit=50', { headers });
        const data = await res.json();
        allProducts = data.products || data.data || [];

        if (allProducts.length === 0) {
          // If empty, auto-seed
          await handleSeedCatalog(false);
          return;
        }

        renderProducts(allProducts);
        logTrace(\`Loaded \${allProducts.length} items from Inventory Service (:3003)\`);
      } catch (err) {
        logTrace(\`Inventory fetch error: \${err.message}\`, 'error');
      }
    }

    async function handleSeedCatalog(notify = true) {
      try {
        const headers = authToken ? { 'Authorization': \`Bearer \${authToken}\` } : {};
        const res = await fetch('/api/inventory/seed', { method: 'POST', headers });
        const data = await res.json();
        if (notify) showToast(data.message || 'Sample catalog seeded!');
        const fetchRes = await fetch('/api/inventory?limit=50', { headers });
        const fetchData = await fetchRes.json();
        allProducts = fetchData.products || fetchData.data || [];
        renderProducts(allProducts);
      } catch (err) {
        if (notify) showToast('Seeding failed: ' + err.message, 'error');
      }
    }

    function setCategoryFilter(category) {
      currentCategory = category;
      document.querySelectorAll('#categoryFilterBar .cat-pill').forEach(pill => {
        pill.className = 'cat-pill px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition whitespace-nowrap';
      });
      event.target.className = 'cat-pill active px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white transition whitespace-nowrap';
      filterCatalog();
    }

    function filterCatalog() {
      const query = document.getElementById('searchInput').value.toLowerCase();
      let filtered = allProducts.filter(p => {
        const matchesQuery = p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query);
        let matchesCat = true;
        if (currentCategory !== 'all') {
          matchesCat = p.name.toLowerCase().includes(currentCategory.toLowerCase()) || 
                       p.sku.toLowerCase().includes(currentCategory.substring(0, 3).toLowerCase());
        }
        return matchesQuery && matchesCat;
      });
      renderProducts(filtered);
    }

    function getProductIcon(name) {
      const n = name.toLowerCase();
      if (n.includes('monitor')) return 'fa-desktop text-blue-400';
      if (n.includes('keyboard')) return 'fa-keyboard text-emerald-400';
      if (n.includes('mouse')) return 'fa-computer-mouse text-purple-400';
      if (n.includes('headphone') || n.includes('audio')) return 'fa-headphones text-amber-400';
      return 'fa-microchip text-indigo-400';
    }

    function renderProducts(products) {
      const grid = document.getElementById('productsGrid');
      if (products.length === 0) {
        grid.innerHTML = \`
          <div class="col-span-full py-16 text-center text-slate-500 space-y-3">
            <i class="fa-solid fa-box-open text-4xl text-slate-600"></i>
            <p class="text-sm">No products matched your search criteria.</p>
            <button onclick="document.getElementById('searchInput').value=''; setCategoryFilter('all');" class="text-xs text-indigo-400 hover:underline">Reset Filters</button>
          </div>
        \`;
        return;
      }

      grid.innerHTML = products.map(p => {
        const icon = getProductIcon(p.name);
        const stockStatus = p.stock > 10 
          ? \`<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">\${p.stock} In Stock</span>\`
          : (p.stock > 0 
              ? \`<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Only \${p.stock} Left</span>\`
              : \`<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Sold Out</span>\`);

        return \`
          <div class="glass-card rounded-3xl p-5 border border-slate-800 hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between group shadow-lg hover:shadow-indigo-500/10">
            <div>
              <!-- Product Image/Icon Box -->
              <div class="h-40 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800/80 border border-slate-800 flex items-center justify-center mb-4 group-hover:scale-[1.02] transition-transform">
                <i class="fa-solid \${icon} text-5xl opacity-80 group-hover:opacity-100 transition"></i>
              </div>

              <!-- Badges -->
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-mono text-slate-400 font-semibold">\${p.sku}</span>
                \${stockStatus}
              </div>

              <!-- Title -->
              <h3 class="font-bold text-white text-base leading-snug mb-1 line-clamp-2">\${p.name}</h3>
              <p class="text-xs text-slate-400 mb-4">Atomic Redis Lock Protected</p>
            </div>

            <!-- Price & Add to Cart -->
            <div class="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span class="text-[10px] text-slate-400 uppercase font-semibold block">Price</span>
                <span class="text-xl font-extrabold font-mono text-white">$\${Number(p.price).toFixed(2)}</span>
              </div>
              <button onclick="addToCart(\${p.id})" \${p.stock <= 0 ? 'disabled' : ''} class="\${p.stock <= 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'} px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2">
                <i class="fa-solid fa-cart-plus"></i> Add to Cart
              </button>
            </div>
          </div>
        \`;
      }).join('');
    }

    // -------------------------------------------------------------------------
    // Shopping Cart Logic
    // -------------------------------------------------------------------------
    function toggleCartDrawer(open) {
      const drawer = document.getElementById('cartDrawer');
      const backdrop = document.getElementById('cartDrawerBackdrop');
      if (open) {
        backdrop.classList.remove('hidden');
        drawer.classList.remove('translate-x-full');
      } else {
        backdrop.classList.add('hidden');
        drawer.classList.add('translate-x-full');
      }
    }

    function addToCart(productId) {
      const product = allProducts.find(p => p.id === productId);
      if (!product) return;

      const existing = cart.find(item => item.id === productId);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showToast(\`Cannot add more than available stock (\${product.stock})\`, 'error');
          return;
        }
        existing.quantity += 1;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.price),
          quantity: 1,
          maxStock: product.stock
        });
      }

      saveCart();
      renderCart();
      showToast(\`Added \${product.name} to cart!\`);
      logTrace(\`Cart updated: Added \${product.name} (Qty: 1)\`);
    }

    function updateCartItemQty(productId, delta) {
      const item = cart.find(i => i.id === productId);
      if (!item) return;

      item.quantity += delta;
      if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== productId);
      } else if (item.quantity > item.maxStock) {
        item.quantity = item.maxStock;
        showToast('Max available stock reached', 'error');
      }

      saveCart();
      renderCart();
    }

    function removeCartItem(productId) {
      cart = cart.filter(i => i.id !== productId);
      saveCart();
      renderCart();
    }

    function saveCart() {
      localStorage.setItem('apex_cart', JSON.stringify(cart));
      const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
      document.getElementById('cartCountBadge').textContent = totalItems;
    }

    function renderCart() {
      const container = document.getElementById('cartItemsContainer');
      const subtotalEl = document.getElementById('cartSubtotal');
      const totalEl = document.getElementById('cartTotal');
      const checkoutBtn = document.getElementById('checkoutBtn');

      saveCart();

      if (cart.length === 0) {
        container.innerHTML = \`
          <div class="text-center py-20 text-slate-500 space-y-3">
            <i class="fa-solid fa-bag-shopping text-4xl text-slate-700"></i>
            <p class="text-sm font-medium">Your shopping cart is empty.</p>
            <button onclick="toggleCartDrawer(false)" class="text-xs text-indigo-400 hover:underline">Explore Products</button>
          </div>
        \`;
        subtotalEl.textContent = '$0.00';
        totalEl.textContent = '$0.00';
        checkoutBtn.disabled = true;
        checkoutBtn.className = 'w-full bg-slate-800 text-slate-500 font-bold py-3 rounded-xl text-sm cursor-not-allowed';
        return;
      }

      checkoutBtn.disabled = false;
      checkoutBtn.className = 'w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer';

      let total = 0;
      container.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return \`
          <div class="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between space-x-3">
            <div class="flex-1 min-w-0">
              <h4 class="text-xs font-bold text-white truncate">\${item.name}</h4>
              <div class="text-[11px] font-mono text-emerald-400 font-semibold">$\${item.price.toFixed(2)}</div>
            </div>

            <!-- Qty Stepper -->
            <div class="flex items-center space-x-2 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
              <button onclick="updateCartItemQty(\${item.id}, -1)" class="w-5 h-5 flex items-center justify-center text-xs text-slate-400 hover:text-white">&minus;</button>
              <span class="text-xs font-mono font-bold text-white px-1">\${item.quantity}</span>
              <button onclick="updateCartItemQty(\${item.id}, 1)" class="w-5 h-5 flex items-center justify-center text-xs text-slate-400 hover:text-white">&plus;</button>
            </div>

            <!-- Total & Remove -->
            <div class="text-right">
              <div class="text-xs font-mono font-bold text-white">$\${itemTotal.toFixed(2)}</div>
              <button onclick="removeCartItem(\${item.id})" class="text-[10px] text-rose-400 hover:text-rose-300">Remove</button>
            </div>
          </div>
        \`;
      }).join('');

      subtotalEl.textContent = \`$\${total.toFixed(2)}\`;
      totalEl.textContent = \`$\${total.toFixed(2)}\`;
    }

    // -------------------------------------------------------------------------
    // Checkout & Order Placement (Asynchronous RabbitMQ + Redis Lock)
    // -------------------------------------------------------------------------
    async function handleCheckout() {
      if (!authToken) {
        showToast('Please sign in to place an order', 'error');
        toggleCartDrawer(false);
        switchTab('account');
        return;
      }

      if (cart.length === 0) return;

      const checkoutBtn = document.getElementById('checkoutBtn');
      checkoutBtn.disabled = true;
      checkoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reserving Stock via Redis Lock...';

      const items = cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price
      }));

      logTrace(\`Initiating checkout transaction for \${items.length} items...\`);

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${authToken}\`
          },
          body: JSON.stringify({ items })
        });

        const data = await res.json();

        if (res.ok) {
          logTrace(\`Order #\${data.id || data.orderId} created! Status: \${data.status}. RabbitMQ event dispatched.\`);
          cart = [];
          saveCart();
          renderCart();
          toggleCartDrawer(false);

          showToast(\`Order #\${data.id || data.orderId} placed successfully!\`);
          fetchOrders();
          fetchInventory();
          switchTab('orders');
        } else {
          showToast(data.message || 'Checkout failed', 'error');
          logTrace(\`Checkout error: \${JSON.stringify(data)}\`, 'error');
        }
      } catch (err) {
        showToast('Network error during checkout: ' + err.message, 'error');
      } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = '<i class="fa-solid fa-lock text-xs"></i> Place Order with Redis Lock';
      }
    }

    // -------------------------------------------------------------------------
    // Order History & Modal Details
    // -------------------------------------------------------------------------
    async function fetchOrders() {
      if (!authToken) return;
      try {
        const res = await fetch('/api/orders', {
          headers: { 'Authorization': \`Bearer \${authToken}\` }
        });
        const data = await res.json();
        allOrders = data.orders || [];

        const badge = document.getElementById('ordersCountBadge');
        if (allOrders.length > 0) {
          badge.textContent = allOrders.length;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }

        renderOrders(allOrders);
        logTrace(\`Retrieved \${allOrders.length} order records from Order Service\`);
      } catch (err) {
        logTrace(\`Fetch orders error: \${err.message}\`, 'error');
      }
    }

    function renderOrders(orders) {
      const container = document.getElementById('ordersContainer');
      if (orders.length === 0) {
        container.innerHTML = \`
          <div class="glass-card p-12 text-center rounded-3xl text-slate-400 space-y-3">
            <i class="fa-solid fa-receipt text-3xl text-slate-600"></i>
            <p class="text-sm">You haven't placed any orders yet.</p>
            <button onclick="switchTab('catalog')" class="text-xs text-indigo-400 hover:underline">Explore Store Catalog</button>
          </div>
        \`;
        return;
      }

      container.innerHTML = orders.map(o => {
        const dateStr = new Date(o.createdAt || o.created_at).toLocaleString();
        const itemCount = o.items ? o.items.length : 1;
        return \`
          <div class="glass-card p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div class="space-y-1">
              <div class="flex items-center space-x-3">
                <span class="font-mono text-sm font-bold text-white">Order #\${o.id}</span>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  \${o.status.toUpperCase()}
                </span>
              </div>
              <div class="text-xs text-slate-400 flex items-center space-x-2">
                <span>\${dateStr}</span>
                <span>&bull;</span>
                <span>\${itemCount} \${itemCount === 1 ? 'item' : 'items'}</span>
              </div>
            </div>

            <div class="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
              <div class="text-right">
                <span class="text-[10px] text-slate-400 uppercase block font-semibold">Total</span>
                <span class="text-lg font-bold font-mono text-emerald-400">$\${Number(o.total).toFixed(2)}</span>
              </div>
              <button onclick="openOrderModal(\${o.id})" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition border border-slate-700 flex items-center gap-1.5">
                <i class="fa-solid fa-eye text-indigo-400"></i> View Receipt
              </button>
            </div>
          </div>
        \`;
      }).join('');
    }

    function openOrderModal(orderId) {
      const order = allOrders.find(o => o.id === orderId);
      if (!order) return;

      document.getElementById('modalOrderId').textContent = \`Order #\${order.id}\`;
      document.getElementById('modalOrderStatus').textContent = order.status.toUpperCase();
      document.getElementById('modalOrderDate').textContent = new Date(order.createdAt || order.created_at).toLocaleString();
      document.getElementById('modalOrderTotal').textContent = \`$\${Number(order.total).toFixed(2)}\`;

      const itemsContainer = document.getElementById('modalOrderItems');
      const items = order.items || [];

      if (items.length === 0) {
        itemsContainer.innerHTML = '<div class="text-xs text-slate-500">Item details stored in database</div>';
      } else {
        itemsContainer.innerHTML = items.map(i => {
          const matchingProduct = allProducts.find(p => p.id === (i.productId || i.product_id));
          const name = matchingProduct ? matchingProduct.name : \`Product #\${i.productId || i.product_id}\`;
          const lineTotal = Number(i.price) * Number(i.quantity);
          return \`
            <div class="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
              <div>
                <div class="font-bold text-white">\${name}</div>
                <div class="text-[10px] text-slate-400 font-mono">Qty: \${i.quantity} &times; $\${Number(i.price).toFixed(2)}</div>
              </div>
              <div class="font-mono font-bold text-emerald-400">$\${lineTotal.toFixed(2)}</div>
            </div>
          \`;
        }).join('');
      }

      document.getElementById('orderDetailModal').classList.remove('hidden');
    }

    function closeOrderModal() {
      document.getElementById('orderDetailModal').classList.add('hidden');
    }
  </script>
</body>
</html>`;
