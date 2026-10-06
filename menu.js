let menuJson = [
    {
        id:1,
        name: 'Shepard',
        image: ['images/paragon.jpg', 'images/renegado.jpg'],
        description: ['Salada e bacon. Quem você vai ser? Faça sua escolha.'],
        variation: ['Paragon', 'Renegado'],
        ingredients: [
            'Burger 150gr, Queijo Prato, Tomate, Cebola Roxa, Alface e Maionese da casa',
            'Burger 150gr, Cheddar, Tomate, Cebola Caramelizada, Bacon, Maionese da casa e Molho Barbecue'
        ],
        prices: [31.90, 34.90],
        available: [true, true]
    },
    {
        id:2,
        name: 'Asari',
        image: ['images/liara.jpg', 'images/justicar.jpg'],
        description: ['Beleza, sabor e Justiça com picância milenar'],
        variation: ['Liara', 'Justicar'],
        ingredients: [
            'Burger 150gr, Queijo Prato, Queijo Provolone chapeado com Cebola Roxa, Geléia de Pimenta da casa e Maionese da casa',
            'Burger 150gr, Cheddar, Queijo Provolone chapeado com Cebola Roxa, Pimenta Jalapeño, Bacon, Catchup e Maionese da casa'
        ],
        prices: [33.90, 35.90],
        available: [false, true]
    },
    {
        id:3,
        name: 'Krogan',
        image: ['images/grunt.jpg', 'images/wrex.jpg'],
        description: ['O Smash mais letal e destruidor da galáxia.'],
        variation: ['Grunt', 'Wrex'],
        ingredients: [
            '2 Smash Burgers de 90gr, Queijo Prato, Picles, Catchup e Maionese da casa',
            '3 Smash Burgers de 90gr, Cheddar, Cebola Caramelizada, Bacon e Maionese da casa'
        ],
        prices: [32.90, 36.90],
        available: [false, false]
    }
]