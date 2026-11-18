"""Local classroom simulator. No live Amazon calls or customer data."""
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import os
import sqlite3
from uuid import uuid4
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StrictInt
from integration import map_product
from store import PRODUCTS

app = FastAPI(title="TechPlanet classroom simulator", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["GET", "POST", "PATCH"], allow_headers=["Content-Type"])
DB = Path(os.environ.get("TECHPLANET_DB", Path(__file__).parent / "data" / "techplanet_pc_parts.sqlite3"))

@contextmanager
def connect():
    DB.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB, timeout=10)
    db.row_factory = sqlite3.Row
    try:
        db.execute("PRAGMA foreign_keys = ON")
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def now():
    return datetime.now(timezone.utc).isoformat()

def log(db, message, kind="info"):
    db.execute("INSERT INTO activity (message, created_at, type) VALUES (?, ?, ?)", (message, now(), kind))

FIELDS = "sku,title,price,quantity,description,category,image_url,currency"

def insert_product(db, table, product, ignore=False):
    verb = "INSERT OR IGNORE" if ignore else "INSERT"
    db.execute(f"{verb} INTO {table} ({FIELDS}) VALUES (?,?,?,?,?,?,?,?)", tuple(product[key] for key in FIELDS.split(",")))

def initialize():
    with connect() as db:
        for table in ("products", "amazon_products"):
            db.execute(f"CREATE TABLE IF NOT EXISTS {table} (sku TEXT PRIMARY KEY, title TEXT NOT NULL, price REAL NOT NULL, quantity INTEGER NOT NULL)")
            existing = {row[1] for row in db.execute(f"PRAGMA table_info({table})")}
            for name, definition in {"description": "TEXT NOT NULL DEFAULT ''", "category": "TEXT NOT NULL DEFAULT 'ACCESSORY'", "image_url": "TEXT NOT NULL DEFAULT 'https://example.com/test.jpg'", "currency": "TEXT NOT NULL DEFAULT 'USD'"}.items():
                if name not in existing:
                    db.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")
        db.execute("CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT NOT NULL, quantity INTEGER NOT NULL, total REAL NOT NULL, status TEXT NOT NULL, tracking_number TEXT, created_at TEXT NOT NULL)")
        existing = {row[1] for row in db.execute("PRAGMA table_info(orders)")}
        for name, definition in {"marketplace_order_id": "TEXT", "carrier": "TEXT", "updated_at": "TEXT"}.items():
            if name not in existing:
                db.execute(f"ALTER TABLE orders ADD COLUMN {name} {definition}")
        db.execute("UPDATE orders SET marketplace_order_id = 'LEGACY-TEST-' || id WHERE marketplace_order_id IS NULL")
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS marketplace_order_unique ON orders(marketplace_order_id)")
        db.execute("CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY AUTOINCREMENT, message TEXT NOT NULL, created_at TEXT NOT NULL)")
        if "type" not in {row[1] for row in db.execute("PRAGMA table_info(activity)")}:
            db.execute("ALTER TABLE activity ADD COLUMN type TEXT NOT NULL DEFAULT 'info'")
        for product in PRODUCTS:
            insert_product(db, "products", product, ignore=True)
            db.execute("UPDATE products SET description=?,category=?,image_url=?,currency=? WHERE sku=? AND description=''", (product["description"], product["category"], product["image_url"], product["currency"], product["sku"]))

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class Product(StrictModel):
    sku: str = Field(pattern=r"^[A-Z0-9][A-Z0-9_-]{0,39}$")
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)
    category: str = Field(min_length=1, max_length=80)
    image_url: HttpUrl
    currency: str = Field(default="USD", pattern="^USD$")
    price: float = Field(gt=0, allow_inf_nan=False, le=1000000, multiple_of=0.01)
    quantity: StrictInt = Field(ge=0, le=1000000)

class InventoryUpdate(StrictModel):
    sku: str
    quantity: StrictInt = Field(ge=0, le=1000000)

class StockUpdate(StrictModel):
    quantity: StrictInt = Field(ge=0, le=1000000)

class OrderRequest(StrictModel):
    sku: str
    quantity: StrictInt = Field(gt=0, le=1000000)
    marketplace_order_id: str = Field(default_factory=lambda: "TEST-" + str(uuid4()), min_length=1, max_length=100)

class ShipmentRequest(StrictModel):
    tracking_number: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")
    carrier: str = Field(default="TEST-CARRIER", min_length=1, max_length=50)

class StatusRequest(StrictModel):
    status: str = Field(pattern="^(Processing|Delivered|Cancelled)$")

class SyncRequest(StrictModel):
    simulate_failure: bool = False

class ResetRequest(StrictModel):
    confirmation: str

@app.exception_handler(HTTPException)
async def api_error(request: Request, exc: HTTPException):
    with connect() as db:
        log(db, f"{request.method} {request.url.path}: {exc.detail}", "error")
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    message = "; ".join(f"{'.'.join(str(x) for x in error['loc'][1:])}: {error['msg']}" for error in exc.errors())
    with connect() as db:
        log(db, f"Validation rejected: {message}", "error")
    return JSONResponse(status_code=422, content={"detail": message})

@app.get("/")
def home():
    return {"message": "TechPlanet Python backend is running", "mode": "classroom simulation"}

@app.get("/api/state")
def state():
    with connect() as db:
        result = {key: [dict(row) for row in db.execute(query)] for key, query in {"products": "SELECT * FROM products ORDER BY sku", "amazon_products": "SELECT * FROM amazon_products ORDER BY sku", "orders": "SELECT * FROM orders ORDER BY id DESC", "activity": "SELECT * FROM activity ORDER BY id DESC LIMIT 100"}.items()}
    listings = {p["sku"]: p for p in result["amazon_products"]}
    result["reconciliation"] = [{"sku": p["sku"], "store": p["quantity"], "amazon": listings.get(p["sku"], {}).get("quantity"), "status": "Not synced" if p["sku"] not in listings else "In sync" if p["quantity"] == listings[p["sku"]]["quantity"] else "Mismatch"} for p in result["products"]]
    active = [o for o in result["orders"] if o["status"] != "Cancelled"]
    result["reporting"] = {"test_order_value": round(sum(o["total"] for o in active), 2), "units_ordered": sum(o["quantity"] for o in active), "store_units": sum(p["quantity"] for p in result["products"]), "exceptions": sum(r["status"] != "In sync" for r in result["reconciliation"])}
    return result

@app.post("/api/products", status_code=201)
def create_product(product: Product):
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        if db.execute("SELECT sku FROM products WHERE sku=?", (product.sku,)).fetchone():
            raise HTTPException(409, "Duplicate SKU. Use a new unique SKU.")
        insert_product(db, "products", product.model_dump(mode="json"))
        log(db, f"Created test product {product.sku}; sync required")
    return {"success": True, "message": f"Created {product.sku}"}

@app.get("/api/mapping")
def mapping():
    return {"notice": "Illustrative Amazon-style mapping only. Production schemas must be obtained from Product Type Definitions.", "products": [map_product(p) for p in state()["products"]]}

@app.post("/api/sync")
def sync_products(options: SyncRequest = SyncRequest()):
    if options.simulate_failure:
        raise HTTPException(503, "Simulated channel outage. No listings changed. Retry Sync all products.")
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        products = [dict(row) for row in db.execute("SELECT * FROM products")]
        for product in products:
            Product.model_validate(product)
        for product in products:
            updates = ",".join(f"{key}=excluded.{key}" for key in FIELDS.split(",") if key != "sku")
            db.execute(f"INSERT INTO amazon_products ({FIELDS}) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(sku) DO UPDATE SET {updates}", tuple(product[key] for key in FIELDS.split(",")))
        log(db, f"Synced {len(products)} products to mock Amazon")
    return {"success": True, "synced": len(products), "message": f"Synced {len(products)} products"}

@app.post("/api/inventory")
def update_inventory(update: InventoryUpdate):
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        if not db.execute("SELECT sku FROM products WHERE sku=?", (update.sku,)).fetchone():
            raise HTTPException(404, "Product not found")
        db.execute("UPDATE products SET quantity=? WHERE sku=?", (update.quantity, update.sku))
        count = db.execute("UPDATE amazon_products SET quantity=? WHERE sku=?", (update.quantity, update.sku)).rowcount
        log(db, f"Inventory {update.sku} = {update.quantity}. " + ("Both channels updated." if count else "Store updated; product sync required."))
    return {"success": True, "message": "Inventory updated"}

@app.patch("/api/products/{sku}/stock")
def update_stock(sku: str, update: StockUpdate):
    return update_inventory(InventoryUpdate(sku=sku, quantity=update.quantity))

@app.post("/api/orders")
def create_order(order: OrderRequest):
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        existing = db.execute("SELECT * FROM orders WHERE marketplace_order_id=?", (order.marketplace_order_id,)).fetchone()
        if existing:
            if (existing["sku"], existing["quantity"]) != (order.sku, order.quantity):
                raise HTTPException(409, "Marketplace order ID already exists with different details")
            return {"success": True, "order_id": existing["id"], "total": existing["total"], "replayed": True, "message": "Existing order returned; stock unchanged"}
        product = db.execute("SELECT * FROM amazon_products WHERE sku=?", (order.sku,)).fetchone()
        if not product:
            raise HTTPException(404, "Product not synced to Amazon")
        store = db.execute("SELECT quantity FROM products WHERE sku=?", (order.sku,)).fetchone()
        if not store or min(store["quantity"], product["quantity"]) < order.quantity:
            raise HTTPException(400, "Insufficient inventory. Reduce quantity or replenish stock.")
        for table in ("products", "amazon_products"):
            db.execute(f"UPDATE {table} SET quantity=quantity-? WHERE sku=?", (order.quantity, order.sku))
        total = round(product["price"] * order.quantity, 2)
        stamp = now()
        cursor = db.execute("INSERT INTO orders (sku,quantity,total,status,created_at,updated_at,marketplace_order_id) VALUES (?,?,?,'Pending',?,?,?)", (order.sku, order.quantity, total, stamp, stamp, order.marketplace_order_id))
        order_id = cursor.lastrowid
        log(db, f"Mock Amazon order {order.marketplace_order_id}: {order.quantity} x {order.sku}; both inventories reduced")
    return {"success": True, "order_id": order_id, "total": total, "message": f"Created test order #{order_id}"}

@app.post("/api/orders/{order_id}/ship")
def ship_order(order_id: int, shipment: ShipmentRequest):
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        order = db.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
        if not order:
            raise HTTPException(404, "Order not found")
        if order["status"] not in ("Pending", "Processing"):
            raise HTTPException(409, "Only Pending or Processing orders can be shipped")
        db.execute("UPDATE orders SET status='Shipped',tracking_number=?,carrier=?,updated_at=? WHERE id=?", (shipment.tracking_number, shipment.carrier, now(), order_id))
        log(db, f"Order #{order_id} shipped with {shipment.carrier}: {shipment.tracking_number}")
    return {"success": True, "message": f"Order #{order_id} marked shipped"}

@app.post("/api/orders/{order_id}/status")
def update_status(order_id: int, update: StatusRequest):
    allowed = {"Pending": {"Processing", "Cancelled"}, "Processing": {"Cancelled"}, "Shipped": {"Delivered"}}
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        order = db.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
        if not order:
            raise HTTPException(404, "Order not found")
        if update.status not in allowed.get(order["status"], set()):
            raise HTTPException(409, f"Cannot change {order['status']} to {update.status}")
        if update.status == "Cancelled":
            for table in ("products", "amazon_products"):
                db.execute(f"UPDATE {table} SET quantity=quantity+? WHERE sku=?", (order["quantity"], order["sku"]))
        db.execute("UPDATE orders SET status=?,updated_at=? WHERE id=?", (update.status, now(), order_id))
        log(db, f"Order #{order_id}: {update.status}" + ("; stock restored once" if update.status == "Cancelled" else ""))
    return {"success": True, "message": f"Order #{order_id}: {update.status}"}

@app.post("/api/demo/reset")
def reset_demo(request: ResetRequest):
    if request.confirmation != "RESET CLASSROOM DATA":
        raise HTTPException(400, "Confirmation must be RESET CLASSROOM DATA")
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        for table in ("orders", "amazon_products", "products", "activity"):
            db.execute(f"DELETE FROM {table}")
        db.execute("DELETE FROM sqlite_sequence WHERE name IN ('orders','activity')")
        for product in PRODUCTS:
            insert_product(db, "products", product)
        log(db, "Classroom demo reset: six technology products, no mock listings or orders")
    return {"success": True, "message": "Classroom demo reset"}

initialize()
