import { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Package, RefreshCw, ShoppingBag, ClipboardList, ArrowRight, AlertTriangle } from 'lucide-react';
import './App.css';

const API = 'http://localhost:8000';
const tabs = [['Overview',LayoutDashboard],['Products',Package],['Amazon Sync',RefreshCw],['Orders',ShoppingBag],['Activity Log',ClipboardList]];
const money = n => `$${Number(n).toFixed(2)}`;

export default function App() {
  const [tab,setTab] = useState('Overview');
  const [products,setProducts] = useState([]);
  const [amazon,setAmazon] = useState([]);
  const [orders,setOrders] = useState([]);
  const [logs,setLogs] = useState([]);
  const [sku,setSku] = useState('FL001');
  const [qty,setQty] = useState(1);
  const [notice,setNotice] = useState('');
  const [tracking,setTracking] = useState('TEST-TRACK-001');
  const [orderSearch,setOrderSearch] = useState('');
  const [orderTracking,setOrderTracking] = useState({});

  const [loading,setLoading] = useState(false);
  const stock = useMemo(() => products.reduce((sum,p)=>sum+p.quantity,0),[products]);
  function applyState(data) {
    setProducts(data.products || []);
    setAmazon(data.amazon_products || []);
    setOrders(data.orders || []);
    setLogs(data.activity || []);
  }
  async function request(path, options) {
    const response = await fetch(`${API}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
    return data;
  }
  useEffect(() => {
    request('/api/state').then(applyState).catch(error => setNotice(`Cannot connect to Python backend: ${error.message}. Start uvicorn on port 8000.`));
  }, []);
  async function act(path, method='POST', body) {
    setLoading(true);
    try {
      const data = await request(path, {method, headers:{'Content-Type':'application/json'}, ...(body===undefined?{}:{body:JSON.stringify(body)})});
      applyState(data);
      setNotice(data.logs?.[0]?.message || 'Operation completed.');
    } catch(error) {
      setNotice(`Error: ${error.message}`);
      try { applyState(await request('/api/state')); } catch { /* backend may be unavailable */ }
    } finally { setLoading(false); }
  }
  function sync() { return act('/api/sync'); }
  function changeStock(productSku,amount) {
    if (!Number.isInteger(amount) || amount<0) {setNotice('Inventory must be a nonnegative whole number.');return;}
    return act(`/api/products/${encodeURIComponent(productSku)}/stock`, 'PATCH', {quantity:amount});
  }
  function placeOrder(e) {
    e.preventDefault();
    const amount = Number(qty);
    if (!Number.isInteger(amount) || amount<1) {setNotice('Quantity must be a positive whole number.');return;}
    return act('/api/orders', 'POST', {sku,quantity:amount});
  }
  function ship(id) {
    const number = (orderTracking[id] || '').trim();
    if (!number) {
      setNotice('Enter a tracking number for this order.');
      return;
    }
    return act(`/api/orders/${id}/ship`, 'POST', {
      tracking_number: number
    });
  }
  return <div className="site-shell"><div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="dashboard">
    <aside className="sidebar glass"><div className="brand-mark"><span className="brand-icon">✳</span><div><strong>FleurSync</strong><small>marketplace integration studio</small></div></div><p className="side-caption">WORKSPACE</p>
      {tabs.map(([name,Icon])=><button key={name} className={`nav-item ${tab===name?'active':''}`} onClick={()=>{setTab(name);setNotice('')}}><Icon size={18}/>{name}</button>)}
      <div className="sidebar-bottom">✿ <span>IE4427 · Classroom simulation</span></div>
    </aside>
    <main className="main-content"><header className="topbar"><span>FLEUR ACCESSORIES · AMAZON INTEGRATION</span><span className="topbar-chip">✿ Mock marketplace · No live API</span></header>
      <div className="heading"><p className="eyebrow">THE FLEUR EDIT</p><h1>{({Overview:'Your integration studio.',Products:'Your product catalog.','Amazon Sync':'Sync with Amazon.',Orders:'Order management.','Activity Log':'Integration activity.'})[tab]}</h1><p className="subtitle">A fictional multichannel commerce workflow, built for our IE4427 term project.</p></div>
      {notice&&<p className="notice" role="status">{notice}</p>}
      {tab==='Overview'&&<>
<section className="glass panel">
  <div className="section-title">
    <span><RefreshCw size={19}/> Amazon API Integration Architecture</span>
    <span className="tiny-label">CLASSROOM SIMULATION</span>
  </div>

  <p className="subtitle">
    FleurSync demonstrates how a custom online store can
    exchange product, inventory, order, and fulfillment
    information with Amazon Marketplace through APIs.
  </p>

  <div style={{
    display:'grid',
    gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',
    gap:16,
    marginTop:24
  }}>
    {[
      ['01','Fleur Accessories','Online store and source product catalog'],
      ['02','FleurSync REST API','FastAPI endpoints exchange JSON data'],
      ['03','Mock Amazon Marketplace','Simulated listings, inventory and orders']
    ].map(([number,title,description])=>(
      <div key={number} style={{
        padding:20,
        borderRadius:16,
        background:'rgba(255,255,255,0.55)',
        border:'1px solid rgba(180,140,170,0.25)'
      }}>
        <span className="tiny-label">{number}</span>
        <h3 style={{margin:'12px 0 8px'}}>{title}</h3>
        <p className="subtitle">{description}</p>
      </div>
    ))}
  </div>

  <p className="footnote" style={{marginTop:20}}>
    Integration operations: POST /api/sync,
    POST /api/inventory, POST /api/orders,
    and POST /api/orders/:id/ship.
    Amazon Selling Partner API access is not used.
  </p>
</section>
<div className="stat-grid"><div className="glass stat"><Package size={20}/><strong>{products.length}</strong><span>Store products</span></div><div className="glass stat"><RefreshCw size={20}/><strong>{amazon.length}</strong><span>Mock Amazon listings</span></div><div className="glass stat"><ShoppingBag size={20}/><strong>{orders.length}</strong><span>Test orders</span></div></div><section className="glass panel"><div className="section-title"><span><LayoutDashboard size={19}/> Integration overview</span><span className="tiny-label">{stock} TOTAL STORE UNITS</span></div><p className="subtitle">Create and validate product data, synchronize inventory to a simulated Amazon catalog, then place fictional orders and track fulfillment.</p><div style={{marginTop:24}}><button className="primary-button" onClick={()=>setTab('Amazon Sync')}>Go to Amazon Sync <ArrowRight size={16}/></button></div></section></>}
      {tab==='Products'&&<section className="glass panel"><div className="section-title"><span><Package size={19}/> Store products</span><span className="tiny-label">FICTIONAL TEST DATA</span></div><div className="table-scroll"><table><thead><tr><th>SKU</th><th>PRODUCT</th><th>PRICE</th><th>STORE STOCK</th><th>UPDATE STOCK</th></tr></thead><tbody>{products.map(p=><tr key={p.sku}><td>{p.sku}</td><td><strong>{p.title}</strong></td><td>{money(p.price)}</td><td>{p.quantity}</td><td><input aria-label={`Inventory for ${p.sku}`} type="number" min="0" defaultValue={p.quantity} key={`${p.sku}-${p.quantity}`} style={{width:75,padding:8,borderRadius:8,border:'1px solid #e4bfd3'}} onKeyDown={e=>{if(e.key==='Enter')changeStock(p.sku,Number(e.currentTarget.value))}}/><button className="text-button" style={{display:'inline-flex',marginLeft:8}} disabled={loading} onClick={e=>changeStock(p.sku,Number(e.currentTarget.previousSibling.value))}>Update</button></td></tr>)}</tbody></table></div></section>}
      {tab==='Amazon Sync'&&<>
<section className="glass panel">
  <div className="section-title">
    <span><RefreshCw size={19}/> Inventory Reconciliation</span>
    <span className="tiny-label">STORE VS MOCK AMAZON</span>
  </div>

  <p className="subtitle">
    Compare inventory quantities across both sales channels
    to identify synchronization differences and reduce overselling.
  </p>

  <div className="table-scroll" style={{marginTop:20}}>
    <table>
      <thead>
        <tr>
          <th>SKU</th>
          <th>STORE STOCK</th>
          <th>AMAZON STOCK</th>
          <th>SYNC STATUS</th>
        </tr>
      </thead>
      <tbody>
        {products.map(product => {
          const listing = amazon.find(a => a.sku === product.sku);
          const matches = listing &&
            Number(listing.quantity) === Number(product.quantity);

          return (
            <tr key={product.sku}>
              <td>{product.sku}</td>
              <td>{product.quantity}</td>
              <td>{listing ? listing.quantity : 'Not listed'}</td>
              <td>
                <span style={{
                  fontWeight:600,
                  color:matches ? '#25845f' : '#bd5b55'
                }}>
                  {matches ? 'In Sync' :
                    listing ? 'Mismatch' : 'Not Synced'}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</section>
<section className="glass panel search-panel"><div className="section-title"><span><RefreshCw size={19}/> Product synchronization</span><span className="tiny-label">MOCK API SIMULATION</span></div><p className="subtitle">Validate SKUs, prices, and quantities, then copy the store catalog into the simulated Amazon marketplace.</p><div style={{marginTop:24}}><button className="primary-button" onClick={sync} disabled={loading}><RefreshCw size={17}/> Sync all products <ArrowRight size={16}/></button></div></section><section className="glass panel"><div className="section-title"><span><Package size={19}/> Mock Amazon listings</span><span className="tiny-label">{amazon.length} LISTINGS</span></div><div className="table-scroll"><table><thead><tr><th>SKU</th><th>PRODUCT</th><th>PRICE</th><th>AMAZON STOCK</th></tr></thead><tbody>{amazon.map(p=><tr key={p.sku}><td>{p.sku}</td><td><strong>{p.title}</strong></td><td>{money(p.price)}</td><td>{p.quantity}</td></tr>)}</tbody></table>{!amazon.length&&<p className="footnote">No mock listings yet. Click “Sync all products” above.</p>}</div></section></>}
      {tab==='Orders'&&<><section className="glass panel search-panel"><div className="section-title"><span><ShoppingBag size={19}/> Create a test Amazon order</span><span className="tiny-label">NO REAL CUSTOMERS</span></div><form onSubmit={placeOrder}><div className="field-row" style={{gridTemplateColumns:'1fr 1fr'}}><div><label htmlFor="order-sku">Product</label><select id="order-sku" value={sku} onChange={e=>setSku(e.target.value)}>{products.map(p=><option key={p.sku} value={p.sku}>{p.title} ({p.sku})</option>)}</select></div><div><label htmlFor="order-qty">Quantity</label><input id="order-qty" type="number" min="1" step="1" value={qty} onChange={e=>setQty(e.target.value)}/></div></div><button className="primary-button" type="submit" disabled={loading}>Place fictional order <ArrowRight size={16}/></button></form></section>
<section className="glass panel">
  <div className="section-title">
    <span><ClipboardList size={19}/> Fulfillment queue</span>
    <span className="tiny-label">{orders.length} TEST ORDERS</span>
  </div>

  <label htmlFor="order-search">Search by order ID</label>
  <input
    id="order-search"
    placeholder="Example: TEST-0001"
    value={orderSearch}
    onChange={e => setOrderSearch(e.target.value)}
    style={{margin:'10px 0 20px'}}
  />

  <div className="table-scroll">
    <table>
      <thead>
        <tr>
          <th>ORDER</th>
          <th>SKU</th>
          <th>QTY</th>
          <th>TOTAL</th>
          <th>STATUS</th>
          <th>TRACKING / ACTION</th>
        </tr>
      </thead>
      <tbody>
        {orders.filter(o =>
          `TEST-${String(o.id).padStart(4,'0')}`
            .toLowerCase()
            .includes(orderSearch.trim().toLowerCase()) ||
          String(o.id) === orderSearch.trim()
        ).map(o =>
          <tr key={o.id}>
            <td>{`TEST-${String(o.id).padStart(4,'0')}`}</td>
            <td>{o.sku}</td>
            <td>{o.quantity}</td>
            <td>{money(o.total)}</td>
            <td>{o.status}</td>
            <td>
              {o.status === 'Pending' ? (
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input
                    aria-label={`Tracking number for order ${o.id}`}
                    placeholder="Tracking number"
                    value={orderTracking[o.id] || ''}
                    onChange={e => setOrderTracking(prev => ({
                      ...prev,
                      [o.id]: e.target.value
                    }))}
                    style={{minWidth:160,padding:9}}
                  />
                  <button
                    className="text-button"
                    disabled={loading}
                    onClick={() => ship(o.id)}
                  >
                    Mark shipped
                  </button>
                </div>
              ) : (
                <span>
                  Complete · {o.tracking_number || 'No tracking'}
                </span>
              )}
            </td>
          </tr>
        )}
      </tbody>
    </table>
    {!orders.length && (
      <p className="footnote">No orders yet.</p>
    )}
  </div>
</section>
</>}
      {tab==='Activity Log'&&<section className="glass panel"><div className="section-title"><span><ClipboardList size={19}/> Integration activity</span><span className="tiny-label">SAVED IN PYTHON DATABASE</span></div>{logs.length?logs.map(entry=><p key={entry.id} className="notice"><strong>{new Date(entry.created_at).toLocaleString()}</strong> · {entry.type==='error'?'⚠ ':''}{entry.message}</p>):<p className="footnote">No activity yet. Sync products or create an order to generate events.</p>}</section>}
      <p className="footnote"><AlertTriangle size={13} style={{verticalAlign:'middle'}}/> Connected to local Python FastAPI + SQLite. Fictional classroom simulation only; no live Amazon connection.</p>
    </main></div></div>;
}
