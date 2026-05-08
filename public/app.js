const API = '/api';
let cart = [];
let settings = {};
let allProducts = [];
let allCategories = [];
let allCustomers = [];

// ============================================================
// UTILITIES
// ============================================================

async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function fmt(amount) {
  const sym = settings.currency_symbol || '$';
  return sym + Number(amount || 0).toFixed(2);
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  setTimeout(() => { t.className = 'toast hidden'; }, 3000);
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function statusBadge(s) {
  const map = { completed: 'success', refunded: 'warning', voided: 'danger', pending: 'secondary' };
  return `<span class="badge badge-${map[s] || 'secondary'}">${s}</span>`;
}

// ============================================================
// NAVIGATION
// ============================================================

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const page = link.dataset.page;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    link.classList.add('active');
    document.getElementById('page-' + page).classList.add('active');
    pageHandlers[page]?.();
  });
});

const pageHandlers = {
  pos: loadPOS,
  products: loadProducts,
  categories: loadCategories,
  customers: loadCustomers,
  orders: loadOrders,
  reports: loadReports,
  settings: loadSettings,
};

// ============================================================
// POS
// ============================================================

async function loadPOS() {
  const [prodData, catData, custData, settingsData] = await Promise.all([
    apiFetch('/products?limit=500'),
    apiFetch('/categories'),
    apiFetch('/customers'),
    apiFetch('/settings'),
  ]);

  allProducts = prodData.data;
  allCategories = catData.data;
  allCustomers = custData.data;
  settings = settingsData.data;

  const taxLabel = document.getElementById('tax-rate-label');
  if (taxLabel) taxLabel.textContent = (parseFloat(settings.tax_rate) * 100).toFixed(0) + '%';

  // Category filter
  const catFilter = document.getElementById('pos-category-filter');
  catFilter.innerHTML = '<option value="">All Categories</option>' +
    allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  // Customer select
  const custSel = document.getElementById('cart-customer');
  custSel.innerHTML = '<option value="">Walk-in Customer</option>' +
    allCustomers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  renderPOSProducts();
  renderCart();
}

function renderPOSProducts() {
  const search = document.getElementById('pos-search').value.toLowerCase();
  const catId = document.getElementById('pos-category-filter').value;

  let products = allProducts.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search) ||
      (p.sku || '').toLowerCase().includes(search) ||
      (p.barcode || '').toLowerCase().includes(search);
    const matchCat = !catId || String(p.category_id) === catId;
    return matchSearch && matchCat;
  });

  const grid = document.getElementById('pos-products');
  if (!products.length) {
    grid.innerHTML = '<div class="cart-empty">No products found</div>';
    return;
  }

  grid.innerHTML = products.map(p => {
    const outOfStock = p.stock === 0;
    const stockClass = outOfStock ? 'empty' : p.stock <= p.low_stock_threshold ? 'low' : '';
    const stockLabel = outOfStock ? 'Out of stock' : `Stock: ${p.stock}`;
    return `
      <div class="product-card ${outOfStock ? 'out-of-stock' : ''}" onclick="${outOfStock ? '' : `addToCart(${p.id})`}">
        <div class="p-name">${p.name}</div>
        <div class="p-price">${fmt(p.price)}</div>
        <div class="p-stock ${stockClass}">${stockLabel}</div>
      </div>`;
  }).join('');
}

document.getElementById('pos-search').addEventListener('input', renderPOSProducts);
document.getElementById('pos-category-filter').addEventListener('change', renderPOSProducts);

document.querySelectorAll('.payment-method').forEach(label => {
  label.addEventListener('click', () => {
    document.querySelectorAll('.payment-method').forEach(l => l.classList.remove('active'));
    label.classList.add('active');
    const method = label.dataset.method;
    document.getElementById('cash-fields').style.display = method === 'cash' ? 'block' : 'none';
  });
});

function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(i => i.product_id === productId);
  if (existing) {
    if (existing.quantity >= product.stock) { showToast(`Only ${product.stock} in stock`, 'error'); return; }
    existing.quantity++;
  } else {
    cart.push({ product_id: productId, product_name: product.name, unit_price: product.price, quantity: 1, stock: product.stock });
  }
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.product_id !== productId);
  renderCart();
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.product_id === productId);
  if (!item) return;
  item.quantity = Math.max(1, Math.min(item.stock, item.quantity + delta));
  if (delta < 0 && item.quantity === 0) removeFromCart(productId);
  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-items');
  if (!cart.length) {
    container.innerHTML = '<div class="cart-empty">Cart is empty<br><small>Click a product to add it</small></div>';
    updateCartTotals();
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div>
        <div class="cart-item-name">${item.product_name}</div>
        <div class="cart-item-price">${fmt(item.unit_price)} each</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="updateQty(${item.product_id}, -1)">−</button>
        <span class="qty-display">${item.quantity}</span>
        <button class="qty-btn" onclick="updateQty(${item.product_id}, 1)">+</button>
        <span class="cart-item-total">${fmt(item.unit_price * item.quantity)}</span>
        <button class="cart-remove" onclick="removeFromCart(${item.product_id})">✕</button>
      </div>
    </div>`).join('');

  updateCartTotals();
}

function updateCartTotals() {
  const subtotal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const discount = parseFloat(document.getElementById('cart-discount').value) || 0;
  const taxRate = parseFloat(settings.tax_rate) || 0.08;
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * taxRate;
  const total = taxable + tax;

  document.getElementById('cart-subtotal').textContent = fmt(subtotal);
  document.getElementById('cart-tax').textContent = fmt(tax);
  document.getElementById('cart-total').textContent = fmt(total);
  updateChange();
}

function updateChange() {
  const total = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const discount = parseFloat(document.getElementById('cart-discount').value) || 0;
  const taxRate = parseFloat(settings.tax_rate) || 0.08;
  const finalTotal = Math.max(0, total - discount) * (1 + taxRate);
  const tendered = parseFloat(document.getElementById('amount-tendered').value) || 0;
  const change = Math.max(0, tendered - finalTotal);
  document.getElementById('change-due').textContent = fmt(change);
}

async function checkout() {
  if (!cart.length) { showToast('Cart is empty', 'error'); return; }

  const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
  const discount = parseFloat(document.getElementById('cart-discount').value) || 0;
  const tendered = parseFloat(document.getElementById('amount-tendered').value) || 0;
  const customerId = document.getElementById('cart-customer').value;
  const notes = document.getElementById('cart-notes').value;

  const subtotal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const taxRate = parseFloat(settings.tax_rate) || 0.08;
  const total = (subtotal - discount) * (1 + taxRate);

  if (paymentMethod === 'cash' && tendered < total) {
    showToast('Amount tendered is less than total', 'error');
    return;
  }

  try {
    const result = await apiFetch('/orders', {
      method: 'POST',
      body: {
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        payment_method: paymentMethod,
        discount_amount: discount,
        amount_tendered: tendered,
        customer_id: customerId || undefined,
        notes: notes || undefined,
      },
    });

    showToast(`Order ${result.data.order_number} completed!`);
    clearCart();
    document.getElementById('cart-discount').value = 0;
    document.getElementById('amount-tendered').value = '';
    document.getElementById('cart-notes').value = '';
    showReceipt(result.data.id);

    // Refresh product list to update stock
    const prodData = await apiFetch('/products?limit=500');
    allProducts = prodData.data;
    renderPOSProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function showReceipt(orderId) {
  try {
    const result = await apiFetch(`/orders/${orderId}/receipt`);
    const { order, store } = result.data;
    const sym = store.currency_symbol || '$';
    const fmt2 = v => sym + Number(v || 0).toFixed(2);

    const itemsHtml = order.items.map(i =>
      `<div class="receipt-row"><span>${i.product_name} x${i.quantity}</span><span>${fmt2(i.line_total)}</span></div>`
    ).join('');

    document.getElementById('receipt-content').innerHTML = `
      <div class="receipt-header">
        <strong>${store.store_name}</strong><br/>
        ${store.store_address}<br/>
        ${store.store_phone}
      </div>
      <hr class="receipt-divider"/>
      <div class="receipt-row"><span>Order #</span><span>${order.order_number}</span></div>
      <div class="receipt-row"><span>Date</span><span>${new Date(order.created_at).toLocaleString()}</span></div>
      ${order.customer_name ? `<div class="receipt-row"><span>Customer</span><span>${order.customer_name}</span></div>` : ''}
      <hr class="receipt-divider"/>
      ${itemsHtml}
      <hr class="receipt-divider"/>
      <div class="receipt-row"><span>Subtotal</span><span>${fmt2(order.subtotal)}</span></div>
      ${order.discount_amount > 0 ? `<div class="receipt-row"><span>Discount</span><span>-${fmt2(order.discount_amount)}</span></div>` : ''}
      <div class="receipt-row"><span>Tax (${(order.tax_rate * 100).toFixed(0)}%)</span><span>${fmt2(order.tax_amount)}</span></div>
      <div class="receipt-row receipt-total"><span>TOTAL</span><span>${fmt2(order.total)}</span></div>
      ${order.payment_method === 'cash' ? `
        <div class="receipt-row"><span>Tendered</span><span>${fmt2(order.amount_tendered)}</span></div>
        <div class="receipt-row"><span>Change</span><span>${fmt2(order.change_given)}</span></div>` : ''}
      <hr class="receipt-divider"/>
      <div style="text-align:center;font-size:12px;color:#888">${store.receipt_footer}</div>`;

    openModal('receipt-modal');
  } catch (err) {
    console.error(err);
  }
}

// ============================================================
// PRODUCTS
// ============================================================

async function loadProducts() {
  const search = document.getElementById('product-search').value;
  const catId = document.getElementById('product-category-filter').value;
  const lowStock = document.getElementById('show-low-stock').checked;

  let url = '/products?active=true&limit=200';
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (catId) url += `&category_id=${catId}`;
  if (lowStock) url += '&low_stock=true';

  const [data, catData] = await Promise.all([apiFetch(url), apiFetch('/categories')]);
  allCategories = catData.data;

  // Populate category filters
  ['product-category-filter', 'product-category'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const isFilter = id.includes('filter');
    el.innerHTML = (isFilter ? '<option value="">All Categories</option>' : '<option value="">No Category</option>') +
      allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    if (!isFilter) el.value = '';
  });

  const tbody = document.getElementById('products-tbody');
  tbody.innerHTML = data.data.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td class="text-muted">${p.sku || '-'}</td>
      <td>${p.category_name || '-'}</td>
      <td>${fmt(p.price)}</td>
      <td class="text-muted">${fmt(p.cost)}</td>
      <td>
        <span class="${p.stock === 0 ? 'text-danger' : p.stock <= p.low_stock_threshold ? 'text-warning' : ''}">
          ${p.stock} ${p.stock <= p.low_stock_threshold && p.stock > 0 ? '⚠️' : p.stock === 0 ? '❌' : ''}
        </span>
      </td>
      <td>${p.active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-secondary">Inactive</span>'}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-secondary" onclick="openProductModal(${p.id})">Edit</button>
          <button class="btn btn-sm btn-warning" onclick="adjustStock(${p.id}, '${p.name}')">Stock</button>
          <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

function openProductModal(id = null) {
  document.getElementById('product-modal-title').textContent = id ? 'Edit Product' : 'Add Product';
  document.getElementById('product-id').value = id || '';

  // Populate categories
  const sel = document.getElementById('product-category');
  sel.innerHTML = '<option value="">No Category</option>' +
    allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  if (id) {
    apiFetch(`/products/${id}`).then(res => {
      const p = res.data;
      document.getElementById('product-name').value = p.name;
      document.getElementById('product-sku').value = p.sku || '';
      document.getElementById('product-barcode').value = p.barcode || '';
      document.getElementById('product-category').value = p.category_id || '';
      document.getElementById('product-price').value = p.price;
      document.getElementById('product-cost').value = p.cost;
      document.getElementById('product-stock').value = p.stock;
      document.getElementById('product-low-stock').value = p.low_stock_threshold;
      document.getElementById('product-description').value = p.description || '';
    });
  } else {
    ['product-name','product-sku','product-barcode','product-description'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('product-price').value = '';
    document.getElementById('product-cost').value = 0;
    document.getElementById('product-stock').value = 0;
    document.getElementById('product-low-stock').value = 5;
    document.getElementById('product-category').value = '';
  }
  openModal('product-modal');
}

async function saveProduct() {
  const id = document.getElementById('product-id').value;
  const body = {
    name: document.getElementById('product-name').value,
    sku: document.getElementById('product-sku').value || undefined,
    barcode: document.getElementById('product-barcode').value || undefined,
    category_id: document.getElementById('product-category').value || undefined,
    price: parseFloat(document.getElementById('product-price').value),
    cost: parseFloat(document.getElementById('product-cost').value) || 0,
    stock: parseInt(document.getElementById('product-stock').value) || 0,
    low_stock_threshold: parseInt(document.getElementById('product-low-stock').value) || 5,
    description: document.getElementById('product-description').value || undefined,
  };

  try {
    if (id) {
      await apiFetch(`/products/${id}`, { method: 'PUT', body });
    } else {
      await apiFetch('/products', { method: 'POST', body });
    }
    closeModal('product-modal');
    showToast(`Product ${id ? 'updated' : 'created'}`);
    loadProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Deactivate this product?')) return;
  try {
    await apiFetch(`/products/${id}`, { method: 'DELETE' });
    showToast('Product deactivated');
    loadProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function adjustStock(id, name) {
  const qty = prompt(`Adjust stock for "${name}"\nEnter positive to add, negative to remove:`);
  if (qty === null) return;
  const quantity = parseInt(qty);
  if (isNaN(quantity)) { showToast('Invalid quantity', 'error'); return; }

  const type = quantity > 0 ? 'purchase' : 'adjustment';
  apiFetch(`/products/${id}/adjust-stock`, { method: 'POST', body: { quantity, type, notes: 'Manual adjustment' } })
    .then(() => { showToast('Stock adjusted'); loadProducts(); })
    .catch(err => showToast(err.message, 'error'));
}

// ============================================================
// CATEGORIES
// ============================================================

async function loadCategories() {
  const data = await apiFetch('/categories');
  allCategories = data.data;

  document.getElementById('categories-tbody').innerHTML = allCategories.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td class="text-muted">${c.description || '-'}</td>
      <td>${c.product_count}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-secondary" onclick="openCategoryModal(${c.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCategory(${c.id})">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

function openCategoryModal(id = null) {
  document.getElementById('category-modal-title').textContent = id ? 'Edit Category' : 'Add Category';
  document.getElementById('category-id').value = id || '';
  document.getElementById('category-name').value = '';
  document.getElementById('category-description').value = '';

  if (id) {
    apiFetch(`/categories/${id}`).then(res => {
      document.getElementById('category-name').value = res.data.name;
      document.getElementById('category-description').value = res.data.description || '';
    });
  }
  openModal('category-modal');
}

async function saveCategory() {
  const id = document.getElementById('category-id').value;
  const body = {
    name: document.getElementById('category-name').value,
    description: document.getElementById('category-description').value || undefined,
  };
  try {
    if (id) await apiFetch(`/categories/${id}`, { method: 'PUT', body });
    else await apiFetch('/categories', { method: 'POST', body });
    closeModal('category-modal');
    showToast(`Category ${id ? 'updated' : 'created'}`);
    loadCategories();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCategory(id) {
  if (!confirm('Delete this category? Products will be uncategorized.')) return;
  try {
    await apiFetch(`/categories/${id}`, { method: 'DELETE' });
    showToast('Category deleted');
    loadCategories();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================
// CUSTOMERS
// ============================================================

async function loadCustomers() {
  const search = document.getElementById('customer-search').value;
  const url = search ? `/customers?search=${encodeURIComponent(search)}` : '/customers';
  const data = await apiFetch(url);
  allCustomers = data.data;

  document.getElementById('customers-tbody').innerHTML = allCustomers.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td class="text-muted">${c.email || '-'}</td>
      <td class="text-muted">${c.phone || '-'}</td>
      <td>${c.order_count}</td>
      <td>${fmt(c.total_spent)}</td>
      <td><span class="badge badge-primary">⭐ ${c.loyalty_points}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-secondary" onclick="openCustomerModal(${c.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${c.id})">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

function openCustomerModal(id = null) {
  document.getElementById('customer-modal-title').textContent = id ? 'Edit Customer' : 'Add Customer';
  document.getElementById('customer-id').value = id || '';
  ['customer-name','customer-email','customer-phone','customer-address'].forEach(f => document.getElementById(f).value = '');

  if (id) {
    apiFetch(`/customers/${id}`).then(res => {
      const c = res.data;
      document.getElementById('customer-name').value = c.name;
      document.getElementById('customer-email').value = c.email || '';
      document.getElementById('customer-phone').value = c.phone || '';
      document.getElementById('customer-address').value = c.address || '';
    });
  }
  openModal('customer-modal');
}

async function saveCustomer() {
  const id = document.getElementById('customer-id').value;
  const body = {
    name: document.getElementById('customer-name').value,
    email: document.getElementById('customer-email').value || undefined,
    phone: document.getElementById('customer-phone').value || undefined,
    address: document.getElementById('customer-address').value || undefined,
  };
  try {
    if (id) await apiFetch(`/customers/${id}`, { method: 'PUT', body });
    else await apiFetch('/customers', { method: 'POST', body });
    closeModal('customer-modal');
    showToast(`Customer ${id ? 'updated' : 'created'}`);
    loadCustomers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCustomer(id) {
  if (!confirm('Delete this customer?')) return;
  try {
    await apiFetch(`/customers/${id}`, { method: 'DELETE' });
    showToast('Customer deleted');
    loadCustomers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================
// ORDERS
// ============================================================

async function loadOrders() {
  const status = document.getElementById('order-status-filter').value;
  const payment = document.getElementById('order-payment-filter').value;
  const from = document.getElementById('order-from').value;
  const to = document.getElementById('order-to').value;

  let url = '/orders?limit=100';
  if (status) url += `&status=${status}`;
  if (payment) url += `&payment_method=${payment}`;
  if (from) url += `&from=${from}`;
  if (to) url += `&to=${to}`;

  const data = await apiFetch(url);

  document.getElementById('orders-tbody').innerHTML = data.data.map(o => `
    <tr>
      <td><strong>${o.order_number}</strong></td>
      <td>${o.customer_name || '<span class="text-muted">Walk-in</span>'}</td>
      <td><strong>${fmt(o.total)}</strong></td>
      <td>${o.payment_method}</td>
      <td>${statusBadge(o.status)}</td>
      <td class="text-muted">${new Date(o.created_at).toLocaleString()}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-secondary" onclick="viewOrder(${o.id})">View</button>
          ${o.status === 'completed' ? `<button class="btn btn-sm btn-warning" onclick="refundOrder(${o.id})">Refund</button>` : ''}
        </div>
      </td>
    </tr>`).join('');
}

async function viewOrder(id) {
  const res = await apiFetch(`/orders/${id}`);
  const o = res.data;

  document.getElementById('order-detail-title').textContent = `Order ${o.order_number}`;
  document.getElementById('order-detail-content').innerHTML = `
    <div class="form-grid" style="margin-bottom:14px">
      <div><div class="form-label">Status</div><div>${statusBadge(o.status)}</div></div>
      <div><div class="form-label">Payment</div><div>${o.payment_method}</div></div>
      <div><div class="form-label">Customer</div><div>${o.customer_name || 'Walk-in'}</div></div>
      <div><div class="form-label">Date</div><div>${new Date(o.created_at).toLocaleString()}</div></div>
    </div>
    <table class="report-table" style="margin-bottom:14px">
      <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>
        ${o.items.map(i => `<tr><td>${i.product_name}</td><td>${i.quantity}</td><td>${fmt(i.unit_price)}</td><td>${fmt(i.line_total)}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="summary-row"><span>Subtotal</span><span>${fmt(o.subtotal)}</span></div>
    ${o.discount_amount > 0 ? `<div class="summary-row"><span>Discount</span><span>-${fmt(o.discount_amount)}</span></div>` : ''}
    <div class="summary-row"><span>Tax</span><span>${fmt(o.tax_amount)}</span></div>
    <div class="summary-row total-row"><span>Total</span><span>${fmt(o.total)}</span></div>
    ${o.notes ? `<p class="text-muted" style="margin-top:10px">Notes: ${o.notes}</p>` : ''}
  `;
  document.getElementById('order-detail-actions').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal('order-detail-modal')">Close</button>
    <button class="btn btn-primary" onclick="showReceipt(${o.id})">Print Receipt</button>
    ${o.status === 'completed' ? `<button class="btn btn-warning" onclick="refundOrder(${o.id})">Refund</button>` : ''}
  `;
  openModal('order-detail-modal');
}

async function refundOrder(id) {
  if (!confirm('Refund this order? Stock will be restored.')) return;
  try {
    await apiFetch(`/orders/${id}/refund`, { method: 'POST' });
    showToast('Order refunded');
    closeModal('order-detail-modal');
    loadOrders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================
// REPORTS
// ============================================================

async function loadReports() {
  const from = document.getElementById('report-from').value;
  const to = document.getElementById('report-to').value;

  const [dashData, salesData, invData] = await Promise.all([
    apiFetch('/reports/dashboard'),
    apiFetch(`/reports/sales${from ? `?from=${from}&to=${to || from}` : ''}`),
    apiFetch('/reports/inventory'),
  ]);

  const dash = dashData.data;
  document.getElementById('dashboard-kpis').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Today Revenue</div><div class="kpi-value">${fmt(dash.today.revenue)}</div><div class="kpi-sub">${dash.today.orders} orders</div></div>
    <div class="kpi-card"><div class="kpi-label">This Month</div><div class="kpi-value">${fmt(dash.this_month.revenue)}</div><div class="kpi-sub">${dash.this_month.orders} orders</div></div>
    <div class="kpi-card"><div class="kpi-label">Customers</div><div class="kpi-value">${dash.customers}</div></div>
    <div class="kpi-card"><div class="kpi-label">Products</div><div class="kpi-value">${dash.products}</div></div>
    <div class="kpi-card"><div class="kpi-label">Low Stock Alerts</div><div class="kpi-value text-warning">${dash.low_stock_alerts}</div></div>
  `;

  const sales = salesData.data;
  document.getElementById('sales-by-period').innerHTML = `
    <div class="summary-row"><span>Total Revenue</span><strong>${fmt(sales.summary.total_revenue)}</strong></div>
    <div class="summary-row"><span>Orders</span><strong>${sales.summary.order_count}</strong></div>
    <div class="summary-row"><span>Avg Order Value</span><strong>${fmt(sales.summary.avg_order_value)}</strong></div>
    <div class="summary-row"><span>Tax Collected</span><strong>${fmt(sales.summary.tax_collected)}</strong></div>
    <div class="summary-row"><span>Discounts Given</span><strong>${fmt(sales.summary.total_discounts)}</strong></div>
    <hr style="margin:10px 0;border:none;border-top:1px solid var(--border)"/>
    <table class="report-table">
      <thead><tr><th>Period</th><th>Orders</th><th>Revenue</th></tr></thead>
      <tbody>
        ${sales.by_period.map(r => `<tr><td>${r.period}</td><td>${r.orders}</td><td>${fmt(r.revenue)}</td></tr>`).join('') || '<tr><td colspan="3" class="text-muted">No data</td></tr>'}
      </tbody>
    </table>`;

  document.getElementById('payment-breakdown').innerHTML = `
    <table class="report-table">
      <thead><tr><th>Method</th><th>Count</th><th>Total</th></tr></thead>
      <tbody>
        ${sales.by_payment_method.map(r => `<tr><td>${r.payment_method}</td><td>${r.count}</td><td>${fmt(r.total)}</td></tr>`).join('') || '<tr><td colspan="3" class="text-muted">No data</td></tr>'}
      </tbody>
    </table>`;

  document.getElementById('top-products').innerHTML = `
    <table class="report-table">
      <thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead>
      <tbody>
        ${sales.top_products.map(p => `<tr><td>${p.product_name}</td><td>${p.units_sold}</td><td>${fmt(p.revenue)}</td></tr>`).join('') || '<tr><td colspan="3" class="text-muted">No data</td></tr>'}
      </tbody>
    </table>`;

  const inv = invData.data;
  document.getElementById('low-stock-report').innerHTML = `
    <div class="summary-row"><span>Total Products</span><strong>${inv.overview.total_products}</strong></div>
    <div class="summary-row"><span>Out of Stock</span><strong class="text-danger">${inv.overview.out_of_stock_count}</strong></div>
    <div class="summary-row"><span>Low Stock</span><strong class="text-warning">${inv.overview.low_stock_count}</strong></div>
    <div class="summary-row"><span>Inventory Value</span><strong>${fmt(inv.overview.inventory_value)}</strong></div>
    <hr style="margin:10px 0;border:none;border-top:1px solid var(--border)"/>
    <table class="report-table">
      <thead><tr><th>Product</th><th>Stock</th><th>Min</th></tr></thead>
      <tbody>
        ${inv.low_stock.map(p => `<tr><td>${p.name}</td><td class="${p.stock === 0 ? 'text-danger' : 'text-warning'}">${p.stock}</td><td>${p.low_stock_threshold}</td></tr>`).join('') || '<tr><td colspan="3" class="text-success">All stocked!</td></tr>'}
      </tbody>
    </table>`;
}

// ============================================================
// SETTINGS
// ============================================================

async function loadSettings() {
  const data = await apiFetch('/settings');
  settings = data.data;
  Object.entries(settings).forEach(([key, val]) => {
    const el = document.getElementById('setting-' + key);
    if (el) el.value = val;
  });
}

async function saveSettings() {
  const keys = ['store_name', 'store_address', 'store_phone', 'tax_rate', 'currency_symbol', 'receipt_footer'];
  const body = {};
  keys.forEach(k => {
    const el = document.getElementById('setting-' + k);
    if (el) body[k] = el.value;
  });
  try {
    await apiFetch('/settings', { method: 'PUT', body });
    settings = body;
    showToast('Settings saved');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================
// INIT
// ============================================================

// Set default date range for reports (last 30 days)
const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
document.getElementById('report-from').value = thirtyDaysAgo;
document.getElementById('report-to').value = today;

// Seed some demo data if first run
async function seedDemo() {
  try {
    const products = await apiFetch('/products?limit=1');
    if (products.total > 0) return;

    const cats = await apiFetch('/categories');
    const foodCat = cats.data.find(c => c.name === 'Food & Beverage')?.id;
    const genCat = cats.data.find(c => c.name === 'General')?.id;
    const elCat = cats.data.find(c => c.name === 'Electronics')?.id;

    const demoProducts = [
      { name: 'Coffee', price: 3.50, cost: 0.80, stock: 100, category_id: foodCat, sku: 'FOOD-001' },
      { name: 'Tea', price: 2.75, cost: 0.50, stock: 80, category_id: foodCat, sku: 'FOOD-002' },
      { name: 'Sandwich', price: 6.99, cost: 2.50, stock: 25, category_id: foodCat, sku: 'FOOD-003' },
      { name: 'Water Bottle', price: 1.50, cost: 0.30, stock: 200, category_id: foodCat, sku: 'FOOD-004' },
      { name: 'Notebook', price: 4.99, cost: 1.20, stock: 50, category_id: genCat, sku: 'GEN-001' },
      { name: 'Pen (Pack of 5)', price: 3.25, cost: 0.80, stock: 60, category_id: genCat, sku: 'GEN-002' },
      { name: 'USB Cable', price: 9.99, cost: 3.00, stock: 30, category_id: elCat, sku: 'ELEC-001' },
      { name: 'Phone Case', price: 14.99, cost: 4.00, stock: 15, low_stock_threshold: 10, category_id: elCat, sku: 'ELEC-002' },
    ];

    for (const p of demoProducts) {
      await apiFetch('/products', { method: 'POST', body: p });
    }
  } catch (e) { /* ignore */ }
}

// Boot
seedDemo().then(() => loadPOS());
