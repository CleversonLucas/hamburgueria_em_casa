let menuJson = [
    {
        id:1,
        name: 'Shepard',
        image: ['images/paragon2.jpeg', 'images/renegado.jpg'],
        description: ['Paragon ou Renegado? Dois caminhos, uma missão: salvar a galáxia da fome.'],
        variation: ['Paragon', 'Renegado'],
        ingredients: [
            'Burger 150gr, Queijo Prato, Tomate, Cebola Roxa, Alface e Maionese da casa',
            'Burger 150gr, Cheddar, Tomate, Cebola Caramelizada, Bacon, Maionese da casa e Molho Barbecue'
        ],
        prices: [12.00, 14.00],
        available: [true, true],
        productIds: [1, 2]
    },
    {
        id:2,
        name: 'Asari',
        image: ['images/liara2.jpg', 'images/justicar.jpg'],
        description: ['Séculos de sabedoria, um universo de sabores. Elegância e intensidade em cada mordida.'],
        variation: ['Liara', 'Justicar'],
        ingredients: [
            'Burger 150gr, Queijo Prato, Queijo Provolone chapeado com Cebola Roxa, Geléia de Pimenta da casa e Maionese da casa',
            'Burger 150gr, Cheddar, Queijo Provolone chapeado com Cebola Roxa, Pimenta Jalapeño, Bacon, Catchup e Maionese da casa'
        ],
        prices: [14.00, 16.00],
        available: [true, false],
        productIds: [3, 4]
    },
    {
        id:3,
        name: 'Krogan',
        image: ['images/grunt.jpg', 'images/wrex.jpg'],
        description: ['Força bruta, fome insaciável e nenhum espaço para diplomacia. Esse burger não faz prisioneiros.'],
        variation: ['Grunt', 'Wrex'],
        ingredients: [
            '2 Smash Burgers de 90gr, Queijo Prato, Picles, Catchup e Maionese da casa',
            '3 Smash Burgers de 90gr, Cheddar, Cebola Caramelizada, Bacon e Maionese da casa'
        ],
        prices: [14.00, 16.00],
        available: [false, false],
        productIds: [5, 6]
    }
]