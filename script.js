const $ = (el) => document.querySelector(el)

let modal = $('.modalScreen')
let burgerItem = $('.burgerArea')
let cart = $('aside')
let container = $('.container')
let cartItems = $('.cartArea')
let cartTotal = $('.cartTotal')

let variationBlue = $('.variationBlue')
let variationRed = $('.variationRed')
let qtMinus = $('#qtMinus')
let qtPlus = $('#qtPlus')

let burgersList = []
let qtList = []
let pricesList = []

let burgerQt = 1

let key = 0
let cartKey = 0

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
    updateModal(key)
}

function updateModal(e) {
        let values = $('.values')
        key = e
        if (variationBlue.classList.contains('selected') == true) {
            burgerItem.querySelector('.burgerArea img').src = menuJson[key].image[0]
            burgerItem.querySelector('.variationDesc p').innerHTML = menuJson[key].ingredients[0]
            values.querySelector('.total').innerHTML = menuJson[key].prices[0]
        } else {
            burgerItem.querySelector('.burgerArea img').src = menuJson[key].image[1]
            burgerItem.querySelector('.variationDesc p').innerHTML = menuJson[key].ingredients[1]
            values.querySelector('.total').innerHTML = menuJson[key].prices[1]
        }
        
        burgerItem.querySelector('.burgerDesc h1').innerHTML = menuJson[key].name
        burgerItem.querySelector('.burgerDesc p').innerHTML = menuJson[key].description
        variationBlue.innerHTML = menuJson[key].variation[0]
        variationRed.innerHTML = menuJson[key].variation[1]
}

function selectBlue() {
    $('.variationRed').classList.remove('selected')
    $('.variationBlue').classList.add('selected')
    qtMinus.style.backgroundColor = '#1F7A8C'
    qtPlus.style.backgroundColor = '#1F7A8C'
    updateModal(key)
}

function selectRed() {
    $('.variationBlue').classList.remove('selected')
    $('.variationRed').classList.add('selected')
    qtMinus.style.backgroundColor = '#e02a24'
    qtPlus.style.backgroundColor = '#e02a24'
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
    container.style.width = '50vw'
    closeModal()
}

function closeCart() {
    cart.style.display = 'none'
}

function addToCart() {
    openCart()
    parseInt(menuJson[key].prices)
    if (variationBlue.classList.contains('selected') == true) {
        burgersList.push(menuJson[key].variation[0])
        qtList.push(burgerQt)
        pricesList.push(menuJson[key].prices[0] * burgerQt)
        cartKey++
    } else {
        burgersList.push(menuJson[key].variation[1])
        qtList.push(burgerQt)
        pricesList.push(menuJson[key].prices[1] * burgerQt)
        cartKey++
    }
    updateCart()
}

function updateCart() {
    let total = 0
    cartItems.querySelector('.actualQt').innerHTML = burgerQt
    parseInt(menuJson[key].prices)
    if (variationBlue.classList.contains('selected') == true) {
        cartItems.querySelector('.cartItem').innerHTML = menuJson[key].variation[0]
        cartItems.querySelector('.subtotal').innerHTML = menuJson[key].prices[0] * burgerQt
    } else {
        cartItems.querySelector('.cartItem').innerHTML = menuJson[key].variation[1]
        cartItems.querySelector('.subtotal').innerHTML = menuJson[key].prices[1] * burgerQt
    }
    
    for (let i = 0; i < pricesList.length; i++) {
        total += pricesList[i]
    }
    cartTotal.innerHTML = `R$ ${total}`
}

