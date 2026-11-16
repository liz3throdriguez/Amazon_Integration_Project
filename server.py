from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import sqlite3
from pathlib import Path
from datetime import datetime, timezone

app = FastAPI(title="FleurSync Amazon Integration Simulator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB = Path(__file__).parent / "data" / "fleursync.sqlite3"
DB.parent.mkdir(exist_ok=True)

PRODUCTS = [
    ("FL001", "Mini Shoulder Bag", 35.00, 20),
    ("FL002", "Quilted Tote Bag", 48.00, 15),
    ("FL003", "Cardholder Wallet", 18.00, 30),
    ("FL004", "Satin Makeup Bag", 22.00, 25),
    ("FL005", "Gold Bag Charm", 12.00, 40),
]


def connect():
    db = sqlite3.connect(DB)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


def log(db, message):
    db.execute(
        "INSERT INTO activity (message, created_at) VALUES (?, ?)",
        (message, datetime.now(timezone.utc).isoformat()),
    )


def initialize():
    with connect() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS products (
                sku TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                price REAL NOT NULL,
                quantity INTEGER NOT NULL
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS amazon_products (
                sku TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                price REAL NOT NULL,
                quantity INTEGER NOT NULL
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sku TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                total REAL NOT NULL,
                status TEXT NOT NULL,
                tracking_number TEXT,
                created_at TEXT NOT NULL
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        db.executemany(
            "INSERT OR IGNORE INTO products VALUES (?, ?, ?, ?)",
            PRODUCTS,
        )


initialize()


class InventoryUpdate(BaseModel):
    sku: str
    quantity: int = Field(ge=0)


class OrderRequest(BaseModel):
    sku: str
    quantity: int = Field(gt=0)


class ShipmentRequest(BaseModel):
    tracking_number: str = Field(min_length=1)


@app.get("/")
def home():
    return {"message": "FleurSync Python backend is running"}


@app.get("/api/state")
def state():
    with connect() as db:
        return {
            "products": [
                dict(row) for row in db.execute(
                    "SELECT * FROM products ORDER BY sku"
                )
            ],
            "amazon_products": [
                dict(row) for row in db.execute(
                    "SELECT * FROM amazon_products ORDER BY sku"
                )
            ],
            "orders": [
                dict(row) for row in db.execute(
                    "SELECT * FROM orders ORDER BY id DESC"
                )
            ],
            "activity": [
                dict(row) for row in db.execute(
                    "SELECT * FROM activity ORDER BY id DESC LIMIT 100"
                )
            ],
        }


@app.post("/api/sync")
def sync_products():
    with connect() as db:
        products = db.execute("SELECT * FROM products").fetchall()
        for product in products:
            db.execute("""
                INSERT INTO amazon_products (sku, title, price, quantity)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(sku) DO UPDATE SET
                    title=excluded.title,
                    price=excluded.price,
                    quantity=excluded.quantity
            """, tuple(product))
        log(db, f"Synced {len(products)} products to mock Amazon")
    return {"success": True, "synced": len(products)}


@app.post("/api/inventory")
def update_inventory(update: InventoryUpdate):
    with connect() as db:
        product = db.execute(
            "SELECT sku FROM products WHERE sku = ?",
            (update.sku,),
        ).fetchone()

        if not product:
            raise HTTPException(404, "Product not found")

        db.execute(
            "UPDATE products SET quantity = ? WHERE sku = ?",
            (update.quantity, update.sku),
        )
        db.execute(
            "UPDATE amazon_products SET quantity = ? WHERE sku = ?",
            (update.quantity, update.sku),
        )
        log(db, f"Inventory updated: {update.sku} = {update.quantity}")

    return {"success": True}


@app.post("/api/orders")
def create_order(order: OrderRequest):
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        product = db.execute(
            "SELECT * FROM amazon_products WHERE sku = ?",
            (order.sku,),
        ).fetchone()

        if not product:
            raise HTTPException(404, "Product not synced to Amazon")

        if product["quantity"] < order.quantity:
            raise HTTPException(400, "Insufficient inventory")

        store_product = db.execute(
            "SELECT quantity FROM products WHERE sku = ?",
            (order.sku,),
        ).fetchone()

        if not store_product or store_product["quantity"] < order.quantity:
            raise HTTPException(400, "Insufficient store inventory")

        db.execute(
            "UPDATE amazon_products SET quantity = quantity - ? WHERE sku = ?",
            (order.quantity, order.sku),
        )
        db.execute(
            "UPDATE products SET quantity = quantity - ? WHERE sku = ?",
            (order.quantity, order.sku),
        )

        total = round(product["price"] * order.quantity, 2)
        cursor = db.execute("""
            INSERT INTO orders
            (sku, quantity, total, status, created_at)
            VALUES (?, ?, ?, 'Pending', ?)
        """, (
            order.sku, order.quantity, total,
            datetime.now(timezone.utc).isoformat(),
        ))
        order_id = cursor.lastrowid
        log(db, f"Amazon order #{order_id}: {order.quantity} x {order.sku}")

    return {"success": True, "order_id": order_id, "total": total}


@app.post("/api/orders/{order_id}/ship")
def ship_order(order_id: int, shipment: ShipmentRequest):
    tracking = shipment.tracking_number.strip()
    if not tracking:
        raise HTTPException(400, "Tracking number required")

    with connect() as db:
        order = db.execute(
            "SELECT * FROM orders WHERE id = ?", (order_id,)
        ).fetchone()

        if not order:
            raise HTTPException(404, "Order not found")

        if order["status"] == "Shipped":
            raise HTTPException(400, "Order already shipped")

        db.execute("""
            UPDATE orders
            SET status = 'Shipped', tracking_number = ?
            WHERE id = ?
        """, (tracking, order_id))
        log(db, f"Order #{order_id} shipped: {tracking}")

    return {"success": True}
