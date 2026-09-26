target_file = r'c:\Users\HP\Desktop\chai update\chaichaska1\app\brewmaster-chaichaska-login\page.js'
dest_file = r'c:\Users\HP\Desktop\chai\chaichaska1\app\brewmaster-chaichaska-login\page.js'

with open(target_file, 'r', encoding='utf-8') as f:
    code = f.read()

helpers_code = """  // Robust Price Parsing & Formatting Helpers
  const parseOrderPrice = (o) => {
    if (!o) return 0;
    if (typeof o.priceNum === "number" && !isNaN(o.priceNum) && o.priceNum > 0) return o.priceNum;
    const raw = o.total || o.price || o.amount || o.totalPrice || 0;
    if (typeof raw === "number" && !isNaN(raw)) return raw;
    if (typeof raw === "string") {
      const num = parseFloat(raw.replace(/[^\\d.]/g, ""));
      if (!isNaN(num) && num > 0) return num;
    }
    if (Array.isArray(o.items) && o.items.length > 0) {
      const sum = o.items.reduce((acc, it) => {
        const p = typeof it.price === "number" ? it.price : parseFloat(String(it.price || it.priceNum || it.basePrice || 0).replace(/[^\\d.]/g, "")) || 0;
        const q = parseInt(it.quantity || it.qty) || 1;
        return acc + (p * q);
      }, 0);
      if (sum > 0) return sum;
    }
    return 0;
  };

  const formatOrderTotal = (o) => {
    const num = parseOrderPrice(o);
    if (num > 0) return `₹${num.toLocaleString("en-IN")}`;
    if (typeof o?.total === "string" && o.total.includes("₹") && /\\d/.test(o.total)) return o.total;
    return "₹0";
  };

  // Helper to determine if an order has pending payment
  const isOrderPendingPayment = (o) => {
    if (!o) return false;
    if (o.status === "Cancelled" || o.status === "Cancelled by User" || o.status === "Refunded") return false;
    const ps = String(o.paymentStatus || "").trim().toLowerCase();
    const pm = String(o.paymentMethod || "").trim().toLowerCase();
    const st = String(o.status || "").trim().toLowerCase();
    if (ps === "paid" || ps === "completed" || ps === "success" || ps === "successful") return false;
    if (ps === "pending" || ps.includes("cod") || ps.includes("unpaid") || ps.includes("due") || ps === "pending payment") return true;
    if (st === "pending payment") return true;
    if (pm.includes("cod") || pm.includes("cash on delivery")) {
      return o.status !== "Delivered" && o.status !== "Completed";
    }
    return false;
  };

"""

# 1. If parseOrderPrice is currently below, remove it
marker_lower = """  // Robust Price Parsing & Formatting Helpers
  const parseOrderPrice = (o) => {
    if (!o) return 0;
    if (typeof o.priceNum === "number" && !isNaN(o.priceNum) && o.priceNum > 0) return o.priceNum;
    const raw = o.total || o.price || o.amount || o.totalPrice || 0;
    if (typeof raw === "number" && !isNaN(raw)) return raw;
    if (typeof raw === "string") {
      const num = parseFloat(raw.replace(/[^\\d.]/g, ""));
      if (!isNaN(num) && num > 0) return num;
    }
    if (Array.isArray(o.items) && o.items.length > 0) {
      const sum = o.items.reduce((acc, it) => {
        const p = typeof it.price === "number" ? it.price : parseFloat(String(it.price || it.priceNum || it.basePrice || 0).replace(/[^\\d.]/g, "")) || 0;
        const q = parseInt(it.quantity || it.qty) || 1;
        return acc + (p * q);
      }, 0);
      if (sum > 0) return sum;
    }
    return 0;
  };

  const formatOrderTotal = (o) => {
    const num = parseOrderPrice(o);
    if (num > 0) return `₹${num.toLocaleString("en-IN")}`;
    if (typeof o?.total === "string" && o.total.includes("₹") && /\\d/.test(o.total)) return o.total;
    return "₹0";
  };"""

if marker_lower in code:
    code = code.replace(marker_lower, "// (Price helpers relocated above)", 1)
    print("Lower price helpers removed.")

marker_isPending = """  // Helper to determine if an order has pending payment
  const isOrderPendingPayment = (o) => {
    if (!o) return false;
    if (o.status === "Cancelled" || o.status === "Cancelled by User" || o.status === "Refunded") return false;
    const ps = String(o.paymentStatus || "").trim().toLowerCase();
    const pm = String(o.paymentMethod || "").trim().toLowerCase();
    const st = String(o.status || "").trim().toLowerCase();
    if (ps === "paid" || ps === "completed" || ps === "success" || ps === "successful") return false;
    if (ps === "pending" || ps.includes("cod") || ps.includes("unpaid") || ps.includes("due") || ps === "pending payment") return true;
    if (st === "pending payment") return true;
    if (pm.includes("cod") || pm.includes("cash on delivery")) {
      return o.status !== "Delivered" && o.status !== "Completed";
    }
    return false;
  };"""

if marker_isPending in code:
    code = code.replace(marker_isPending, "// (isOrderPendingPayment relocated above)", 1)
    print("Lower isOrderPendingPayment removed.")

# 2. Insert helpers_code right before dailyStatsAndProductTally
tally_target = "  // Detailed Product Delivery & Orders Tally for Sidebar Drawer"
if tally_target in code:
    code = code.replace(tally_target, helpers_code + tally_target, 1)
    print("Helpers placed above dailyStatsAndProductTally successfully.")

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(code)

with open(dest_file, 'w', encoding='utf-8') as f:
    f.write(code)

print("Files updated and saved!")
