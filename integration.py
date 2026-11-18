"""Illustrative field mapping, not an SP-API client or accepted listing payload."""
def map_product(product):
    return {
        "sku": product["sku"],
        "attributes": {
            "item_name": [{"value": product["title"], "language_tag": "en_US"}],
            "product_description": [{"value": product["description"], "language_tag": "en_US"}],
            "purchasable_offer": [{"currency": product["currency"], "our_price": [{"schedule": [{"value_with_tax": product["price"]}]}]}],
            "fulfillment_availability": [{"fulfillment_channel_code": "DEFAULT", "quantity": product["quantity"]}],
            "main_product_image_locator": [{"media_location": product["image_url"]}],
        },
        "classroom_category": product["category"],
        "production_requirements": "Resolve marketplace, productType, ASIN or product identifier and category-specific attributes using current Amazon schemas.",
    }
