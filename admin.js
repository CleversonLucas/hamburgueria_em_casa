'use strict';

// Chave pública: adequada para uso no navegador. Nunca inserir service_role ou sb_secret_ aqui.
const SUPABASE_URL = 'https://drtlghafqplrjtafczsg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1wpk2x4aW66NANfoMP6JIA_2hhkSE9w';
const $ = selector => document.querySelector(selector);
const money = value => Number(value || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
const dateTime = value => value ? new Date(value).toLocaleString('pt-BR') : '—';
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});
let orders = [];
let selectedId = null;
let loading = false;
let savingStatus = false;
const POLL_INTERVAL_MS = 15000;
let pollingTimer = null;
let initialSnapshotLoaded = false;
let seenOrderIds = new Set();
let newlyArrivedIds = new Set();
let soundEnabled = false;
let audioContext = null;
let dashboardActive = false;
let currentSection = 'orders';
let products = [];
let productsLoading = false;
let productSaving = false;
let productsGeneration = 0;
let eventGeneration = 0;
let eventBusy = false;
let eventSnapshot = null;
let refreshGeneration = 0;
const STATUS_OPTIONS = [
  ['novo', 'Novo'],
  ['confirmado', 'Confirmado'],
  ['em_preparo', 'Em preparo'],
  ['concluido', 'Concluído']
];
const statusLabel = value => STATUS_OPTIONS.find(([key]) => key === value)?.[1] || value || 'Sem status';

function make(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}
function showMessage(target, message) { $(target).textContent = message || ''; }
function stopMonitoring() {
  dashboardActive = false;
  if (pollingTimer !== null) clearInterval(pollingTimer);
  pollingTimer = null;
  initialSnapshotLoaded = false;
  seenOrderIds.clear();
  newlyArrivedIds.clear();
  refreshGeneration++;
  if ($('#newOrdersAlert')) $('#newOrdersAlert').hidden = true;
  if ($('#newOrdersCount')) $('#newOrdersCount').textContent = '0 novos';
}
function startMonitoring() {
  dashboardActive = true;
  if (pollingTimer !== null) clearInterval(pollingTimer);
  pollingTimer = setInterval(() => {
    if (document.visibilityState === 'hidden' || savingStatus || loading || currentSection !== 'orders') return;
    loadOrders({ silent: true });
  }, POLL_INTERVAL_MS);
}
function setNewOrdersDisplay() {
  const count = newlyArrivedIds.size;
  const counter = $('#newOrdersCount');
  counter.textContent = `${count} novo${count === 1 ? '' : 's'}`;
  counter.classList.toggle('has-new', count > 0);
}
function soundAlert() {
  if (!soundEnabled || !audioContext) return;
  try {
    if (audioContext.state !== 'running') return;
    const start = audioContext.currentTime;
    [660, 880].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const at = start + index * .22;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(.0001, at);
      gain.gain.exponentialRampToValueAtTime(.12, at + .02);
      gain.gain.exponentialRampToValueAtTime(.0001, at + .19);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(at); oscillator.stop(at + .20);
    });
  } catch (error) { console.warn('Não foi possível tocar o alerta.', error); }
}
async function toggleSound() {
  const button = $('#soundButton');
  if (soundEnabled) {
    soundEnabled = false;
    button.textContent = '🔇 Ativar som';
    button.setAttribute('aria-pressed', 'false');
    return;
  }
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Áudio não suportado neste navegador.');
    audioContext ||= new AudioContextClass();
    await audioContext.resume();
    if (audioContext.state !== 'running') throw new Error('O navegador bloqueou o áudio.');
    soundEnabled = true;
    button.textContent = '🔊 Som ativado';
    button.setAttribute('aria-pressed', 'true');
  } catch(error) { showMessage('#dashboardMessage', error.message || 'Não foi possível ativar o som.'); }
}
function showLogin(message = '') {
  stopMonitoring();
  $('#loginSection').hidden = false;
  $('#dashboardSection').hidden = true;
  $('#logoutButton').hidden = true;
  $('#sessionEmail').textContent = '';
  showMessage('#loginMessage', message);
  orders = [];
  selectedId = null;
  productsGeneration++;
  eventGeneration++;
  eventSnapshot = null;
  products = [];
  currentSection = 'orders';
  $('#ordersView').hidden = false;
  $('#productsView').hidden = true;
}
function showDashboard(email) {
  $('#loginSection').hidden = true;
  $('#dashboardSection').hidden = false;
  $('#logoutButton').hidden = false;
  $('#sessionEmail').textContent = email || 'Administrador';
  showMessage('#loginMessage', '');
  switchSection('orders');
}
async function verifyAdmin() {
  // A autorização decisiva dos dados continua nas políticas RLS.
  const { data, error } = await supabaseClient.rpc('is_admin');
  if (error) throw new Error('Não foi possível verificar a autorização administrativa.');
  return data === true;
}
async function checkSession() {
  if (!supabaseClient) { showLogin('Biblioteca Supabase não carregou. Verifique sua conexão.'); return; }
  const {data, error} = await supabaseClient.auth.getUser();
  if (error || !data?.user) { showLogin(); return; }
  try {
    if (!await verifyAdmin()) { await supabaseClient.auth.signOut(); showLogin('Esta conta não possui acesso administrativo.'); return; }
    showDashboard(data.user.email);
    await loadOrders();
    startMonitoring();
  } catch (err) { showLogin(err.message); }
}
async function login(event) {
  event.preventDefault();
  if (!supabaseClient) { showMessage('#loginMessage','Biblioteca Supabase indisponível.'); return; }
  const button = $('#loginButton');
  button.disabled = true;
  showMessage('#loginMessage','Autenticando...');
  try {
    const {data, error} = await supabaseClient.auth.signInWithPassword({email:$('#adminEmail').value.trim(),password:$('#adminPassword').value});
    if (error) throw new Error('E-mail ou senha inválidos.');
    if (!await verifyAdmin()) { await supabaseClient.auth.signOut(); throw new Error('Esta conta não possui acesso administrativo.'); }
    $('#adminPassword').value = '';
    showDashboard(data.user.email);
    await loadOrders();
    startMonitoring();
  } catch(err) { showMessage('#loginMessage',err.message || 'Não foi possível entrar.'); }
  finally { button.disabled = false; }
}
async function logout() {
  stopMonitoring();
  if (supabaseClient) await supabaseClient.auth.signOut();
  showLogin('Sessão encerrada.');
}
async function loadOrders({ silent = false } = {}) {
  if (loading || !dashboardActive && initialSnapshotLoaded) return false;
  loading = true;
  const generation = refreshGeneration;
  $('#refreshButton').disabled = true;
  if (!silent) showMessage('#dashboardMessage','Carregando pedidos...');
  try {
    // Não requisitamos tokens, fingerprints nem chaves de idempotência.
    const {data,error} = await supabaseClient.from('orders')
      .select('id,customer_name,customer_phone,payment_method,notes,total,status,created_at')
      .order('created_at',{ascending:false}).limit(100);
    if (generation !== refreshGeneration) return false;
    if (error) throw new Error('Falha ao consultar pedidos. Verifique a conexão e as permissões RLS.');
    const incoming = data || [];
    const incomingIds = new Set(incoming.map(order => String(order.id)));
    if (initialSnapshotLoaded) {
      const arrivals = incoming.filter(order => !seenOrderIds.has(String(order.id)));
      for (const order of arrivals) newlyArrivedIds.add(String(order.id));
      if (arrivals.length) {
        const alert = $('#newOrdersAlert');
        alert.hidden = false;
        alert.textContent = `🍔 ${arrivals.length} novo${arrivals.length === 1 ? '' : 's'} pedido${arrivals.length === 1 ? '' : 's'} recebido${arrivals.length === 1 ? '' : 's'}!`;
        soundAlert();
      }
    } else {
      initialSnapshotLoaded = true; // Pedidos antigos não disparam avisos ao entrar.
    }
    for (const id of incomingIds) seenOrderIds.add(id);
    // Mantém a indicação de novos somente enquanto estão nos 100 mais recentes.
    for (const id of newlyArrivedIds) if (!incomingIds.has(id)) newlyArrivedIds.delete(id);
    setNewOrdersDisplay();
    orders = incoming;
    $('#totalOrders').textContent = String(orders.length);
    $('#totalValue').textContent = money(orders.reduce((sum,order)=>sum + Number(order.total || 0),0));
    updateFilters();
    renderOrders();
    // Evita recarregar os detalhes a cada 15 segundos se o pedido não mudou.
    if (selectedId !== null && orders.some(order => String(order.id) === String(selectedId))) {
      const selected = orders.find(order => String(order.id) === String(selectedId));
      if (!silent || $('#orderDetails').dataset.status !== String(selected.status)) await showOrderDetails(selectedId);
    } else {
      selectedId = null;
      $('#orderDetails').dataset.status = '';
      $('#orderDetails').replaceChildren(make('p','Selecione um pedido para visualizar os detalhes.','muted'));
    }
    $('#lastCheck').textContent = `Última consulta: ${new Date().toLocaleTimeString('pt-BR')}`;
    if (!silent) showMessage('#dashboardMessage',`${orders.length} pedido(s) carregado(s).`);
    return true;
  } catch(err) {
    showMessage('#dashboardMessage',err.message || 'Erro ao carregar pedidos.');
    return false;
  } finally {
    loading = false;
    $('#refreshButton').disabled = false;
  }
}
function updateFilters() {
  const select=$('#statusFilter');
  const prior=select.value;
  select.replaceChildren(new Option('Todos',''));
  [...new Set(orders.map(order=>order.status).filter(Boolean))].sort().forEach(status=>select.add(new Option(statusLabel(status),status)));
  select.value=[...select.options].some(option=>option.value===prior)?prior:'';
}
function renderOrders() {
  const list=$('#ordersList');
  list.replaceChildren();
  const filter=$('#statusFilter').value;
  const shown=orders.filter(order=>!filter || order.status===filter);
  if (!shown.length) {list.append(make('p','Nenhum pedido encontrado.','muted'));return;}
  for (const order of shown) {
    const card=make('button',undefined,'order-card');card.type='button';
    if(String(selectedId)===String(order.id))card.classList.add('active');
    const top=make('div',undefined,'topline');top.append(make('span',`#${order.id} · ${order.customer_name}`),make('span',money(order.total)));
    card.append(top,make('small',`${dateTime(order.created_at)} · ${statusLabel(order.status)}`));
    if (newlyArrivedIds.has(String(order.id))) {
      card.classList.add('just-arrived');
      top.append(make('span','NOVO PEDIDO','new-tag'));
    }
    card.addEventListener('click',()=>{
      newlyArrivedIds.delete(String(order.id));
      setNewOrdersDisplay();
      if (newlyArrivedIds.size === 0) $('#newOrdersAlert').hidden = true;
      showOrderDetails(order.id);
    });
    list.append(card);
  }
}
function detail(label,value) {const wrap=make('div');wrap.append(make('small',label),make('strong',value ?? '—'));return wrap;}
async function showOrderDetails(orderId) {
  selectedId=orderId;
  renderOrders();
  const target=$('#orderDetails');
  target.replaceChildren(make('p','Carregando itens...','muted'));
  const order=orders.find(item=>String(item.id)===String(orderId));
  if (!order) return;
  target.dataset.status = String(order.status);
  const {data,error}=await supabaseClient.from('order_items')
    .select('id,order_id,product_id,product_name,variation,quantity,unit_price,subtotal')
    .eq('order_id',orderId).order('id',{ascending:true});
  if (selectedId!==orderId) return;
  if(error) {target.replaceChildren(make('p','Não foi possível carregar os itens deste pedido.','muted'));return;}
  const grid=make('div',undefined,'detail-grid');
  grid.append(detail('PEDIDO',`#${order.id}`),detail('STATUS',statusLabel(order.status)),detail('CLIENTE',order.customer_name),detail('WHATSAPP',order.customer_phone),detail('PAGAMENTO',order.payment_method),detail('DATA',dateTime(order.created_at)));
  const heading=make('h4','Produtos');
  const items=make('ul',undefined,'item-list');
  for(const item of data||[]) {
    const row=make('li');row.append(make('span',`${item.quantity}× ${item.product_name} — ${item.variation}`),make('strong',money(item.subtotal)));items.append(row);
  }
  if(!data?.length) items.append(make('li','Nenhum item encontrado.'));
  target.replaceChildren(grid,heading,items,make('h3',`Total: ${money(order.total)}`));
  if(order.notes) {target.append(make('h4','Observações'),make('p',order.notes,'notes'));}
  target.append(buildStatusEditor(order));
}
function buildStatusEditor(order) {
  const section = make('section', undefined, 'status-editor');
  section.append(make('h4', 'Atualizar status'));
  const label = make('label', 'Novo status');
  const select = make('select');
  select.id = 'orderStatusSelect';
  select.setAttribute('aria-label', `Status do pedido ${order.id}`);
  for (const [value, title] of STATUS_OPTIONS) select.add(new Option(title, value));
  select.value = order.status;
  const button = make('button', 'Salvar status', 'button primary');
  button.type = 'button';
  const feedback = make('p', '', 'message');
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  button.addEventListener('click', () => saveOrderStatus(order.id, order.status, select.value, button, feedback));
  section.append(label, select, button, feedback);
  return section;
}
async function saveOrderStatus(orderId, previousStatus, nextStatus, button, feedback) {
  if (savingStatus) return;
  if (previousStatus === nextStatus) {
    feedback.textContent = 'O pedido já está neste status.';
    return;
  }
  if (!STATUS_OPTIONS.some(([value]) => value === nextStatus)) {
    feedback.textContent = 'Status inválido.';
    return;
  }
  savingStatus = true;
  button.disabled = true;
  feedback.textContent = 'Salvando...';
  try {
    // O filtro pelo status anterior impede sobrescrever silenciosamente
    // uma atualização feita por outro administrador.
    const { data, error } = await supabaseClient.from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId)
      .eq('status', previousStatus)
      .select('id,status');
    if (error) throw new Error('Não foi possível alterar o status. Verifique as permissões.');
    if (data?.length !== 1) throw new Error('O pedido foi alterado por outra sessão, ou não está mais disponível. Atualize a lista.');
    const order = orders.find(item => String(item.id) === String(orderId));
    if (order) order.status = data[0].status;
    feedback.textContent = 'Status atualizado com sucesso.';
    await loadOrders();
  } catch (err) {
    feedback.textContent = err.message || 'Falha ao salvar status.';
  } finally {
    savingStatus = false;
    button.disabled = false;
  }
}

// Cardápio — leituras e alterações restritas a administradores pelas políticas RLS.
function switchSection(section) {
  if (!['orders', 'products', 'event'].includes(section)) return;
  currentSection = section;
  $('#ordersView').hidden = section !== 'orders';
  $('#productsView').hidden = section !== 'products';
  $('#eventView').hidden = section !== 'event';
  $('#ordersTab').className = `button ${section === 'orders' ? 'primary' : 'secondary'}`;
  $('#productsTab').className = `button ${section === 'products' ? 'primary' : 'secondary'}`;
  $('#eventTab').className = `button ${section === 'event' ? 'primary' : 'secondary'}`;
  $('#ordersTab').setAttribute('aria-current', section === 'orders' ? 'page' : 'false');
  $('#productsTab').setAttribute('aria-current', section === 'products' ? 'page' : 'false');
  $('#eventTab').setAttribute('aria-current', section === 'event' ? 'page' : 'false');
  if (section === 'products') loadProducts();
  else if (section === 'event') loadEventSettings();
  else if (dashboardActive) loadOrders({silent:true});
}
async function loadProducts() {
  if (!dashboardActive || productsLoading || productSaving) return;
  productsLoading = true;
  const generation = productsGeneration;
  $('#reloadProductsButton').disabled = true;
  showMessage('#productsMessage', 'Consultando cardápio oficial...');
  try {
    const { data, error } = await supabaseClient.from('products')
      .select('id,name,variation,price,available').order('id');
    if (generation !== productsGeneration || !dashboardActive) return;
    if (error) throw new Error('Não foi possível consultar os produtos. Confira a permissão SELECT para authenticated e a política RLS.');
    products = data || [];
    renderProducts();
    showMessage('#productsMessage', `${products.length} produto(s) carregado(s).`);
  } catch (error) {
    showMessage('#productsMessage', error.message || 'Erro ao carregar os produtos.');
  } finally {
    productsLoading = false;
    $('#reloadProductsButton').disabled = false;
  }
}
function renderProducts() {
  const list = $('#productsList');
  list.replaceChildren();
  if (!products.length) {list.append(make('p','Nenhum produto encontrado.','muted'));return;}
  for (const product of products) {
    const card = make('article', undefined, 'product-editor');
    card.append(make('small',`PRODUTO #${product.id}`),make('h3',`${product.name} — ${product.variation}`));
    const priceLabel = make('label','Preço oficial (R$)');
    const price = make('input');
    price.type = 'number'; price.min = '0.01'; price.max = '99999.99'; price.step = '0.01';
    price.value = Number(product.price).toFixed(2);
    priceLabel.append(price);
    const availabilityLabel = make('label',undefined,'availability');
    const available = make('input'); available.type = 'checkbox'; available.checked = Boolean(product.available);
    availabilityLabel.append(available,make('span','Disponível para venda'));
    const button = make('button','Salvar produto','button primary');button.type = 'button';
    const feedback = make('p','','message');feedback.setAttribute('role','status');
    button.addEventListener('click',()=>saveProduct(product,price,available,button,feedback));
    card.append(priceLabel,availabilityLabel,button,feedback);
    list.append(card);
  }
}
async function saveProduct(product,priceInput,availableInput,button,feedback) {
  if (productSaving || productsLoading || !dashboardActive) return;
  const nextPrice = Number(priceInput.value);
  const nextAvailable = availableInput.checked;
  if (!priceInput.value.trim() || !Number.isFinite(nextPrice) || nextPrice <= 0 || nextPrice > 99999.99 || Math.round(nextPrice*100) !== nextPrice*100 && Math.abs(Math.round(nextPrice*100)-nextPrice*100)>1e-7) {
    feedback.textContent='Informe um preço válido com até duas casas decimais.';return;
  }
  const officialPrice = Math.round(nextPrice*100)/100;
  if (officialPrice === Number(product.price) && nextAvailable === product.available) {
    feedback.textContent='Nenhuma alteração para salvar.';return;
  }
  productSaving = true;
  button.disabled = true;
  $('#reloadProductsButton').disabled = true;
  feedback.textContent='Salvando...';
  try {
    // Preço e disponibilidade anteriores atuam como verificação otimista contra alterações concorrentes.
    const {data,error}=await supabaseClient.from('products')
      .update({price:officialPrice,available:nextAvailable})
      .eq('id',product.id).eq('price',product.price).eq('available',product.available)
      .select('id,name,variation,price,available');
    if(error) throw new Error('Falha ao salvar produto. Verifique as permissões de atualização.');
    if(data?.length!==1) throw new Error('O produto pode ter sido alterado por outra sessão. Atualize o cardápio antes de tentar novamente.');
    Object.assign(product,data[0]);
    priceInput.value=Number(product.price).toFixed(2);
    feedback.textContent='Produto atualizado no Supabase!';
  } catch(error) {
    feedback.textContent=error.message || 'Erro ao salvar produto.';
  } finally {
    productSaving=false;button.disabled=false;$('#reloadProductsButton').disabled=false;
  }
}


// FASE 13.2 — Programação de eventos.
function brasiliaToday() {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
function updateEventPreview() {
  const date = $('#eventDate').value;
  const enabled = $('#ordersEnabled').checked;
  const today = brasiliaToday();
  const text = !date ? 'Sem data programada — pedidos indisponíveis.'
    : date < today ? 'Missão encerrada — pedidos indisponíveis.'
    : enabled ? 'Missão programada — pedidos antecipados habilitados.'
    : 'Missão programada — recebimento de pedidos pausado.';
  $('#eventPreview').textContent = text;
}
async function loadEventSettings() {
  if (!dashboardActive || eventBusy) return;
  eventBusy = true;
  const generation = eventGeneration;
  $('#reloadEventButton').disabled = true;
  showMessage('#eventMessage','Consultando programação...');
  try {
    const {data,error} = await supabaseClient.from('event_settings')
      .select('id,event_date,orders_enabled').eq('id',true).single();
    if (error) throw new Error('Não foi possível carregar a missão. Confira a tabela event_settings e suas permissões.');
    if (generation !== eventGeneration || !dashboardActive) return;
    eventSnapshot = data;
    $('#eventDate').value = data.event_date || '';
    $('#ordersEnabled').checked = Boolean(data.orders_enabled);
    updateEventPreview();
    showMessage('#eventMessage','Programação carregada.');
  } catch (error) { showMessage('#eventMessage',error.message || 'Falha ao consultar evento.'); }
  finally { eventBusy = false; $('#reloadEventButton').disabled = false; }
}
async function saveEventSettings(event) {
  if (event) event.preventDefault();
  if (!dashboardActive || eventBusy || !eventSnapshot) return;
  const nextDate = $('#eventDate').value || null;
  const nextEnabled = $('#ordersEnabled').checked;
  if (nextEnabled && (!nextDate || nextDate < brasiliaToday())) {
    showMessage('#eventMessage','Para ativar pedidos, informe a data de hoje ou uma data futura.');
    return;
  }
  if (nextDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
    showMessage('#eventMessage','Informe uma data válida.');return;
  }
  eventBusy = true;
  $('#saveEventButton').disabled = true;
  $('#reloadEventButton').disabled = true;
  $('#clearEventButton').disabled = true;
  showMessage('#eventMessage','Salvando programação...');
  try {
    // A verificação da versão anterior evita sobrescrever silenciosamente outra edição.
    let query = supabaseClient.from('event_settings')
      .update({event_date:nextDate,orders_enabled:nextEnabled})
      .eq('id',true).eq('orders_enabled',eventSnapshot.orders_enabled);
    query = eventSnapshot.event_date === null ? query.is('event_date',null) : query.eq('event_date',eventSnapshot.event_date);
    const {data,error} = await query.select('id,event_date,orders_enabled');
    if (error) throw new Error('Não foi possível salvar a missão. Confira as permissões do administrador.');
    if (data?.length !== 1) throw new Error('A programação foi alterada por outra sessão. Recarregue antes de salvar.');
    eventSnapshot = data[0];
    updateEventPreview();
    showMessage('#eventMessage','Missão salva com sucesso no Supabase.');
  } catch (error) {showMessage('#eventMessage',error.message || 'Erro ao salvar programação.');}
  finally {
    eventBusy = false;
    $('#saveEventButton').disabled = false;
    $('#reloadEventButton').disabled = false;
    $('#clearEventButton').disabled = false;
  }
}
function clearEventDate() {
  $('#eventDate').value = '';
  $('#ordersEnabled').checked = false;
  updateEventPreview();
  showMessage('#eventMessage','Data removida do formulário. Clique em "Salvar missão" para confirmar.');
}

$('#loginForm').addEventListener('submit',login);
$('#logoutButton').addEventListener('click',logout);
$('#refreshButton').addEventListener('click',loadOrders);
$('#statusFilter').addEventListener('change',renderOrders);
$('#soundButton').addEventListener('click',toggleSound);
$('#ordersTab').addEventListener('click',()=>switchSection('orders'));
$('#productsTab').addEventListener('click',()=>switchSection('products'));
$('#eventTab').addEventListener('click',()=>switchSection('event'));
$('#eventForm').addEventListener('submit',saveEventSettings);
$('#reloadEventButton').addEventListener('click',loadEventSettings);
$('#clearEventButton').addEventListener('click',clearEventDate);
$('#eventDate').addEventListener('input',updateEventPreview);
$('#ordersEnabled').addEventListener('change',updateEventPreview);
$('#reloadProductsButton').addEventListener('click',loadProducts);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && dashboardActive) loadOrders({ silent: true });
});
checkSession();
