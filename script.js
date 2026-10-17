const $ = (el) => document.querySelector(el)

let modal = $('.modalScreen')
let burgerItem = $('.burgerArea')
let cart = $('aside')
let container = $('.container')
let cartItems = $('.cartItems')
let cartTotal = $('.cartTotal')

let variationBlue = $('.variationBlue')
let variationRed = $('.variationRed')
let qtMinus = $('#qtMinus')
let qtPlus = $('#qtPlus')

let checkoutScreen = $('.checkoutScreen')
let checkoutItems = $('.checkoutItems')
let checkoutTotalValue = $('#checkoutTotalValue')

let customerName = $('#customerName')
let customerPhone = $('#customerPhone')
let paymentMethod = $('#paymentMethod')
let orderNotes = $('#orderNotes')

let nameError = $('#nameError')
let phoneError = $('#phoneError')
let paymentError = $('#paymentError')

const restaurantPhone = '5519997980495'

const CREATE_ORDER_URL =
    'https://drtlghafqplrjtafczsg.supabase.co/functions/v1/create-order'

const SUPABASE_URL = 'https://drtlghafqplrjtafczsg.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1wpk2x4aW66NANfoMP6JIA_2hhkSE9w'
const PRODUCTS_URL = `${SUPABASE_URL}/rest/v1/products?select=id,name,variation,price,available&order=id.asc`

let catalogReady = false
let catalogLoading = false
let catalogPromise = null
let catalogError = ''


let cartList = []

let currentOrderId = null
let currentRequestKey = null
let orderSubmitting = false
let orderConfirmed = false
let requestFingerprint = null
let confirmedOrder = null

function showCatalogStatus(message, isError = false) {
    const el = $('#catalogStatus')
    const retryButton = $('#catalogRetryButton')
    if (!el) return

    el.textContent = message
    el.classList.toggle('catalogStatusError', isError)
    el.classList.toggle('catalogStatusLoading', catalogLoading && !isError)
    el.classList.toggle('catalogStatusSuccess', catalogReady && !isError)

    // Exibe a ação de repetir apenas se a consulta falhar.
    if (retryButton) {
        retryButton.hidden = !isError
        retryButton.disabled = catalogLoading
    }
}

function updateCheckoutCatalogStatus() {
    const el = $('#checkoutCatalogStatus')
    if (!el) return
    const blocked = cartList.some(item => !isProductAvailable(item.productId))
    el.textContent = !catalogReady
        ? 'Cardápio indisponível. Aguarde ou tente atualizar antes de confirmar.'
        : blocked
            ? 'Seu carrinho contém um produto indisponível. Remova-o para continuar.'
            : ''
    el.style.display = el.textContent ? 'block' : 'none'
}

function getMenuEntry(productId) {
    for (const product of menuJson) {
        const i = product.productIds.indexOf(Number(productId))
        if (i !== -1) return { product, index: i }
    }
    return null
}

function isProductAvailable(productId) {
    const entry = getMenuEntry(productId)
    return !!(catalogReady && entry && entry.product.available[entry.index])
}

function syncCartWithCatalog() {
    for (const item of cartList) {
        const entry = getMenuEntry(item.productId)
        if (entry) item.price = entry.product.prices[entry.index]
    }
    updateCart()
    updateCheckout()
    updateCheckoutCatalogStatus()
}

async function refreshCatalog() {
    if (catalogPromise) return catalogPromise
    catalogLoading = true
    catalogReady = false
    showCatalogStatus('Consultando preços e disponibilidade no Supabase...')
    updateMenuAvailability()
    updateCheckoutCatalogStatus()

    catalogPromise = (async () => {
        try {
            const response = await fetch(PRODUCTS_URL, {
                headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: 'application/json' },
                cache: 'no-store'
            })
            if (!response.ok) throw new Error(`Falha HTTP ${response.status}`)
            const products = await response.json()
            if (!Array.isArray(products)) throw new Error('Formato de cardápio inválido')
            const byId = new Map(products.map(p => [Number(p.id), p]))
            const expectedIds = menuJson.flatMap(p => p.productIds)
            if (!expectedIds.every(id => byId.has(id))) throw new Error('Produtos ausentes no banco')
            for (const id of expectedIds) {
                const row = byId.get(id)
                if (!Number.isFinite(Number(row.price)) || Number(row.price) < 0 ||
                    typeof row.available !== 'boolean') {
                    throw new Error('Dados de produto inválidos')
                }
            }
            for (const family of menuJson) {
                family.productIds.forEach((id, i) => {
                    const row = byId.get(id)
                    family.prices[i] = Number(row.price)
                    family.available[i] = row.available
                })
            }
            catalogReady = true
            catalogError = ''
            showCatalogStatus('Preços e disponibilidade atualizados.')
        } catch (error) {
            catalogError = 'Não foi possível atualizar o cardápio.'
            console.error('Erro ao consultar produtos:', error)
            showCatalogStatus('Não foi possível carregar o cardápio.', true)
        } finally {
            catalogLoading = false
            updateMenuAvailability()
            if (modal.style.display === 'flex') updateModal(key)
            syncCartWithCatalog()
            catalogPromise = null
        }
        return catalogReady
    })()
    return catalogPromise
}

function setConfirmButtonLoading(loading) {
    const button = document.querySelector('.confirmOrder')

    if (!button) return

    button.disabled = loading
    button.textContent = loading
        ? 'Enviando pedido...'
        : 'Confirmar pedido'
}

function getRequestKey() {
    // Mesmos dados mantêm a chave, inclusive em tentativas repetidas.
    const fingerprint = JSON.stringify({
        customer_name: customerName.value.trim(),
        customer_phone: customerPhone.value.replace(/\D/g, ''),
        payment_method: paymentMethod.value,
        notes: orderNotes.value.trim(),
        items: getOrderItems()
    })

    if (!currentRequestKey || requestFingerprint !== fingerprint) {
        currentRequestKey = crypto.randomUUID()
        requestFingerprint = fingerprint
    }
    return currentRequestKey
}

let burgerQt = 1

let key = 0

function rollToMenu() {
    window.scrollTo({
        left: 0,
        top: 725,
        behavior: 'smooth'
    });
}

function openModal(e) {
    modal.style.display = 'flex'
    key = e

    burgerQt = 1
    $('.burgerQt').innerHTML = burgerQt

    variationBlue.classList.remove('selected')
    variationRed.classList.remove('selected')

    if (catalogReady && menuJson[key].available[0]) {
        variationBlue.classList.add('selected')
    } else if (catalogReady && menuJson[key].available[1]) {
        variationRed.classList.add('selected')
    }

    updateModal(key)
}

function updateModal(e) {
    let values = $('.values')

    key = e

    let variationIndex = 0

    if (variationRed.classList.contains('selected')) {
        variationIndex = 1
    }

    burgerItem.querySelector('.burgerArea img').src =
        menuJson[key].image[variationIndex]

    burgerItem.querySelector('.variationDesc p').innerHTML =
        menuJson[key].ingredients[variationIndex]

    values.querySelector('.total').innerHTML =
        menuJson[key].prices[variationIndex]
            .toFixed(2)
            .replace('.', ',')

    burgerItem.querySelector('.burgerDesc h1').innerHTML =
        menuJson[key].name

    burgerItem.querySelector('.burgerDesc p').innerHTML =
        menuJson[key].description

    variationBlue.innerHTML =
        menuJson[key].variation[0]

    variationRed.innerHTML =
        menuJson[key].variation[1]

    updateAvailability()
}

function updateAvailability() {
    let blueAvailable = menuJson[key].available[0]
    let redAvailable = menuJson[key].available[1]

    variationBlue.classList.toggle('unavailable', !blueAvailable)
    variationRed.classList.toggle('unavailable', !redAvailable)

    if (!blueAvailable) {
        variationBlue.innerHTML =
            `${menuJson[key].variation[0]} <span>INDISPONÍVEL</span>`
    }

    if (!redAvailable) {
        variationRed.innerHTML =
            `${menuJson[key].variation[1]} <span>INDISPONÍVEL</span>`
    }

    let addButton = $('.addCart button')

    const selectedIndex = variationRed.classList.contains('selected') ? 1 : 0
    if (!catalogReady || !menuJson[key].available[selectedIndex]) {
        addButton.disabled = true
        addButton.innerHTML = 'Indisponível'
        addButton.classList.add('disabled')
    } else {
        addButton.disabled = false
        addButton.innerHTML = `
            <span class="material-symbols-outlined">
                add_shopping_cart
            </span>
            Carrinho
        `
        addButton.classList.remove('disabled')
    }
}

function selectBlue() {
    if (!catalogReady || !menuJson[key].available[0]) {
        return
    }

    variationRed.classList.remove('selected')
    variationBlue.classList.add('selected')

    updateModal(key)
}

function selectRed() {
    if (!catalogReady || !menuJson[key].available[1]) {
        return
    }

    variationBlue.classList.remove('selected')
    variationRed.classList.add('selected')

    updateModal(key)
}

function closeModal() {
    modal.style.display = 'none'
}

$('#qtMinus').addEventListener('click', () => {
    if (burgerQt > 1) {
        burgerQt--
        $('.burgerQt').innerHTML = burgerQt
    }
})

$('#qtPlus').addEventListener('click', () => {
    if (burgerQt < 50) burgerQt++
    $('.burgerQt').innerHTML = burgerQt
})

function openCart() {
    cart.style.display = 'block'
    updateCart()
    closeModal()
}

function closeCart() {
    cart.style.display = 'none'
}

function addToCart() {
    if (orderSubmitting || orderConfirmed || !catalogReady || catalogLoading) {
        return
    }

    let variation
    let price
    let variationIndex

    if (variationBlue.classList.contains('selected')) {
        variationIndex = 0
    } else if (variationRed.classList.contains('selected')) {
        variationIndex = 1
    } else {
        return
    }

    if (!menuJson[key].available[variationIndex]) {
        return
    }

    currentOrderId = null

    currentRequestKey = null
    requestFingerprint = null

    variation = menuJson[key].variation[variationIndex]
    price = menuJson[key].prices[variationIndex]

    let existingItem = cartList.find(item =>
        item.id === menuJson[key].id &&
        item.variation === variation
    )

    if (existingItem) {
        existingItem.quantity = Math.min(50, existingItem.quantity + burgerQt)
    } else {
        cartList.push({
            id: menuJson[key].id,
            productId: menuJson[key].productIds[variationIndex],
            name: menuJson[key].name,
            variation: variation,
            price: price,
            quantity: burgerQt
        })
    }

    updateCart()
    updateCartQt()
    openCart()

    burgerQt = 1
    $('.burgerQt').innerHTML = burgerQt
}

function updateCart() {
    let total = 0

    cartItems.innerHTML = ''

    if (cartList.length === 0) {
        cartItems.innerHTML = '<p class="emptyCart">Seu carrinho está vazio.</p>'
        cartTotal.innerHTML = '0,00'
        return
    }

    for (let i = 0; i < cartList.length; i++) {
        let item = cartList[i]

        let subtotal = item.price * item.quantity

        total += subtotal

        cartItems.innerHTML += `
            <div class="cartDetails">
                <div class="cartItem">
                    ${item.name} - ${item.variation}
                </div>

                <div class="cartQt">
                    <button class="cartMinus" onclick="cartMinus(${i})">-</button>

                    <div class="actualQt">
                        ${item.quantity}
                    </div>

                    <button class="cartPlus" onclick="cartPlus(${i})">+</button>
                </div>

                <div class="subtotal">
                    R$ ${subtotal.toFixed(2).replace('.', ',')}
                </div>

                <button class="cartRemove" onclick="removeFromCart(${i})">×</button>
            </div>
        `
    }

    cartTotal.innerHTML = total.toFixed(2).replace('.', ',')
}

function cartPlus(index) {
    if (orderSubmitting || orderConfirmed || !catalogReady || catalogLoading) {
        return
    }

    currentOrderId = null
    currentRequestKey = null
    requestFingerprint = null
    if (cartList[index].quantity >= 50) return
    cartList[index].quantity++

    updateCart()
    updateCartQt()
}

function cartMinus(index) {
    if (orderSubmitting || orderConfirmed || !catalogReady || catalogLoading) {
        return
    }

    if (cartList[index].quantity > 1) {
        currentOrderId = null
        currentRequestKey = null
        requestFingerprint = null
        cartList[index].quantity--
    }

    updateCart()
    updateCartQt()
}

function removeFromCart(index) {
    if (orderSubmitting || orderConfirmed || !catalogReady || catalogLoading) {
        return
    }
    
    currentOrderId = null
    currentRequestKey = null
    requestFingerprint = null
    cartList.splice(index, 1)

    updateCart()
    updateCartQt()
}

function getOrderItems() {
    return cartList.map(item => ({
        product_id: item.productId,
        quantity: item.quantity
    }))
}

function getOrderData() {
    return {
        customer_name: customerName.value.trim(),
        customer_phone: customerPhone.value.replace(/\D/g, ''),
        payment_method: paymentMethod.value,
        notes: orderNotes.value.trim(),
        items: getOrderItems(),
        request_key: getRequestKey()
    }
}

async function sendOrderToSupabase() {
    if (orderSubmitting || orderConfirmed) {
        return { success: false, error: 'Este pedido já está sendo processado.' }
    }

    orderSubmitting = true
    setConfirmButtonLoading(true)

    try {
        const response = await fetch(CREATE_ORDER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(getOrderData())
        })

        let result
        try {
            result = await response.json()
        } catch {
            return {
                success: false,
                error: 'Resposta inesperada. Não sabemos se o pedido foi registrado. Confira antes de reenviar.'
            }
        }

        if (!response.ok || !result?.success) {
            return {
                success: false,
                error: result?.error || 'Não foi possível registrar o pedido.'
            }
        }

        return result
    } catch (error) {
        console.error('Falha na comunicação com o Supabase:', error)
        return {
            success: false,
            error: 'Falha de conexão. O pedido pode ter chegado ao servidor. Confira antes de tentar novamente usando os mesmos dados.'
        }
    } finally {
        orderSubmitting = false
        setConfirmButtonLoading(false)
    }
}

function updateCartQt() {
    let totalQt = 0

    for (let i = 0; i < cartList.length; i++) {
        totalQt += cartList[i].quantity
    }

    $('#cartQt').innerHTML = totalQt
}

function openCheckout() {
    if (!catalogReady && !orderConfirmed) {
        alert('Aguarde a atualização do cardápio ou tente novamente.')
        return
    }
    if (orderConfirmed) {
        cart.style.display = 'none'
        checkoutScreen.style.display = 'block'
        return
    }

    if (cartList.length === 0) {
        alert('Seu carrinho está vazio.')
        return
    }

    cart.style.display = 'none'
    checkoutScreen.style.display = 'block'

    updateCheckout()
    updateCheckoutCatalogStatus()
}

function closeCheckout() {
    if (orderSubmitting) return
    checkoutScreen.style.display = 'none'
}

function backToCart() {
    if (orderSubmitting || orderConfirmed) return
    checkoutScreen.style.display = 'none'
    openCart()
}

function updateCheckout() {
    let total = 0

    checkoutItems.innerHTML = ''

    for (let i = 0; i < cartList.length; i++) {
        let item = cartList[i]

        let subtotal = item.price * item.quantity

        total += subtotal

        checkoutItems.innerHTML += `
            <div class="checkoutItem">
                <div>
                    ${item.quantity}x ${item.name} - ${item.variation}
                </div>

                <div>
                    R$ ${subtotal.toFixed(2).replace('.', ',')}
                </div>
            </div>
        `
    }

    checkoutTotalValue.innerHTML =
        total.toFixed(2).replace('.', ',')
}

function clearCheckoutErrors() {
    nameError.innerHTML = ''
    phoneError.innerHTML = ''
    paymentError.innerHTML = ''

    customerName.classList.remove('inputError')
    customerPhone.classList.remove('inputError')
    paymentMethod.classList.remove('inputError')
}

function validateName() {
    let name = customerName.value.trim()

    if (name.length < 2) {
        nameError.innerHTML = 'Digite seu nome.'
        customerName.classList.add('inputError')
        return false
    }

    return true
}

function validatePhone() {
    let phone = customerPhone.value.replace(/\D/g, '')

    if (phone.length < 10 || phone.length > 11) {
        phoneError.innerHTML = 'Digite um WhatsApp válido.'
        customerPhone.classList.add('inputError')
        return false
    }

    return true
}

function validatePayment() {
    if (paymentMethod.value === '') {
        paymentError.innerHTML = 'Selecione a forma de pagamento.'
        paymentMethod.classList.add('inputError')
        return false
    }

    return true
}

function validateCheckout() {
    if (orderSubmitting || orderConfirmed || catalogLoading) return
    if (!catalogReady) {
        alert('Cardápio não carregado. Tente novamente.')
        return
    }
    if (cartList.some(item => !isProductAvailable(item.productId))) {
        alert('Há um produto indisponível no carrinho. Remova-o para continuar.')
        return
    }
    if (orderSubmitting || orderConfirmed) return
    clearCheckoutErrors()

    if (cartList.length === 0) {
        alert('Seu carrinho está vazio.')
        closeCheckout()
        openCart()
        return
    }

    let nameIsValid = validateName()
    let phoneIsValid = validatePhone()
    let paymentIsValid = validatePayment()

    if (!nameIsValid || !phoneIsValid || !paymentIsValid) {
        return
    }

    confirmOrderOnSite()
}

function startNewOrder() {
    if (orderSubmitting) {
        return
    }

    // Limpa os dados do pedido anterior
    cartList = []
    currentOrderId = null
    currentRequestKey = null
    requestFingerprint = null
    orderConfirmed = false
    confirmedOrder = null

    // Limpa o formulário
    customerName.value = ''
    customerPhone.value = ''
    paymentMethod.value = ''
    orderNotes.value = ''

    clearCheckoutErrors()

    // Restaura os elementos do checkout
    document.querySelector('#orderSuccess').style.display = 'none'
    document.querySelector('.checkoutForm').style.display = ''
    document.querySelector('.checkoutSummary').style.display = ''
    document.querySelector('.checkoutActions').style.display = ''

    // Atualiza o carrinho
    updateCart()
    updateCartQt()

    // Fecha o checkout e retorna ao cardápio
    closeCheckout()
    closeCart()
    rollToMenu()
}

function formatPrice(value) {
    return Number(value).toFixed(2).replace('.', ',')
}

function showOrderSuccess(orderId, total) {
    orderConfirmed = true
    currentOrderId = String(orderId)
    confirmedOrder = {
        id: String(orderId),
        total: Number(total),
        name: customerName.value.trim(),
        phone: customerPhone.value.trim(),
        payment: getPaymentName(),
        notes: orderNotes.value.trim(),
        items: cartList.map(item => ({ ...item }))
    }

    document.querySelector('#confirmedOrderId').textContent = String(orderId)
    document.querySelector('#confirmedOrderTotal').textContent = formatPrice(total)
    document.querySelector('.checkoutForm').style.display = 'none'
    document.querySelector('.checkoutSummary').style.display = 'none'
    document.querySelector('.checkoutActions').style.display = 'none'
    document.querySelector('#orderSuccess').style.display = 'block'
}

async function confirmOrderOnSite() {
    if (orderSubmitting || orderConfirmed || catalogLoading) return
    setConfirmButtonLoading(true)
    // Reconsulta antes de criar um pedido: preço e disponibilidade podem ter mudado.
    const loaded = await refreshCatalog()
    setConfirmButtonLoading(false)
    if (!loaded) {
        alert('Não foi possível atualizar o cardápio. Tente novamente mais tarde.')
        return
    }
    if (cartList.some(item => !isProductAvailable(item.productId))) {
        alert('Um item ficou indisponível. Remova-o do carrinho antes de continuar.')
        return
    }
    const result = await sendOrderToSupabase()

    if (result.success) {
        showOrderSuccess(result.order_id, result.total)
    } else {
        alert(result.error || 'Não foi possível confirmar o pedido.')
    }
}

function sendConfirmedOrderToWhatsApp() {
    if (!orderConfirmed || !confirmedOrder) return

    const order = confirmedOrder
    const lines = [
        '🍔 *BURGER EM CASA*', '',
        '*PEDIDO JÁ CONFIRMADO PELO SITE*',
        `*ID: #${order.id}*`, '',
        `*Cliente:* ${order.name}`,
        `*WhatsApp:* ${order.phone}`,
        `*Pagamento:* ${order.payment}`, '', '*ITENS*', ''
    ]

    order.items.forEach(item => {
        lines.push(`*${item.quantity}x ${item.name} - ${item.variation}*`)
    })
    lines.push('', `*TOTAL OFICIAL: R$ ${formatPrice(order.total)}*`)
    if (order.notes) lines.push('', '*Observações:*', order.notes)
    lines.push('', '_Pedido já registrado. Mensagem enviada somente se desejar._')

    const url = `https://wa.me/${restaurantPhone}?text=${encodeURIComponent(lines.join('\n'))}`
    window.open(url, '_blank', 'noopener,noreferrer')
}

customerPhone.addEventListener('input', function () {
    let phone = customerPhone.value.replace(/\D/g, '')

    phone = phone.substring(0, 11)

    if (phone.length > 10) {
        phone = phone.replace(
            /(\d{2})(\d{5})(\d{4})/,
            '($1) $2-$3'
        )
    } else if (phone.length > 6) {
        phone = phone.replace(
            /(\d{2})(\d{4})(\d{0,4})/,
            '($1) $2-$3'
        )
    } else if (phone.length > 2) {
        phone = phone.replace(
            /(\d{2})(\d+)/,
            '($1) $2'
        )
    } else if (phone.length > 0) {
        phone = phone.replace(
            /(\d*)/,
            '($1'
        )
    }

    customerPhone.value = phone
})

customerName.addEventListener('input', function () {
    nameError.innerHTML = ''
    customerName.classList.remove('inputError')
})

customerPhone.addEventListener('input', function () {
    phoneError.innerHTML = ''
    customerPhone.classList.remove('inputError')
})

paymentMethod.addEventListener('change', function () {
    paymentError.innerHTML = ''
    paymentMethod.classList.remove('inputError')
})

function getPaymentName() {
    if (paymentMethod.value === 'pix') {
        return 'Pix'
    }

    if (paymentMethod.value === 'cartao') {
        return 'Cartão'
    }

    return ''
}

function updateMenuAvailability() {
    for (let productIndex = 0; productIndex < menuJson.length; productIndex++) {

        let product = menuJson[productIndex]

        let availableCount = 0

        for (
            let variationIndex = 0;
            variationIndex < product.variation.length;
            variationIndex++
        ) {

            let variationElement = $(
                `#menuVariation-${productIndex}-${variationIndex}`
            )

            if (!variationElement) {
                continue
            }

            let isAvailable = catalogReady && product.available[variationIndex]

            variationElement.classList.toggle(
                'menuUnavailable',
                !isAvailable
            )

            if (isAvailable) {
                availableCount++

                variationElement.innerHTML =
                    product.variation[variationIndex]
            } else {
                variationElement.innerHTML = `
                    ${product.variation[variationIndex]}
                    <span>INDISPONÍVEL</span>
                `
            }
        }

        let availabilityElement =
            $(`#menuAvailability-${productIndex}`)

        if (!availabilityElement) {
            continue
        }

        let card = availabilityElement.closest(
            '.option1, .option2, .option3'
        )

        if (availableCount === 0) {
            availabilityElement.innerHTML =
                'TEMPORARIAMENTE INDISPONÍVEL'

            availabilityElement.classList.add('show')

            if (card) {
                card.classList.add('productUnavailable')
            }
        } else {
            availabilityElement.innerHTML = ''
            availabilityElement.classList.remove('show')

            if (card) {
                card.classList.remove('productUnavailable')
            }
        }
    }
}


updateMenuAvailability()
updateCartQt()
refreshCatalog()
