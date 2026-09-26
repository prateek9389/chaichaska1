target_file = r'c:\Users\HP\Desktop\chai update\chaichaska1\app\brewmaster-chaichaska-login\page.js'
dest_file = r'c:\Users\HP\Desktop\chai\chaichaska1\app\brewmaster-chaichaska-login\page.js'

with open(target_file, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update the subtitle of Drawer Header (remove revenue mentions)
old_drawer_subtitle = '<p style={{ margin: 0, fontSize: "12px", color: "#a1a1aa" }}>\n                  Total units ordered, delivered vs preparing, and revenue stats\n                </p>'
new_drawer_subtitle = '<p style={{ margin: 0, fontSize: "12px", color: "#a1a1aa" }}>\n                  Total orders, quantity delivered vs preparing, and product item breakdown\n                </p>'

if old_drawer_subtitle in code:
    code = code.replace(old_drawer_subtitle, new_drawer_subtitle, 1)

# 2. Replace the 4 top summary cards with Order Counts & Unit Counts (Zero Revenue)
old_cards = '''              {/* 2. Key Metrics Summary Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {/* Total Orders Card */}
                <div style={{ background: "#ffffff", border: "1px solid #e4e4e7", borderRadius: "12px", padding: "12px 14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "750", color: "#71717a", textTransform: "uppercase" }}>📦 Total Orders</span>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#09090b", margin: "4px 0 2px" }}>
                    {dailyStatsAndProductTally.totalOrders}
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#52525b" }}>
                    🌐 {dailyStatsAndProductTally.onlineOrdersCount} Online • 🏪 {dailyStatsAndProductTally.offlineOrdersCount} Offline
                  </span>
                </div>

                {/* Total Revenue Card */}
                <div style={{ background: "linear-gradient(135deg, #ecfdf5, #d1fae5)", border: "1px solid #a7f3d0", borderRadius: "12px", padding: "12px 14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "750", color: "#047857", textTransform: "uppercase" }}>💰 Total Sales</span>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#065f46", margin: "4px 0 2px" }}>
                    ₹{dailyStatsAndProductTally.totalRevenue.toLocaleString("en-IN")}
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#047857", fontWeight: "600" }}>
                    Calculated for selected date
                  </span>
                </div>

                {/* Units Delivered Card */}
                <div style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "12px 14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "750", color: "#1d4ed8", textTransform: "uppercase" }}>✅ Units Delivered</span>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#1e40af", margin: "4px 0 2px" }}>
                    {dailyStatsAndProductTally.totalUnitsDelivered} <span style={{ fontSize: "12px", fontWeight: "600" }}>cups/items</span>
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#1d4ed8" }}>
                    {dailyStatsAndProductTally.deliveredOrdersCount} completed orders
                  </span>
                </div>

                {/* Units In Prep / Queue */}
                <div style={{ background: "linear-gradient(135deg, #fff7ed, #ffedd5)", border: "1px solid #fed7aa", borderRadius: "12px", padding: "12px 14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "750", color: "#c2410c", textTransform: "uppercase" }}>🫖 In Prep / Queue</span>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#9a3412", margin: "4px 0 2px" }}>
                    {dailyStatsAndProductTally.totalUnitsPreparing} <span style={{ fontSize: "12px", fontWeight: "600" }}>cups/items</span>
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#c2410c" }}>
                    {dailyStatsAndProductTally.preparingOrdersCount + dailyStatsAndProductTally.receivedOrdersCount} active orders
                  </span>
                </div>
              </div>'''

new_cards = '''              {/* 2. Key Metrics Summary Grid (Order Counts & Fulfillment Metrics - Zero Revenue) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {/* Total Orders Card */}
                <div style={{ background: "#ffffff", border: "1px solid #e4e4e7", borderRadius: "12px", padding: "12px 14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "750", color: "#71717a", textTransform: "uppercase" }}>📦 Total Orders</span>
                  <div style={{ fontSize: "22px", fontWeight: "900", color: "#09090b", margin: "4px 0 2px" }}>
                    {dailyStatsAndProductTally.totalOrders}
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#52525b" }}>
                    🌐 {dailyStatsAndProductTally.onlineOrdersCount} Online • 🏪 {dailyStatsAndProductTally.offlineOrdersCount} Offline
                  </span>
                </div>

                {/* Delivered Orders Card */}
                <div style={{ background: "linear-gradient(135deg, #ecfdf5, #d1fae5)", border: "1px solid #a7f3d0", borderRadius: "12px", padding: "12px 14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "750", color: "#047857", textTransform: "uppercase" }}>✅ Delivered Orders</span>
                  <div style={{ fontSize: "22px", fontWeight: "900", color: "#065f46", margin: "4px 0 2px" }}>
                    {dailyStatsAndProductTally.deliveredOrdersCount} <span style={{ fontSize: "12px", fontWeight: "700", color: "#047857" }}>orders</span>
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#047857", fontWeight: "600" }}>
                    Fulfilled & served successfully
                  </span>
                </div>

                {/* In Prep / Active Orders Card */}
                <div style={{ background: "linear-gradient(135deg, #fff7ed, #ffedd5)", border: "1px solid #fed7aa", borderRadius: "12px", padding: "12px 14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "750", color: "#c2410c", textTransform: "uppercase" }}>🫖 In Prep / Active</span>
                  <div style={{ fontSize: "22px", fontWeight: "900", color: "#9a3412", margin: "4px 0 2px" }}>
                    {dailyStatsAndProductTally.preparingOrdersCount + dailyStatsAndProductTally.receivedOrdersCount} <span style={{ fontSize: "12px", fontWeight: "700", color: "#c2410c" }}>orders</span>
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#c2410c" }}>
                    📥 {dailyStatsAndProductTally.receivedOrdersCount} Received • 🫖 {dailyStatsAndProductTally.preparingOrdersCount} In Prep
                  </span>
                </div>

                {/* Total Cups / Items Delivered Card */}
                <div style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "12px 14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "750", color: "#1d4ed8", textTransform: "uppercase" }}>☕ Total Cups Delivered</span>
                  <div style={{ fontSize: "22px", fontWeight: "900", color: "#1e40af", margin: "4px 0 2px" }}>
                    {dailyStatsAndProductTally.totalUnitsDelivered} <span style={{ fontSize: "12px", fontWeight: "600", color: "#1d4ed8" }}>/ {dailyStatsAndProductTally.totalUnitsOrdered} total</span>
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#1d4ed8" }}>
                    ⏳ {dailyStatsAndProductTally.totalUnitsPreparing} cups in queue
                  </span>
                </div>
              </div>'''

if old_cards in code:
    code = code.replace(old_cards, new_cards, 1)
    print("Top cards replaced with Order Counts and Fulfillment metrics.")
else:
    print("Warning: old_cards not found.")

# 3. Remove Revenue from individual product item row
old_product_header = '''                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <strong style={{ fontSize: "13px", color: "#09090b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {p.name}
                                  </strong>
                                  <span style={{ fontSize: "12px", fontWeight: "800", color: "#047857", whiteSpace: "nowrap" }}>
                                    ₹{Math.round(p.revenue).toLocaleString("en-IN")}
                                  </span>
                                </div>'''

new_product_header = '''                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <strong style={{ fontSize: "13px", color: "#09090b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {p.name}
                                  </strong>
                                  <span style={{
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    color: p.deliveredQty === p.totalQty ? "#16a34a" : "#d97706",
                                    background: p.deliveredQty === p.totalQty ? "#ecfdf5" : "#fffbeb",
                                    padding: "2px 7px",
                                    borderRadius: "4px",
                                    border: p.deliveredQty === p.totalQty ? "1px solid #a7f3d0" : "1px solid #fde68a",
                                    whiteSpace: "nowrap"
                                  }}>
                                    {p.deliveredQty}/{p.totalQty} Delivered
                                  </span>
                                </div>'''

if old_product_header in code:
    code = code.replace(old_product_header, new_product_header, 1)
    print("Product revenue badge replaced with delivery fraction.")
else:
    print("Warning: old_product_header not found.")

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(code)

with open(dest_file, 'w', encoding='utf-8') as f:
    f.write(code)

print("Files saved successfully!")
