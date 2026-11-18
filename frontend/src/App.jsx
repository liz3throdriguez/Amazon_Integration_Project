import { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Package, RefreshCw, ShoppingBag, ClipboardList, ArrowRight, AlertTriangle } from 'lucide-react';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const tabs = [['Overview',LayoutDashboard],['Products',Package],['Amazon Sync',RefreshCw],['Orders',ShoppingBag],['Activity Log',ClipboardList]];
const money = n => `$${Number(n).toFixed(2)}`;
const emptyProduct = {sku:'',title:'',description:'',category:'PC parts',image_url:'https://example.com/test-products/sample.jpg',currency:'USD',price:'',quantity:0};

async function request(path, options) {
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${response.status})`);
  return data;
}

export default function App() {
  const [tab,setTab] = useState('Overview');
  const [state,setState] = useState({products:[],amazon_products:[],orders:[],activity:[],reporting:{}});
  const [sku,setSku] = useState('PC001');
  const [qty,setQty] = useState(1);
  const [notice,setNotice] = useState('');
  const [connected,setConnected] = useState(false);
  const [loading,setLoading] = useState(false);
  const [stockInputs,setStockInputs] = useState({});
  const [tracking,setTracking] = useState({});
  const [carrier,setCarrier] = useState({});
  const [orderSearch,setOrderSearch] = useState('');
  const [product,setProduct] = useState(emptyProduct);
  const [resetText,setResetText] = useState('');
  const [mapping,setMapping] = useState(null);
  const {products,amazon_products:amazon,orders,activity:logs,reporting} = state;
  const stock = useMemo(()=>products.reduce((sum,p)=>sum+p.quantity,0),[products]);
  useEffect(() => {
    let active = true;
    request('/api/state').then(data=>{if(active){setState(data);setConnected(true);}})
      .catch(error=>{if(active)setNotice(`Cannot connect to the local backend: ${error.message}. See README startup instructions.`);});
    return ()=>{active=false;};
  }, []);
  async function refresh() {
    const data = await request('/api/state');
    setState(data);setConnected(true);
  }
  async function act(path, body, method='POST') {
    if(loading)return;
    setLoading(true);
    try {
      const data = await request(path,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
      await refresh();
      setNotice(data.message || 'Operation completed.');
      return true;
    } catch(error) {
      setNotice(`Error: ${error.message}`);
      try{await refresh();}catch{setConnected(false);}
      return false;
    } finally {setLoading(false);}
  }
  async function showMapping(){
    try{setMapping(await request('/api/mapping'));}catch(error){setNotice(error.message);}
  }
  function changeStock(productSku){
    const amount = Number(stockInputs[productSku] ?? products.find(p=>p.sku===productSku).quantity);
    if(!Number.isInteger(amount)||amount<0){setNotice('Inventory must be a nonnegative whole number.');return;}
    return act('/api/inventory',{sku:productSku,quantity:amount});
  }
  async function placeOrder(e){
    e.preventDefault();
    const amount=Number(qty);
    if(!Number.isInteger(amount)||amount<1){setNotice('Quantity must be a positive whole number.');return;}
    await act('/api/orders',{sku,quantity:amount,marketplace_order_id:`TEST-${crypto.randomUUID()}`});
  }
  async function addProduct(e){
    e.preventDefault();
    if(await act('/api/products',{...product,price:Number(product.price),quantity:Number(product.quantity)}))setProduct(emptyProduct);
  }
  function ship(id){
    return act(`/api/orders/${id}/ship`,{tracking_number:tracking[id]||'',carrier:carrier[id]||'TEST-CARRIER'});
  }
  async function reset(e){
    e.preventDefault();
    if(await act('/api/demo/reset',{confirmation:resetText})){
      setResetText('');setStockInputs({});setTracking({});setMapping(null);setSku('PC001');setQty(1);
    }
  }
  return <div className="site-shell"><div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="dashboard">
    <aside className="sidebar glass"><div className="brand-mark"><span className="brand-icon">T</span><div><strong>TechPlanet</strong><small>marketplace integration studio</small></div></div><p className="side-caption">WORKSPACE</p>
      {tabs.map(([name,Icon])=><button key={name} className={`nav-item ${tab===name?'active':''}`} onClick={()=>{setTab(name);setNotice('');}}><Icon size={18}/>{name}</button>)}
      <div className="sidebar-bottom">IE4427 classroom simulation</div>
    </aside>
    <main className="main-content"><header className="topbar"><span>LOCALTECH / AMAZON INTEGRATION</span><span className="topbar-chip">{connected?'Local backend connected':'Backend disconnected'}</span></header>
      <div className="heading"><p className="eyebrow">LOCALTECH WORKSPACE</p><h1>{({Overview:'Your integration studio.',Products:'Your product catalog.','Amazon Sync':'Sync with Amazon.',Orders:'Order management.','Activity Log':'Integration activity.'})[tab]}</h1><p className="subtitle">Fictional store and mock Amazon marketplace. No live listings, payments, or customers.</p></div>
      {notice&&<p className="notice" role="status">{notice}</p>}
      <button className="text-button refresh-state" disabled={loading} onClick={()=>refresh().then(()=>setNotice('Latest state loaded.')).catch(error=>{setConnected(false);setNotice(error.message);})}>Refresh dashboard</button>
      {tab==='Overview'&&<>
        <section className="glass panel"><div className="section-title"><span><RefreshCw size={19}/> Integration architecture</span><span className="tiny-label">LOCAL SIMULATION</span></div>
          <p className="subtitle">LocalTech owns the shared stock count. The Python integration validates records and copies the catalog into a simulated Amazon channel. Test orders reserve stock in both catalogs in one database transaction.</p>
          <ol className="architecture-list"><li><strong>LocalTech</strong><span>Six technology products and available inventory</span></li><li><strong>TechPlanet integration</strong><span>FastAPI validation, mapping, and SQLite transactions</span></li><li><strong>Mock Amazon channel</strong><span>Separate catalog records and fictional marketplace orders</span></li></ol>
          <p className="footnote">Both catalogs share one local database. This demonstrates data flow, not distributed synchronization or Amazon SP-API compatibility.</p>
        </section>
        <div className="stat-grid"><div className="glass stat"><Package size={20}/><strong>{products.length}</strong><span>Store products</span></div><div className="glass stat"><RefreshCw size={20}/><strong>{amazon.length}</strong><span>Mock Amazon listings</span></div><div className="glass stat"><ShoppingBag size={20}/><strong>{orders.length}</strong><span>Test orders</span></div></div>
        <section className="glass panel"><div className="section-title"><span><LayoutDashboard size={19}/> Sales and inventory report</span><span className="tiny-label">FICTIONAL DATA</span></div><dl className="report-list"><div><dt>Available store units</dt><dd>{stock}</dd></div><div><dt>Units in noncancelled orders</dt><dd>{reporting.units_ordered||0}</dd></div><div><dt>Noncancelled test order value</dt><dd>{money(reporting.test_order_value||0)}</dd></div><div><dt>Unsynced or mismatched SKUs</dt><dd>{reporting.exceptions||0}</dd></div></dl><p className="footnote">Order value includes pending orders and excludes cancellations. It is not collected revenue or profit. Payments, tax, refunds, and fees are outside this simulation.</p><button className="primary-button" onClick={()=>setTab('Amazon Sync')}>Go to Amazon Sync <ArrowRight size={16}/></button></section>
        <section className="glass panel"><h2>Prepare a fresh classroom demo</h2><p className="subtitle">Reset removes this simulator's fictional orders, logs, and custom test products, and restores the six seed products. Type RESET CLASSROOM DATA to enable it.</p><form onSubmit={reset} className="reset-form"><label htmlFor="reset-confirmation">Reset confirmation</label><input id="reset-confirmation" value={resetText} onChange={e=>setResetText(e.target.value)} autoComplete="off"/><button className="text-button" disabled={loading||resetText!=='RESET CLASSROOM DATA'}>Reset classroom demo</button></form></section>
      </>}
      {tab==='Products'&&<>
        <section className="glass panel"><div className="section-title"><span><Package size={19}/> Store products</span><span className="tiny-label">{stock} AVAILABLE UNITS</span></div><div className="table-scroll"><table><thead><tr><th>SKU</th><th>PRODUCT / CATEGORY</th><th>PRICE</th><th>STOCK</th><th>UPDATE STOCK</th></tr></thead><tbody>{products.map(p=><tr key={p.sku}><td>{p.sku}</td><td><strong>{p.title}</strong><small className="product-detail">{p.category} / {p.description}</small></td><td>{money(p.price)}</td><td>{p.quantity}</td><td><input aria-label={`Inventory for ${p.sku}`} type="number" min="0" step="1" value={stockInputs[p.sku]??p.quantity} onChange={e=>setStockInputs({...stockInputs,[p.sku]:e.target.value})} onKeyDown={e=>{if(e.key==='Enter')changeStock(p.sku);}} className="stock-input"/><button className="text-button inline-button" disabled={loading} onClick={()=>changeStock(p.sku)}>Update</button></td></tr>)}</tbody></table></div></section>
        <section className="glass panel search-panel"><h2>Create a test product</h2><p className="subtitle">Demonstrate validation with a new SKU, duplicate SKU, or invalid price. Image URLs are mapping examples and are not downloaded.</p><form onSubmit={addProduct}><div className="product-form">{Object.keys(emptyProduct).map(key=><div key={key}><label htmlFor={`product-${key}`}>{key.replaceAll('_',' ')}</label><input id={`product-${key}`} value={product[key]} required type={key==='quantity'||key==='price'?'number':key==='image_url'?'url':'text'} step={key==='price'?'0.01':key==='quantity'?'1':undefined} onChange={e=>setProduct({...product,[key]:e.target.value})}/></div>)}</div><button className="primary-button" disabled={loading}>Create test product</button></form></section>
      </>}
      {tab==='Amazon Sync'&&<>
        <section className="glass panel"><div className="section-title"><span><RefreshCw size={19}/> Inventory reconciliation</span><span className="tiny-label">STORE AND MOCK AMAZON</span></div><div className="table-scroll"><table><thead><tr><th>SKU</th><th>STORE STOCK</th><th>AMAZON STOCK</th><th>STATUS</th></tr></thead><tbody>{products.map(p=>{const listing=amazon.find(a=>a.sku===p.sku);return <tr key={p.sku}><td>{p.sku}</td><td>{p.quantity}</td><td>{listing?listing.quantity:'Not listed'}</td><td>{!listing?'Not synced':listing.quantity===p.quantity?'In sync':'Mismatch'}</td></tr>;})}</tbody></table></div></section>
        <section className="glass panel"><h2>Product synchronization</h2><p className="subtitle">Validate the catalog and submit it to mock Amazon. A simulated outage leaves all listing data unchanged. Retry synchronization to recover.</p><div className="action-row"><button className="primary-button" onClick={()=>act('/api/sync')} disabled={loading}>Sync all products <RefreshCw size={17}/></button><button className="text-button" onClick={()=>act('/api/sync',{simulate_failure:true})} disabled={loading}>Simulate failed sync</button><button className="text-button" onClick={showMapping}>Show field mapping</button></div>{mapping&&<><p className="footnote">{mapping.notice}</p><pre className="mapping-output">{JSON.stringify(mapping.products[0],null,2)}</pre></>}</section>
        <section className="glass panel"><div className="section-title"><span><Package size={19}/> Mock Amazon listings</span><span className="tiny-label">{amazon.length} LISTINGS</span></div><div className="table-scroll"><table><thead><tr><th>SKU</th><th>PRODUCT</th><th>PRICE</th><th>STOCK</th></tr></thead><tbody>{amazon.map(p=><tr key={p.sku}><td>{p.sku}</td><td>{p.title}</td><td>{money(p.price)}</td><td>{p.quantity}</td></tr>)}</tbody></table>{!amazon.length&&<p className="footnote">No mock listings yet. Sync all products to begin.</p>}</div></section>
      </>}
      {tab==='Orders'&&<>
        <section className="glass panel search-panel"><div className="section-title"><span><ShoppingBag size={19}/> Create a test Amazon order</span><span className="tiny-label">FICTIONAL ORDER</span></div><form onSubmit={placeOrder}><div className="field-row"><div><label htmlFor="order-sku">Product</label><select id="order-sku" value={sku} onChange={e=>setSku(e.target.value)}>{products.map(p=><option key={p.sku} value={p.sku}>{p.title} ({p.sku})</option>)}</select></div><div><label htmlFor="order-qty">Quantity</label><input id="order-qty" type="number" min="1" step="1" value={qty} onChange={e=>setQty(e.target.value)}/></div></div><button className="primary-button" disabled={loading||!products.length}>Place fictional order <ArrowRight size={16}/></button></form><p className="footnote">Pending means received by this simulator. It does not model Amazon payment verification. Retrying the same marketplace order ID through the API cannot deduct stock twice.</p></section>
        <section className="glass panel"><div className="section-title"><span><ClipboardList size={19}/> Fulfillment queue</span><span className="tiny-label">{orders.length} TEST ORDERS</span></div><label htmlFor="order-search">Search by local or marketplace order ID</label><input id="order-search" placeholder="Example: TEST-0001" value={orderSearch} onChange={e=>setOrderSearch(e.target.value)}/><div className="table-scroll"><table><thead><tr><th>ORDER</th><th>SKU</th><th>QTY / TOTAL</th><th>STATUS</th><th>FULFILLMENT ACTION</th></tr></thead><tbody>{orders.filter(o=>[`TEST-${String(o.id).padStart(4,'0')}`,o.marketplace_order_id,String(o.id)].some(value=>value.toLowerCase().includes(orderSearch.toLowerCase().trim()))).map(o=><tr key={o.id}><td><span>TEST-{String(o.id).padStart(4,'0')}</span></td><td>{o.sku}</td><td>{o.quantity} / {money(o.total)}</td><td>{o.status}</td><td>{['Pending','Processing'].includes(o.status)?<div className="fulfillment-actions"><input aria-label={`Carrier for order ${o.id}`} placeholder="TEST-CARRIER" value={carrier[o.id]||''} onChange={e=>setCarrier({...carrier,[o.id]:e.target.value})}/><input aria-label={`Tracking number for order ${o.id}`} placeholder="TEST-TRACK-001" value={tracking[o.id]||''} onChange={e=>setTracking({...tracking,[o.id]:e.target.value})}/><button className="text-button" disabled={loading} onClick={()=>ship(o.id)}>Mark shipped</button>{o.status==='Pending'&&<button className="text-button" disabled={loading} onClick={()=>act(`/api/orders/${o.id}/status`,{status:'Processing'})}>Start processing</button>}<button className="text-button" disabled={loading} onClick={()=>act(`/api/orders/${o.id}/status`,{status:'Cancelled'})}>Cancel and restock</button></div>:<><span>{o.tracking_number||'No shipment'}</span>{o.status==='Shipped'&&<button className="text-button" disabled={loading} onClick={()=>act(`/api/orders/${o.id}/status`,{status:'Delivered'})}>Simulate delivery</button>}</>}</td></tr>)}</tbody></table>{!orders.length&&<p className="footnote">No test orders yet.</p>}</div></section>
      </>}
      {tab==='Activity Log'&&<section className="glass panel"><div className="section-title"><span><ClipboardList size={19}/> Integration activity</span><span className="tiny-label">LATEST 100 EVENTS</span></div>{logs.map(entry=><p key={entry.id} className={`notice ${entry.type==='error'?'error-notice':''}`}><strong>{new Date(entry.created_at).toLocaleString()} / {entry.type}</strong><br/>{entry.message}</p>)}{!logs.length&&<p>No events yet.</p>}</section>}
      <p className="footnote"><AlertTriangle size={13}/> Classroom simulation using FastAPI and SQLite. Seller fulfillment only. No live Amazon connection.</p>
    </main></div></div>;
}
