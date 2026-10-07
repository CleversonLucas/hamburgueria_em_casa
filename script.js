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

let cartList = []

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

    if (menuJson[key].available[0]) {
        variationBlue.classList.add('selected')
    } else if (menuJson[key].available[1]) {
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

    if (!blueAvailable && !redAvailable) {
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
    if (!menuJson[key].available[0]) {
        return
    }

    variationRed.classList.remove('selected')
    variationBlue.classList.add('selected')

    updateModal(key)
}

function selectRed() {
    if (!menuJson[key].available[1]) {
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
    burgerQt++
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

    variation = menuJson[key].variation[variationIndex]
    price = menuJson[key].prices[variationIndex]

    let existingItem = cartList.find(item =>
        item.id === menuJson[key].id &&
        item.variation === variation
    )

    if (existingItem) {
        existingItem.quantity += burgerQt
    } else {
        cartList.push({
            id: menuJson[key].id,
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
    cartList[index].quantity++

    updateCart()
    updateCartQt()
}

function cartMinus(index) {
    if (cartList[index].quantity > 1) {
        cartList[index].quantity--
    }

    updateCart()
    updateCartQt()
}

function removeFromCart(index) {
    cartList.splice(index, 1)

    updateCart()
    updateCartQt()
}

function updateCartQt() {
    let totalQt = 0

    for (let i = 0; i < cartList.length; i++) {
        totalQt += cartList[i].quantity
    }

    $('#cartQt').innerHTML = totalQt
}

function openCheckout() {
    if (cartList.length === 0) {
        alert('Seu carrinho está vazio.')
        return
    }

    cart.style.display = 'none'
    checkoutScreen.style.display = 'block'

    updateCheckout()
}

function closeCheckout() {
    checkoutScreen.style.display = 'none'
}

function backToCart() {
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

    sendOrderToWhatsApp()
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

function createOrderMessage() {
    let message = ''
    let total = 0

    message += '🍔 *BURGER EM CASA*\n\n'
    message += '*NOVO PEDIDO*\n\n'

    message += `*Cliente:* ${customerName.value.trim()}\n`
    message += `*WhatsApp:* ${customerPhone.value.trim()}\n`
    message += `*Pagamento:* ${getPaymentName()}\n\n`

    message += '*PEDIDO*\n\n'

    for (let i = 0; i < cartList.length; i++) {
        let item = cartList[i]

        let subtotal = item.price * item.quantity

        total += subtotal

        message += `*${item.quantity}x ${item.name} - ${item.variation}*\n`
        message += `R$ ${subtotal.toFixed(2).replace('.', ',')}\n\n`
    }

    message += `*TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*\n`

    let notes = orderNotes.value.trim()

    if (notes !== '') {
        message += '\n*Observações:*\n'
        message += notes
    }

    return message
}

function sendOrderToWhatsApp() {
    let message = createOrderMessage()

    let encodedMessage = encodeURIComponent(message)

    let whatsappUrl =
        `https://wa.me/${restaurantPhone}?text=${encodedMessage}`

    window.open(whatsappUrl, '_blank')
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

            let isAvailable = product.available[variationIndex]

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