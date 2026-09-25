import re

files = [
    'app/brewmaster-chaichaska-login/page.js',
    'app/admin-chaichaska-login/page.js'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        c = f.read()
    
    c = c.replace('\r\n', '\n')
    
    # 1. Inject the handleDownloadCSV function just after selectedDateTotalSales
    func_target = """  }, 0);"""
    
    func_replacement = """  }, 0);

  const handleDownloadCSV = () => {
    if (!filteredOrders || !filteredOrders.length) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Order ID,Items,Type,Amount (Rs)\\n";
    
    filteredOrders.forEach(o => {
      const amt = typeof o.total === "string" ? parseFloat(o.total.replace(/[^\\d\\.]/g, "")) : parseFloat(o.total);
      const amtStr = isNaN(amt) ? "0.00" : amt.toFixed(2);
      const idStr = o.orderId || (o.id && o.id.startsWith("#") ? o.id : `#${o.id ? o.id.slice(-6).toUpperCase() : "LIVE"}`);
      const itemName = (o.item || (Array.isArray(o.items) ? o.items.map(it => `${it.name || it.item} x${it.quantity || 1}`).join(" | ") : "Chai Selection")).replace(/,/g, " ");
      const typeStr = o.isOffline || o.walkIn ? "Offline / Counter" : "Online";
      
      csvContent += `${idStr},${itemName},${typeStr},${amtStr}\\n`;
    });
    
    csvContent += `,,,Total: Rs ${selectedDateTotalSales.toFixed(2)}\\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = timeFilter === "Daily" ? "Today" : timeFilter;
    link.setAttribute("download", `Sales_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };"""
    
    if "handleDownloadCSV" not in c:
        c = c.replace(func_target, func_replacement)

    # 2. Add the download button to the UI
    ui_target = """                        <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", fontSize: "16px" }}>
                          Total: ₹{(typeof selectedDateTotalSales !== 'undefined' ? selectedDateTotalSales : 0).toFixed(2)}
                        </div>"""
                        
    ui_replacement = """                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <button 
                            onClick={handleDownloadCSV}
                            style={{ background: "#2c1b0d", color: "#fff", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", fontSize: "13px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Download CSV
                          </button>
                          <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", fontSize: "16px" }}>
                            Total: ₹{(typeof selectedDateTotalSales !== 'undefined' ? selectedDateTotalSales : 0).toFixed(2)}
                          </div>
                        </div>"""

    if "handleDownloadCSV" not in c or "Download CSV" not in c:
        c = c.replace(ui_target, ui_replacement)
        
    with open(file, 'w', encoding='utf-8') as f:
        f.write(c)

print("done download script")
