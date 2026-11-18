"""Technology catalog. Product families are real; prices, stock and image URLs are test data."""
PRODUCTS = [
    {"sku": sku, "title": title, "price": price, "quantity": qty, "description": description, "category": category, "currency": "USD", "image_url": f"https://example.com/test-products/{sku}.jpg"}
    for sku, title, price, qty, description, category in [
        ("PC001", "Raspberry Pi 5 8GB", 95.0, 20, "Raspberry Pi 5 single-board computer with 8GB RAM. Classroom sample configuration; power supply and microSD card are separate.", "Single-board computers"),
        ("PC002", "128GB microSDXC Card", 18.0, 40, "Generic 128GB microSDXC storage card. Classroom sample; brand, endurance and speed class require selection before a real listing.", "Memory cards"),
        ("PC003", "32GB DDR5 RAM Kit 2x16GB", 110.0, 25, "Generic desktop DDR5 memory kit with two 16GB modules. Classroom sample; motherboard compatibility, speed and timings require verification.", "Desktop memory"),
        ("PC004", "NVIDIA GeForce RTX 5060 8GB", 299.0, 10, "GeForce RTX 5060 graphics card family with 8GB GDDR7. Classroom sample; board manufacturer, dimensions and power requirements require selection.", "Graphics cards"),
        ("PC005", "AMD Ryzen 5 9600X CPU", 249.0, 20, "AMD Ryzen 5 9600X desktop processor. Classroom sample; verify motherboard socket, BIOS support and cooling before a real sale.", "Processors"),
        ("PC006", "Case for iPad 11-inch A16", 25.0, 35, "Generic protective case targeting iPad 11-inch A16. Classroom sample; exact case fit and supplier must be verified. Tablet is not included.", "Tablet cases"),
    ]
]
