import re

with open('app/brewmaster-chaichaska-login/page.js', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('\r\n', '\n')

# 1. Add state variables for Today's Stats Sidebar & Queue filters if not present
state_insert_point = 'const [activeInvoice, setActiveInvoice] = useState(null);'
new_states = '''  const [activeInvoice, setActiveInvoice] = useState(null);
  const [showTodayStatsSidebar, setShowTodayStatsSidebar] = useState(false);
  const [tallySelectedDate, setTallySelectedDate] = useState("today"); // "today" | "yesterday" | "7days" | YYYY-MM-DD
  const [tallySearchTerm, setTallySearchTerm] = useState("");
  const [queueDeliveryStatusFilter, setQueueDeliveryStatusFilter] = useState("all"); // "all" | "Received" | "Preparing" | "Out for Delivery" | "Delivered" | "Cancelled"
  const [queuePaymentFilter, setQueuePaymentFilter] = useState("all"); // "all" | "Cash" | "UPI" | "Card" | "Paid" | "Pending"'''

if state_insert_point in c and 'const [showTodayStatsSidebar' not in c:
    c = c.replace(state_insert_point, new_states)
    print("Added sidebar and queue filter states!")

# 2. Add "Today's Orders & Tally" button to top header actions
header_actions_target = '''              <div className="header-actions-wrap" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <button
                  className="btn-pending-requests"'''

header_actions_replacement = '''              <div className="header-actions-wrap" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setShowTodayStatsSidebar(true)}
                  style={{
                    background: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    padding: "9px 16px",
                    borderRadius: "20px",
                    fontWeight: "800",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)"
                  }}
                >
                  <span>📊</span> Today's Orders & Tally
                </button>

                <button
                  className="btn-pending-requests"'''

if header_actions_target in c:
    c = c.replace(header_actions_target, header_actions_replacement)
    print("Added Today's Orders button to header!")

with open('app/brewmaster-chaichaska-login/page.js', 'w', encoding='utf-8') as f:
    f.write(c)

print("Saved states and header button.")
