// src/data/menu.ts

export type MenuItem = {
    name: string;
    price?: string | number;
    description?: string;
    options?: { size: string; price: string | number }[];
    isNew?: boolean;
};

export type MenuCategory = {
    title: string;
    items: MenuItem[];
    subtext?: string;
};

export type MenuSection = {
    title: string;
    categories: MenuCategory[];
};

export const foodMenu: MenuSection = {
    title: "Food Menu",
    categories: [
        {
            title: "Sandwiches",
            subtext: "Make it a combo for $2.50",
            items: [
                { name: "Ham", price: 10 },
                { name: "Montreal Smoked Meat", price: 11 },
                { name: "Meat Ball Sub", price: 11 },
                { name: "Grilled Cheese", price: 10 },
            ],
        },
        {
            title: "Salads",
            items: [
                { name: "Garden Salad", options: [{ size: "Sm", price: 5.50 }, { size: "Lg", price: 7.50 }] },
                { name: "Caesar Salad", options: [{ size: "Sm", price: 5.50 }, { size: "Lg", price: 8.00 }] },
            ],
        },
        {
            title: "Nachos",
            items: [
                { name: "Bacon / Cheese Nachos", price: 8 },
                { name: "Loaded Nachos", price: 14 },
            ],
        },
        {
            title: "Sides / Snacks",
            subtext: "Make it a combo for $2.50",
            items: [
                { name: "Hot Dog", price: 4 },
                { name: "French fries", options: [{ size: "Sm", price: 6 }, { size: "Lg", price: 8 }] },
                { name: "Nacho Chips n' Salsa", price: 4 },
                { name: "Veggies n' Dip", price: 5 },
                { name: "Gravy", price: 1 },
                { name: "Poutine", price: 9.99 },
                { name: "Upgrade to poutine", price: 4 },
                { name: "Add Bacon", price: 2 },
                { name: "Soup of the day", price: 5 },
            ],
        },
        {
            title: "Chicken N' Things",
            items: [
                { name: "Chicken wings", options: [{ size: "1lb", price: 14.50 }, { size: "2lb", price: 24 }] },
                { name: "5 Pcs Strips tossed n'sauce", price: 12.50 },
                { name: "Chicken Bites seasoned with dip", price: 12.50 },
                { name: "Chicken Finger Wrap", price: 8 },
                { name: "Chicken Bacon Wrap", price: 10 },
                { name: "Buffalo Chicken Poutine", price: 14 },
            ],
        },
        {
            title: "Snap Burgers",
            items: [
                { name: "Original Burger", price: 9 },
                { name: "Original with cheese", price: 10 },
                { name: "Original with cheese and Bacon", price: 12 },
                { name: "Double Burger", price: 15 },
                { name: "Double Burger with Cheese", price: 16 },
                { name: "Double Burger with cheese and Bacon", price: 18 },
            ],
        },
    ],
};

export const drinksMenu: MenuSection = {
    title: "Drink Menu",
    categories: [
        {
            title: "Beer in a Bottle",
            items: [
                { name: "Alexander Keith's", price: 6.50 },
                { name: "Coors Light", price: 5.75 },
                { name: "Coors Original", price: 6.50 },
                { name: "Corona", price: 6.50 },
                { name: "Heineken", price: 6.50, isNew: true },
                { name: "Heineken Silver", price: 6.70 },
                { name: "MGD", price: 6.00 },
                { name: "Michelob Ultra", price: 5.75 },
                { name: "Miller Lite", price: 6.50 },
                { name: "Moosehead", price: 6.50 },
                { name: "Molson Canadian", price: 6.00 },
            ],
        },
        {
            title: "Beer in a Can (Tall boys)",
            items: [
                { name: "Guinness", price: 7.95 },
                { name: "Labatt Blue", price: 7.00 },
                { name: "Miller Lite", price: 7.50 },
                { name: "Mill Street Organic", price: 8.00 },
                { name: "Budweiser", price: 7.00 },
                { name: "Bud Light", price: 7.00 },
                { name: "Coors Light", price: 7.00 },
                { name: "Molson Canadian", price: 7.00 },
                { name: "Birra Moretti", price: 8.50 },
            ],
        },
        {
            title: "Draft Beer",
            items: [
                { name: "Coors Light", options: [{ size: "20oz pint", price: 7.00 }, { size: "60oz pitcher", price: 19.50 }] },
                { name: "Coors Original", options: [{ size: "20oz pint", price: 7.60 }, { size: "60oz pitcher", price: 21.00 }] },
                { name: "Rickard's Red", options: [{ size: "20oz pint", price: 7.90 }] },
                { name: "Madrí", options: [{ size: "20oz pint", price: 8.90 }] },
            ],
        },
        {
            title: "Cocktails",
            items: [
                { name: "Fuzzy Navel", price: 8.00, description: "1 oz Peach Ciroc, 1 oz Peach Schnapps, Orange Juice & Grenadine" },
                { name: "Sex on the Beach", price: 8.00, description: "1oz Vodka, ½ oz Peach Schnapps, Orange Juice & Cranberry Juice" },
                { name: "Blue Lagoon", price: 8.00, description: "1 oz Blue Curacao, 1oz Vodka, & Pineapple Juice" },
                { name: "Amaretto Sour", price: 9.00, description: "1 oz Disaronno, ½ oz Jim Beam, Lemon Juice & Simple Syrup" },
                { name: "Tom Collins", price: 9.00, description: "1 ½ oz Gin, Lemon Juice, Simple Syrup & Club Soda" },
                { name: "Banana Split", price: 9.00, description: "1 oz Banana Liqueur, 1 oz Crème de Cacao, ½ oz Baileys, Cream & Pineapple Juice" },
                { name: "The 9-Ball", price: 9.00, description: "1oz Banana Liqueur, 1oz Berry Cîroc, & Sprite" },
                { name: "9 On the Spot", price: 10.00, isNew: true, description: "1 oz Malibu, 1 oz Banana Liqueur, Pineapple Juice, Sprite & topped with Whipped Cream" },
                { name: "The 10-Ball", price: 10.00, isNew: true, description: "1 oz Malibu, 1 oz Blue Curaçao, Pineapple Juice, Sprite & topped with Whipped Cream" },
                { name: "Dirty Shirley", price: 8.00, isNew: true, description: "1 oz Vodka, Orange Juice, Ginger Ale & Grenadine" },
                { name: "Tequila or Vodka Sunrise", price: 8.00, description: "1oz Tequila or 1oz Vodka, Orange Juice, Pineapple Juice, & Grenadine" },
                { name: "Vodka & Lime Cocktail", price: 8.00, description: "1 ½ oz Vodka, Lime Juice & Fresca" },
                { name: "Coconut Rum Punch", price: 8.00, description: "1 oz Malibu, Orange Juice, Pineapple Juice & Grenadine" },
                { name: "Caesar", price: 9.00, description: "1 oz Vodka, Clamato Juice, Tobasco Sauce, Worcestershire Sauce, Rimmer & Pickles" },
                { name: "Whiskey Sour", price: 9.00, description: "1 ½ oz Whiskey, Simple Syrup & Lemon Juice" },
                { name: "The Eddie", price: 9.00, description: "1 oz Peach Schnapps, 1 oz Peach Cîroc & Orange Pop" },
                { name: "The Vincent", price: 9.00, description: "1 oz Melon Liqueur, 1 oz Vodka & Sprite" },
                { name: "Long Island Iced Tea", price: 10.00, description: "½ oz Tequila, ½ oz Gin, ½ oz Vodka, ½ oz Rum, Simple Syrup, Lemon Juice & Coke" },
                { name: "Sangria", options: [{ size: "Glass", price: 7.75 }, { size: "Pitcher", price: 28.00 }], description: "Brandy, Wine, Juice, Sprite & Frozen Fruit" },
            ],
        },
        {
            title: "Coolers",
            items: [
                { name: "White Claw (Blackcherry)", price: 7.20 },
                { name: "Smirnoff Ice", price: 6.40 },
                { name: "Somersby", price: 7.20, description: "Apple, Pear, Mango & Lime" },
                { name: "Mikes Hard Iced Tea", price: 7.10 },
                { name: "Mikes Harder Lemonade", price: 7.10 },
                { name: "Hollow Valley", price: 6.00, isNew: true, description: "Passion Paloma" },
            ],
        },
        {
            title: "Shoot Your Shot — Fun Shots",
            items: [
                { name: "Sunburn", price: 4.50, description: "Fireball & Malibu" },
                { name: "Sicilian Kiss", price: 4.75, description: "Disaronno & Southern Comfort" },
                { name: "Burt Reynolds", price: 5.00, description: "Butterscotch Schnapps & Spiced Rum" },
                { name: "Vodka Lemon Drop", price: 5.80, description: "Sugar Rim, Vodka & Lemon Juice" },
                { name: "Jager Bomb", price: 6.85, description: "Jägermeister & a side of Red Bull" },
                { name: "8 Baller", price: 6.00, description: "Black Sambucca & Whipped Cream" },
                { name: "The God Father", price: 8.75, description: "Crown Royal & Disaronno" },
                { name: "Liquid Cocaine", price: 6.85, description: "Goldschläger & Jägermeister" },
            ],
        },
        {
            title: "Shoot Your Shot — Chilled Shots",
            items: [
                { name: "Polar Bear", price: 4.25, description: "Mint Liqueur & Chocolate Liqueur" },
                { name: "Blue Kamikaze", price: 5.00, description: "Sugar Rim, Blue Curaçao & Vodka" },
                { name: "Banana Split", price: 5.50, description: "Banana Liqueur, Chocolate Liqueur & Bailey's" },
                { name: "Fuzzy Peach", price: 5.25, description: "Peach Cîroc, Peach Schnapps, Grenadine & Orange Juice" },
                { name: "Kick Shot", price: 4.50, isNew: true, description: "Malibu, Blue Curaçao & Pineapple juice" },
            ],
        },
        {
            title: "Hard Shots — Vodka",
            items: [
                { name: "Cîroc", price: 7.20, description: "Apple, Peach or Red Berry" },
                { name: "Banff", price: 5.20 },
                { name: "Tag", price: 7.10 },
                { name: "Ketel One", price: 7.00 },
                { name: "Stoli", price: 7.20 },
                { name: "Grey Goose", price: 8.00 },
            ],
        },
        {
            title: "Hard Shots — Tequila",
            items: [
                { name: "Jose", price: 6.90 },
                { name: "1800", price: 7.00 },
                { name: "Teremana", price: 7.10 },
                { name: "Hornitos", price: 7.75 },
                { name: "Don Julio Blanco", price: 12.00 },
                { name: "Don Julio Reposado", price: 13.50 },
            ],
        },
        {
            title: "Hard Shots — Cognac",
            items: [
                { name: "Hennessy", price: 9.00 },
                { name: "Courvoisier", price: 8.50 },
                { name: "D'ussé", price: 14.30 },
            ],
        },
        {
            title: "Hard Shots — Rum",
            items: [
                { name: "Brugal", price: 6.15 },
                { name: "Lambs White Rum", price: 6.10 },
                { name: "Lambs Spiced Rum", price: 6.10 },
                { name: "Malibu", price: 4.75 },
                { name: "Malibu Mango", price: 4.60 },
                { name: "Lambs Dark Rum", price: 6.10 },
            ],
        },
        {
            title: "Hard Shots — Liqueurs",
            items: [
                { name: "Rumchata", price: 5.25 },
                { name: "Drambuie", price: 5.85 },
                { name: "Southern Comfort", price: 4.75 },
                { name: "Jägermeister", price: 5.50 },
                { name: "Fireball", price: 4.50 },
                { name: "Baileys", price: 4.90 },
                { name: "Disaronno", price: 4.85 },
                { name: "Goldschlager", price: 5.10 },
                { name: "Sambuca Black", price: 5.20 },
                { name: "Sambuca", price: 5.10 },
            ],
        },
        {
            title: "Hard Shots — Whiskey & Rye",
            items: [
                { name: "Canadian Club Whiskey", price: 5.85 },
                { name: "Canadian Club Rye", price: 6.00 },
                { name: "Crown Royal Whiskey", price: 6.00 },
                { name: "Crown Royal Apple", price: 6.10 },
                { name: "Crown Royal Peach", price: 6.10 },
                { name: "Forty Creek Barrel Select", price: 6.75 },
                { name: "Forty Creek Copper Bold", price: 7.00 },
                { name: "Jameson", price: 7.50 },
                { name: "Gibsons", price: 6.15 },
            ],
        },
        {
            title: "Hard Shots — Bourbon & Scotch",
            items: [
                { name: "Jim Beam", price: 6.00 },
                { name: "Maker's Mark", price: 6.50 },
                { name: "Bowmore", price: 9.75 },
                { name: "Highland Park 12", price: 10.50 },
            ],
        },
        {
            title: "Hard Shots — Brandy & Gin",
            items: [
                { name: "St. Remy", price: 6.50 },
                { name: "Gordon's Gin", price: 5.25 },
            ],
        },
        {
            title: "Wines from Pillitteri Estates Winery",
            items: [
                { name: "East West Pino Grigio", options: [{ size: "6oz", price: 6.20 }, { size: "9oz", price: 9.00 }] },
                { name: "Gary's Rosso", options: [{ size: "6oz", price: 6.40 }, { size: "9oz", price: 9.20 }] },
                { name: "Lucia's Rosé", options: [{ size: "6oz", price: 9.20 }, { size: "9oz", price: 11.20 }] },
                { name: "Cabernet Sauvignon", options: [{ size: "6oz", price: 10.25 }, { size: "9oz", price: 12.50 }] },
            ],
        },
    ],
};

export const nonAlcoholicMenu: MenuSection = {
    title: "Without The Alcohol",
    categories: [
        {
            title: "Hot Stuff",
            items: [
                { name: "Coffee", price: 1.75 },
                { name: "Hot Chocolate", price: 2.25 },
                { name: "Mocha", price: 4.25 },
                { name: "Hot Water with Lemon", price: 0.50 },
                { name: "Tea", price: 1.75, description: "Orange Pekoe, Green" },
            ],
        },
        {
            title: "Mocktails",
            items: [
                { name: "Shirley Temple", price: 4.10, description: "Orange Juice, Sprite & Grenadine" },
                { name: "Tropical Punch", price: 4.10, description: "Pineapple Juice, Mango Juice, Ginger Ale & Lime Cordial" },
                { name: "Tropical Sunrise", price: 4.10, isNew: true, description: "Mango Juice, Pineapple Juice, Club Soda & Grenadine" },
                { name: "Virgin Caesar", price: 4.10, description: "Clamato Juice, Tobasco Sauce, Worcestershire Sauce, Rimmer & Pickles" },
                { name: "Virgin Mojito", price: 4.10, description: "Club Soda, Simple Syrup, Lime Juice & Mint" },
                { name: "Virgin Sangria", options: [{ size: "Glass", price: 4.10 }, { size: "Pitcher", price: 16.50 }], description: "Sprite, frozen fruit & your choice of juice" },
                { name: "Virgin Sex on the Beach", price: 4.10, description: "Orange Juice & Cranberry Juice" },
            ],
        },
        {
            title: "Cold Stuff",
            items: [
                { name: "Fountain Pop", price: 2.50, description: "Coke, Coke Zero, Diet Coke, Sprite, Orange Fanta, Root Beer, Ginger Ale" },
                { name: "Iced Tea", price: 2.35 },
                { name: "Club Soda", price: 1.50 },
                { name: "Cranberry Juice", price: 2.50 },
                { name: "Orange Juice", price: 2.70 },
                { name: "Mango Juice", price: 2.80 },
                { name: "Pineapple Juice", price: 3.25 },
                { name: "Tap Water with Lemon", price: 0.50 },
            ],
        },
        {
            title: "Found in a Bottle or a Can",
            items: [
                { name: "Pepsi 255ml can", price: 2.10 },
                { name: "Tonic 255ml can", price: 1.50 },
                { name: "Perrier", price: 3.00 },
                { name: "Fresca", price: 4.25 },
                { name: "Gatorade", price: 3.60 },
                { name: "Red Bull", price: 4.00 },
                { name: "Bottled Water", price: 2.00 },
            ],
        },
        {
            title: "Beer Without The Alcohol",
            items: [
                { name: "Corona Sunbrew 0%", price: 5.00 },
                { name: "Heineken 0% alcohol", price: 5.00 },
            ],
        },
    ],
};

export const studentMenu: MenuSection = {
    title: "Student / Lunch Menu",
    categories: [
        {
            title: "Student Specials (11AM – 3PM Mon-Fri)",
            subtext: "Add Cheese to Burger $1 | Make it a Cheese Dog +$2",
            items: [
                { name: "Original Combo", price: 10, description: "Burger (Ketchup, Mayo, Mustard, Lettuce) + French Fries or Chips & Salsa + 17oz Pop (Coke, Diet Coke, Sprite, Gingerale)" },
                { name: "Regular Hot Dog Combo", price: 6, description: "Hot Dog (Ketchup, Mayo, Mustard, Tom, Onion) + French Fries or Chips & Salsa + 17oz Pop (Coke, Diet Coke, Sprite, Gingerale)" },
                { name: "Ham/Chicken Wrap Combo", price: 10, description: "Ham/Chicken Wrap (Ranch, Mayo, Mustard, Lettuce) + Fries or Chips & Salsa + 17oz Pop (Coke, Diet Coke, Sprite, Gingerale). Grilled Cheese instead of wrap +$2" },
                { name: "Half-Size Nachos Combo", price: 8, description: "Half-size Nachos (Cheese, Tom, Onion, Lettuce, Jalps, Bacon bits, Salsa on the side) + 17oz Pop (Coke, Diet Coke, Sprite, Gingerale)" },
            ],
        },
        {
            title: "Student Menu",
            items: [
                { name: "Billiards", price: "Ask Server" },
                { name: "Darts", price: "Ask Server" },
                { name: "Hot Dogs", price: "Ask Server" },
                { name: "French Fries", price: "Ask Server" },
                { name: "Burgers", price: "Ask Server" },
            ],
        },
    ],
};

export const weeklySpecials = [
    { day: "Monday", special: "Grilled Cheese and Tomato Soup Combo" },
    { day: "Tuesday", special: "Spaghetti/Meat balls and Garlic toast" },
    { day: "Wednesday", special: "Meat Ball Sub and Salad combo" },
    { day: "Thursday", special: "Chili and Garlic toast Combo" },
];

export const extras = {
    toppings: ["Lettuce", "Onions", "Tomato", "Cucumber", "Cheese", "Salt/Pepper", "Olives", "Pickles", "Peppers", "Jalapenos"],
    sauces: ["Ketchup", "Mustard", "Mayo", "Relish", "Snap Hot", "Snap Sauce", "Italian", "Balsamic", "Ranch", "Caesar", "Buffalo", "Honey Garlic", "Franks", "Sweet Chili", "Honey Mustard", "Pineapple Curry"],
    breads: ["Sub Bun", "Flat Bread", "Texas Toast", "White Wrap"],
    soupOfTheDay: ["Tomato", "Potato & Bacon", "Broccoli Cheese"],
};
